// Run with:  node --test api/submit-audition-interest/
const test = require("node:test");
const assert = require("node:assert");
const { checkAddress, zipMatchesState } = require("./address");

const base = { street1: "2501 Flora St", street2: "", city: "Dallas", state: "TX", zip: "75201" };
const fakeFetch = (places, status) => async () => ({
  status: status || 200, ok: (status || 200) < 400,
  json: async () => ({ places: places.map(([c, s]) => ({ "place name": c, "state abbreviation": s })) }),
});
const dallas = fakeFetch([["Dallas", "TX"]]);
const run = (over, f, opts) => checkAddress({ ...base, ...over }, "The address", { fetchImpl: f || dallas, ...opts });

test("good address passes", async () => assert.ok((await run({})).ok));
test("PO Box passes", async () => assert.ok((await run({ street1: "PO Box 123" })).ok));
test("ZIP must be exactly 5 digits", async () => {
  for (const zip of ["7520", "752011", "7520a", "75 01", "", "75201-1234"]) {
    const r = await run({ zip }); assert.ok(!r.ok && !r.soft, zip);
  }
});
test("street needs a number", async () => assert.ok(!(await run({ street1: "Flora Street" })).ok));
test("empty street / city / state rejected", async () => {
  assert.ok(!(await run({ street1: "" })).ok);
  assert.ok(!(await run({ city: "" })).ok);
  assert.ok(!(await run({ city: "12345" })).ok);
  assert.ok(!(await run({ state: "" })).ok);
  assert.ok(!(await run({ state: "ZZ" })).ok);
});
test("ZIP outside the state's ranges rejected offline", async () => {
  const r = await run({ state: "CA" }, null, { skipLookup: true });
  assert.ok(!r.ok && !r.soft);
  assert.ok(zipMatchesState("75034", "TX"));
  assert.ok(zipMatchesState("90210", "CA"));
  assert.ok(zipMatchesState("20500", "DC"));
  assert.ok(!zipMatchesState("75201", "OK"));
});
test("ZIP not in directory is a hard error", async () => {
  const r = await run({ zip: "75999" }, async () => ({ status: 404, ok: false }));
  assert.ok(!r.ok && !r.soft);
});
test("state mismatch from directory is hard", async () => {
  const r = await run({}, fakeFetch([["Dallas", "OK"]]));
  assert.ok(!r.ok && !r.soft);
});
test("city mismatch is a soft warning", async () => {
  const r = await run({ city: "Plano" });
  assert.ok(!r.ok && r.soft);
});
test("city matching ignores case, St./Saint, punctuation", async () => {
  assert.ok((await run({ city: "dallas" })).ok);
  assert.ok((await run({ city: "St. Louis", state: "MO", zip: "63101" }, fakeFetch([["Saint Louis", "MO"]]))).ok);
});
test("lookup outage never blocks", async () => {
  assert.ok((await run({}, async () => { throw new Error("down"); })).ok);
  assert.ok((await run({}, async () => ({ status: 500, ok: false }))).ok);
});

const census = (matches, status) => async (url) => {
  census.lastUrl = url;
  return { status: status || 200, ok: (status || 200) < 400, json: async () => ({ result: { addressMatches: matches } }) };
};
const withStreet = (matches, over) => run(over || {}, dallas, { streetFetchImpl: census(matches) });
test("street found by the Census Geocoder passes", async () => assert.ok((await withStreet([{ matchedAddress: "2501 FLORA ST" }])).ok));
test("street not found is a soft warning", async () => {
  const r = await withStreet([]);
  assert.ok(!r.ok && r.soft);
  assert.match(r.error, /2501 Flora St/);
});
test("street lookup sends street, city, state and ZIP", async () => {
  await withStreet([{ x: 1 }]);
  assert.match(census.lastUrl, /street=2501\+Flora\+St/);
  assert.match(census.lastUrl, /zip=75201/);
});
test("street lookup outage or odd answer never blocks", async () => {
  assert.ok((await run({}, dallas, { streetFetchImpl: async () => { throw new Error("down"); } })).ok);
  assert.ok((await run({}, dallas, { streetFetchImpl: census([], 500) })).ok);
  assert.ok((await run({}, dallas, { streetFetchImpl: async () => ({ status: 200, ok: true, json: async () => ({}) }) })).ok);
});
test("PO Box skips the street lookup", async () => {
  const r = await run({ street1: "PO Box 123" }, dallas, { streetFetchImpl: census([]) });
  assert.ok(r.ok);
});
test("city mismatch is reported before the street lookup", async () => {
  const r = await run({ city: "Plano" }, dallas, { streetFetchImpl: census([]) });
  assert.ok(!r.ok && r.soft && /ZIP code 75201/.test(r.error));
});

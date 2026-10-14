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

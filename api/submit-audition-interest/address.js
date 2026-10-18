// Address checks for the Audition Interest form.
//
// Three layers:
//   1. Format  -- street 1 looks like a street (or PO Box), ZIP is exactly five
//                 digits, state is a real USPS code.
//   2. ZIP vs. state -- a ZIP's first three digits can only belong to certain
//                 states, checked offline against the table below.
//   3. ZIP vs. city/state -- looked up in a free public ZIP directory
//                 (api.zippopotam.us). If the lookup is down or slow, this
//                 layer is skipped so a lookup outage never blocks a family.
//   4. Street -- the street number and name are looked up in the US Census
//                 Bureau's free Geocoder. Its coverage is good but not perfect
//                 (new construction, some rural roads), so "not found" is only
//                 a soft warning the family can override. Skipped for PO Boxes
//                 and whenever the service is down or slow.
//
// The Census Geocoder is not a postal (USPS) validator; this checks that the
// pieces fit together and that the street is known, not that mail is deliverable.

const STATES = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California", CO: "Colorado",
  CT: "Connecticut", DE: "Delaware", DC: "District of Columbia", FL: "Florida", GA: "Georgia",
  HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa", KS: "Kansas",
  KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland", MA: "Massachusetts",
  MI: "Michigan", MN: "Minnesota", MS: "Mississippi", MO: "Missouri", MT: "Montana",
  NE: "Nebraska", NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey", NM: "New Mexico",
  NY: "New York", NC: "North Carolina", ND: "North Dakota", OH: "Ohio", OK: "Oklahoma",
  OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina", SD: "South Dakota",
  TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont", VA: "Virginia", WA: "Washington",
  WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
};

// Inclusive ZIP3 ranges (first three digits) by state. Some ZIPs near borders
// are shared (e.g. DC/MD/VA), so those states list each other's overlap.
const ZIP3_RANGES = {
  AL: [[350, 352], [354, 369]], AK: [[995, 999]], AZ: [[850, 853], [855, 857], [859, 860], [863, 865]],
  AR: [[716, 729]], CA: [[900, 908], [910, 928], [930, 961]], CO: [[800, 816]],
  CT: [[60, 69]], DE: [[197, 199]], DC: [[200, 205], [569, 569]],
  FL: [[320, 342], [344, 344], [346, 347], [349, 349]], GA: [[300, 319], [398, 399]],
  HI: [[967, 968]], ID: [[832, 838]], IL: [[600, 620], [622, 629]], IN: [[460, 479]],
  IA: [[500, 516], [520, 528]], KS: [[660, 662], [664, 679]], KY: [[400, 427]],
  LA: [[700, 701], [703, 708], [710, 714]], ME: [[39, 49]], MD: [[206, 212], [214, 219]],
  MA: [[10, 27], [55, 55]], MI: [[480, 499]], MN: [[550, 551], [553, 567]],
  MS: [[386, 397]], MO: [[630, 631], [633, 641], [644, 658]], MT: [[590, 599]],
  NE: [[680, 681], [683, 693]], NV: [[889, 891], [893, 895], [897, 898]], NH: [[30, 38]],
  NJ: [[70, 89]], NM: [[870, 875], [877, 884]], NY: [[5, 5], [100, 149]],
  NC: [[270, 289]], ND: [[580, 588]], OH: [[430, 459]], OK: [[730, 731], [734, 741], [743, 749]],
  OR: [[970, 979]], PA: [[150, 196]], RI: [[28, 29]], SC: [[290, 299]], SD: [[570, 577]],
  TN: [[370, 385]], TX: [[733, 733], [750, 799], [885, 885]], UT: [[840, 847]],
  VT: [[50, 54], [56, 59]], VA: [[201, 201], [220, 246]], WA: [[980, 986], [988, 994]],
  WV: [[247, 268]], WI: [[530, 532], [534, 535], [537, 539], [541, 549]], WY: [[820, 831], [834, 834]],
};

function zipMatchesState(zip, state) {
  const z3 = parseInt(zip.slice(0, 3), 10);
  const ranges = ZIP3_RANGES[state] || [];
  return ranges.some(function (r) { return z3 >= r[0] && z3 <= r[1]; });
}

function normCity(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/\bsaint\b/g, "st")
    .replace(/\bst\.\s*/g, "st ")
    .replace(/\bfort\b/g, "ft")
    .replace(/\bmount\b/g, "mt")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Looks up a ZIP in the public directory. Returns
//   { found: true, places: [{city, state}] }  |  { found: false }  |  null (lookup unavailable)
async function lookupZip(zip, fetchImpl) {
  const f = fetchImpl || (typeof fetch === "function" ? fetch : null);
  if (!f) return null;
  const ctrl = typeof AbortController === "function" ? new AbortController() : null;
  const timer = ctrl ? setTimeout(function () { ctrl.abort(); }, 3000) : null;
  try {
    const res = await f("https://api.zippopotam.us/us/" + zip, ctrl ? { signal: ctrl.signal } : undefined);
    if (res.status === 404) return { found: false };
    if (!res.ok) return null;
    const data = await res.json();
    const places = (data.places || []).map(function (p) {
      return { city: p["place name"], state: p["state abbreviation"] };
    });
    return places.length ? { found: true, places: places } : { found: false };
  } catch (e) {
    return null;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

// Looks the street up in the US Census Geocoder (free, no key). Returns
//   { found: true } | { found: false } | null (service unavailable or unclear)
async function lookupStreet(a, fetchImpl) {
  const f = fetchImpl || (typeof fetch === "function" ? fetch : null);
  if (!f) return null;
  const ctrl = typeof AbortController === "function" ? new AbortController() : null;
  const timer = ctrl ? setTimeout(function () { ctrl.abort(); }, 4000) : null;
  try {
    const qs = new URLSearchParams({
      street: a.street1, city: a.city, state: a.state, zip: a.zip,
      benchmark: "Public_AR_Current", format: "json",
    });
    const res = await f("https://geocoding.geo.census.gov/geocoder/locations/address?" + qs.toString(), ctrl ? { signal: ctrl.signal } : undefined);
    if (!res.ok) return null;
    const data = await res.json();
    const matches = data && data.result && data.result.addressMatches;
    if (!Array.isArray(matches)) return null;
    return { found: matches.length > 0 };
  } catch (e) {
    return null;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

// Checks one address. `a` = { street1, street2, city, state, zip } (already
// trimmed). `label` is how the address is named in messages ("The student's
// address"). Returns { ok: true } | { ok: false, error, soft }.
// soft = true means "looks off but may be legitimate" -- the form lets the
// family confirm and resubmit.
async function checkAddress(a, label, opts) {
  opts = opts || {};
  const L = label || "The address";
  const hard = function (error) { return { ok: false, error: error, soft: false }; };

  if (!/[A-Za-z0-9]/.test(a.street1) || a.street1.length < 3) {
    return hard(L + " needs a street address (Street 1).");
  }
  const isPoBox = /^\s*(p\.?\s*o\.?\s*box|post office box)\s*\d+/i.test(a.street1);
  if (!isPoBox && !/\d/.test(a.street1)) {
    return hard(L + " needs a street number in Street 1 (for example, 123 Main St).");
  }
  if (!a.city || !/[A-Za-z]/.test(a.city) || !/^[A-Za-z .'\-]+$/.test(a.city)) {
    return hard(L + " needs a valid city.");
  }
  const state = (a.state || "").toUpperCase();
  if (!STATES[state]) return hard(L + " needs a state.");
  if (!/^\d{5}$/.test(a.zip)) return hard(L + " needs a ZIP code of exactly 5 digits.");
  if (!zipMatchesState(a.zip, state)) {
    return hard("ZIP code " + a.zip + " is not a " + STATES[state] + " ZIP code. Please check the state and ZIP.");
  }

  if (opts.skipLookup) return { ok: true };
  const info = await lookupZip(a.zip, opts.fetchImpl);
  if (info === null) return { ok: true }; // directory unavailable: don't block
  if (!info.found) return hard("We couldn’t find ZIP code " + a.zip + ". Please check it.");
  if (!info.places.some(function (p) { return p.state === state; })) {
    return hard("ZIP code " + a.zip + " belongs to " + info.places[0].state + ", not " + state + ". Please check the state and ZIP.");
  }
  const wanted = normCity(a.city);
  if (!info.places.some(function (p) { return normCity(p.city) === wanted; })) {
    const names = info.places.map(function (p) { return p.city; }).join(", ");
    return {
      ok: false, soft: true,
      error: "ZIP code " + a.zip + " is listed for " + names + ", " + state + ", but you entered " + a.city +
        ". Please double-check, or press Submit again if the address is correct as entered.",
    };
  }

  if (opts.skipStreetLookup || isPoBox) return { ok: true };
  const street = await lookupStreet(a, opts.streetFetchImpl || opts.fetchImpl);
  if (street && !street.found) {
    return {
      ok: false, soft: true,
      error: "We couldn’t find “" + a.street1 + "” in " + a.city + ", " + state + " " + a.zip +
        ". Please double-check the street number and name, or press Submit again if the address is correct as entered.",
    };
  }
  return { ok: true };
}

module.exports = { STATES, zipMatchesState, normCity, lookupZip, lookupStreet, checkAddress };

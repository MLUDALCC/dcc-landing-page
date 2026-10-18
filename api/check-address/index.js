// Live address check used by the Audition Interest and Pledge forms.
//
// Runs the same checks as those forms' final submit (see
// api/submit-audition-interest/address.js) but on request, as soon as a
// family has filled in an address, so a problem shows up before they press
// Submit. It stores nothing and uses no secrets.
//
// Always answers 200 with { ok, soft, error } so the page logic stays simple;
// "soft" means "looks off but may be legitimate". Returns 429 if one visitor
// asks too often.

const { checkAddress } = require("../submit-audition-interest/address");

const RATE_LIMIT_MAX = 60;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const recentByVisitor = new Map();

function visitorKey(req) {
  const h = (req && req.headers) || {};
  const raw = h["x-azure-clientip"] || (h["x-forwarded-for"] || "").split(",")[0] || "unknown";
  return String(raw).trim().replace(/:\d+$/, "");
}

function tooMany(req) {
  const key = visitorKey(req);
  const now = Date.now();
  const hits = (recentByVisitor.get(key) || []).filter(function (t) { return now - t < RATE_LIMIT_WINDOW_MS; });
  hits.push(now);
  recentByVisitor.set(key, hits);
  if (recentByVisitor.size > 5000) recentByVisitor.clear();
  return hits.length > RATE_LIMIT_MAX;
}

function clean(v, max) {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

module.exports = async function (context, req) {
  context.res = { headers: { "Content-Type": "application/json" } };

  if (tooMany(req)) {
    context.res.status = 429;
    context.res.body = { error: "Too many requests." };
    return;
  }

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch (e) { body = {}; }
  }
  body = body || {};

  const address = {
    street1: clean(body.street1, 100),
    street2: clean(body.street2, 100),
    city: clean(body.city, 60),
    state: clean(body.state, 2).toUpperCase(),
    zip: clean(body.zip, 10),
  };
  if (/^\d{5}-\d{4}$/.test(address.zip)) address.zip = address.zip.slice(0, 5);

  const result = await checkAddress(address, "This address");
  context.res.status = 200;
  context.res.body = result.ok
    ? { ok: true }
    : { ok: false, soft: !!result.soft, error: result.error };
};

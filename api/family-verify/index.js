// Checks a Family Portal session token (issued by /api/family-login) and
// tells the front end whether it's still valid, so family-portal.html can
// decide whether to show the login form or the actual portal content.
// Always responds 200 with { valid: true|false } -- this is a routine
// check the page runs on every visit, not an authentication failure, so
// there's no need for the front end to branch on HTTP status.

const { verifyToken } = require("../family-data/session");
const { loadRoster } = require("../family-data/roster");

module.exports = async function (context, req) {
  context.res = { headers: { "Content-Type": "application/json" } };

  const seasonPassword = process.env.FAMILY_PORTAL_PASSWORD;
  const sessionSecret = process.env.FAMILY_PORTAL_SESSION_SECRET;
  if (!seasonPassword || !sessionSecret) {
    context.res.status = 200;
    context.res.body = { valid: false };
    return;
  }

  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch (e) {
      body = {};
    }
  }
  body = body || {};

  const token = typeof body.token === "string" ? body.token : "";
  const result = token ? verifyToken(token, sessionSecret, seasonPassword) : null;

  if (!result) {
    context.res.status = 200;
    context.res.body = { valid: false };
    return;
  }

  const roster = loadRoster();
  const familyName = roster.get(result.email) || null;

  context.res.status = 200;
  context.res.body = { valid: true, familyName: familyName };
};

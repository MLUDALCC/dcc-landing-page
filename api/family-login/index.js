// Checks a Family Portal login attempt: the submitted email must be on
// the current roster (api/family-data/roster.csv) AND the submitted
// password must match this season's shared password. On success, issues
// a signed session token the front end stores and re-sends to
// /api/family-verify on later visits, instead of asking every family to
// re-enter the password on every page load.
//
// Requires two app settings in the Static Web App's configuration
// (Azure Portal > your Static Web App > Configuration):
//   FAMILY_PORTAL_PASSWORD        -- this season's shared family password
//   FAMILY_PORTAL_SESSION_SECRET  -- a long random string used to sign
//                                    session tokens; not shared with families
// Never commit real values for either of these into this repo.

const crypto = require("crypto");
const { loadRoster } = require("../family-data/roster");
const { issueToken } = require("../family-data/session");

function passwordsMatch(submitted, expected) {
  // Fixed-length SHA-256 digests before comparing, so timingSafeEqual
  // never has to deal with mismatched buffer lengths (it throws if the
  // two buffers aren't the same length), regardless of how long the
  // submitted or configured password happen to be.
  const a = crypto.createHash("sha256").update(String(submitted)).digest();
  const b = crypto.createHash("sha256").update(String(expected)).digest();
  return crypto.timingSafeEqual(a, b);
}

module.exports = async function (context, req) {
  context.res = { headers: { "Content-Type": "application/json" } };

  const seasonPassword = process.env.FAMILY_PORTAL_PASSWORD;
  const sessionSecret = process.env.FAMILY_PORTAL_SESSION_SECRET;
  if (!seasonPassword || !sessionSecret) {
    context.log.error("FAMILY_PORTAL_PASSWORD / FAMILY_PORTAL_SESSION_SECRET is not configured in this Static Web App's settings.");
    context.res.status = 500;
    context.res.body = { error: "The family portal login isn't fully set up yet. Please contact us directly." };
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

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!email || !password) {
    context.res.status = 400;
    context.res.body = { error: "Please enter both your email address and the season password." };
    return;
  }

  const roster = loadRoster();
  const emailKnown = roster.has(email);
  const passwordOk = passwordsMatch(password, seasonPassword);

  if (!emailKnown || !passwordOk) {
    context.res.status = 401;
    // Deliberately generic -- don't reveal whether the email or the
    // password was the part that didn't match.
    context.res.body = { error: "That email and season password combination wasn't recognized. Please double-check and try again, or contact chorus@dalcc.org." };
    return;
  }

  const familyName = roster.get(email) || "";
  const issued = issueToken(email, sessionSecret, seasonPassword);

  context.res.status = 200;
  context.res.body = {
    token: issued.token,
    expiresAt: issued.expiresAt,
    familyName: familyName || null,
  };
};

// Shared session token issuing/verification for the Family Portal.
//
// This is a deliberately lightweight scheme, not a full identity system:
// every family shares one season password (FAMILY_PORTAL_PASSWORD), and a
// family's email is only checked against the roster, not verified as
// actually belonging to them (no confirmation email is sent). That's an
// intentional tradeoff for a members-only resource page -- see the
// Family Portal build discussion for the full reasoning. A signed token
// (HMAC-SHA256) replaces re-entering the password on every page visit.
//
// The signing key folds in the CURRENT season password on purpose
// (sessionKey below): when staff rotate FAMILY_PORTAL_PASSWORD for a new
// season, every previously issued token stops verifying automatically --
// no separate revocation list needed. Families just log in again with
// the new season's password.

const crypto = require("crypto");

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 270; // ~270 days -- comfortably covers one concert season

function hmac(payload, key) {
  return crypto.createHmac("sha256", key).update(payload).digest("hex");
}

function sessionKey(sessionSecret, seasonPassword) {
  return sessionSecret + ":" + seasonPassword;
}

function issueToken(email, sessionSecret, seasonPassword) {
  const expiresAt = Date.now() + SESSION_TTL_MS;
  const payload = email + "." + expiresAt;
  const sig = hmac(payload, sessionKey(sessionSecret, seasonPassword));
  const token = Buffer.from(payload, "utf8").toString("base64") + "." + sig;
  return { token: token, expiresAt: expiresAt };
}

function verifyToken(token, sessionSecret, seasonPassword) {
  if (typeof token !== "string") return null;

  const lastDot = token.lastIndexOf(".");
  if (lastDot === -1) return null;

  const encodedPayload = token.slice(0, lastDot);
  const sig = token.slice(lastDot + 1);

  let payload;
  try {
    payload = Buffer.from(encodedPayload, "base64").toString("utf8");
  } catch (e) {
    return null;
  }

  const expectedSig = hmac(payload, sessionKey(sessionSecret, seasonPassword));
  const sigBuf = Buffer.from(sig, "hex");
  const expectedBuf = Buffer.from(expectedSig, "hex");
  if (!sig || sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }

  // payload is "<email>.<expiresAt>" -- split on the LAST dot, since email
  // addresses themselves routinely contain dots (e.g. jane.doe@example.com).
  const payloadLastDot = payload.lastIndexOf(".");
  if (payloadLastDot === -1) return null;

  const email = payload.slice(0, payloadLastDot);
  const expiresAt = Number(payload.slice(payloadLastDot + 1));
  if (!email || !Number.isFinite(expiresAt) || Date.now() > expiresAt) return null;

  return { email: email, expiresAt: expiresAt };
}

module.exports = { issueToken: issueToken, verifyToken: verifyToken };

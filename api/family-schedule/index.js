// Returns the season schedule (rehearsals, concerts, other events) to a
// Family Portal visitor who holds a valid session token. Without a valid
// token nothing is returned, so the schedule is not visible in page source
// or to anyone who has not logged in. See api/family-data/schedule.js for
// the Google Sheet layout.

const { verifyToken } = require("../family-data/session");
const { loadRoster } = require("../family-data/roster");
const { loadSchedule } = require("../family-data/schedule");

module.exports = async function (context, req) {
  context.res = { headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } };

  const seasonPassword = process.env.FAMILY_PORTAL_PASSWORD;
  const sessionSecret = process.env.FAMILY_PORTAL_SESSION_SECRET;

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch (e) { body = {}; }
  }
  body = body || {};

  const token = typeof body.token === "string" ? body.token : "";
  const session = seasonPassword && sessionSecret && token
    ? verifyToken(token, sessionSecret, seasonPassword)
    : null;

  if (!session) {
    context.res.status = 401;
    context.res.body = { error: "Please log in again." };
    return;
  }

  const roster = await loadRoster(context);
  if (roster.ok && !roster.roster.has(session.email)) {
    context.res.status = 401;
    context.res.body = { error: "Please log in again." };
    return;
  }

  const loaded = await loadSchedule(context);
  if (!loaded.ok) {
    context.res.status = 503;
    context.res.body = { error: "The schedule couldn't be loaded right now." };
    return;
  }

  context.res.status = 200;
  context.res.body = { events: loaded.events, skipped: loaded.skipped || 0 };
};

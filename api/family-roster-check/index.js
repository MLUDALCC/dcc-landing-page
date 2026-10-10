// TEMPORARY diagnostic for the Family Portal login -- delete this whole
// folder (api/family-roster-check) once the portal login is confirmed
// working.
//
// Open /api/family-roster-check in a browser. It reports only yes/no and
// counts: whether the new roster code is deployed, which settings exist,
// whether the "Family Roster" tab could be read, and how many rows it
// found. It never returns email addresses, names, passwords or keys.

const { loadRoster } = require("../family-data/roster");

module.exports = async function (context, req) {
  const loaded = await loadRoster(context);
  context.res = {
    status: 200,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    body: {
      deployed: true,
      settings: {
        googleServiceAccountEmail: !!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        googleServiceAccountPrivateKey: !!process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY,
        sheetId: !!(process.env.GOOGLE_SHEETS_FAMILY_ROSTER_SHEET_ID || process.env.GOOGLE_SHEETS_PLEDGE_SHEET_ID),
        familyPortalPassword: !!process.env.FAMILY_PORTAL_PASSWORD,
        familyPortalSessionSecret: !!process.env.FAMILY_PORTAL_SESSION_SECRET,
        tabName: process.env.GOOGLE_SHEETS_FAMILY_ROSTER_TAB_NAME || "Family Roster",
      },
      rosterReadable: loaded.ok,
      familiesFound: loaded.roster.size,
    },
  };
};

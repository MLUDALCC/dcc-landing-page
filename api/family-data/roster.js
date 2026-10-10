// Shared roster loader for the Family Portal login/verify functions.
//
// The roster of current families lives in a tab of the same Google Sheet
// the site already uses (default tab name: "Family Roster"), so it can be
// kept up to date like any spreadsheet -- no code change, commit or push --
// and no family email addresses are ever stored in this repository.
//
//   Column A: Email        (the address the family signs in with)
//   Column B: Family Name  (optional; shown as "Welcome back, <name>!")
//
// The first row is a header row ("Email", "Family Name"). To remove a
// family, delete their row: their existing sign-in stops working within
// about a minute.
//
// App settings used (Azure Portal > your Static Web App > Environment
// variables). The first two are the same ones the pledge/audition/newsletter
// forms already use:
//   GOOGLE_SERVICE_ACCOUNT_EMAIL
//   GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
//   GOOGLE_SHEETS_FAMILY_ROSTER_SHEET_ID   -- optional; falls back to
//                                             GOOGLE_SHEETS_PLEDGE_SHEET_ID
//   GOOGLE_SHEETS_FAMILY_ROSTER_TAB_NAME   -- optional; default "Family Roster"
//
// If Google credentials are not configured at all (e.g. local development),
// this falls back to roster.csv next to this file, which is deliberately
// shipped empty (header row only) so no one can sign in by accident.
//
// loadRoster() resolves to { ok, roster }:
//   ok     false when the roster could not be read (Google unreachable, tab
//          missing...). Callers must NOT treat that as "nobody is on the
//          roster" -- see family-login (refuses politely) and family-verify.
//   roster Map of lowercase email -> family name ("" if none).
//
// A successful read is cached in memory for 60 seconds, so busy days don't
// hammer the Sheets API and edits show up quickly.

const fs = require("fs");
const path = require("path");
const { readRows } = require("../pledge-data/googleSheets");

const CSV_PATH = path.join(__dirname, "roster.csv");
const CACHE_MS = 60 * 1000;
const DEFAULT_TAB = "Family Roster";

let cache = null; // { at: <ms>, roster: Map }

function rowsToRoster(rows) {
  const roster = new Map();
  rows.forEach(function (row, i) {
    const email = String((row && row[0]) || "").trim().toLowerCase();
    if (!email || email.charAt(0) === "#") return;
    if (i === 0 && email === "email") return; // header row
    const familyName = String((row && row[1]) || "").trim();
    roster.set(email, familyName);
  });
  return roster;
}

function loadCsvRows() {
  let raw;
  try {
    raw = fs.readFileSync(CSV_PATH, "utf8");
  } catch (e) {
    return [];
  }
  return raw
    .split(/\r?\n/)
    .map(function (line) { return line.trim(); })
    .filter(function (line) { return line && line.charAt(0) !== "#"; })
    .map(function (line) {
      const commaIdx = line.indexOf(",");
      return commaIdx === -1 ? [line] : [line.slice(0, commaIdx), line.slice(commaIdx + 1)];
    });
}

async function loadRoster(context) {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  const sheetId = process.env.GOOGLE_SHEETS_FAMILY_ROSTER_SHEET_ID || process.env.GOOGLE_SHEETS_PLEDGE_SHEET_ID;
  const tabName = process.env.GOOGLE_SHEETS_FAMILY_ROSTER_TAB_NAME || DEFAULT_TAB;

  if (!clientEmail || !privateKey || !sheetId) {
    return { ok: true, roster: rowsToRoster(loadCsvRows()) };
  }

  if (cache && Date.now() - cache.at < CACHE_MS) {
    return { ok: true, roster: cache.roster };
  }

  try {
    const rows = await readRows(sheetId, tabName, clientEmail, privateKey);
    const roster = rowsToRoster(rows);
    cache = { at: Date.now(), roster: roster };
    return { ok: true, roster: roster };
  } catch (e) {
    if (context && context.log && context.log.error) {
      context.log.error("Family roster could not be read from Google Sheets: " + e.message);
    }
    // A stale copy is better than locking every family out during a brief
    // Google outage.
    if (cache) return { ok: true, roster: cache.roster };
    return { ok: false, roster: new Map() };
  }
}

module.exports = { loadRoster: loadRoster };

// Season schedule loader for the Family Portal calendar.
//
// The schedule lives in a tab of a Google Sheet (default tab name:
// "Schedule"), so rehearsals and concerts can be added, moved or removed
// like any spreadsheet -- no code change, commit or push. Nothing about the
// schedule is stored in this repository or in the page source: it is only
// sent to a browser that presents a valid Family Portal session.
//
//   Row 1 is a header row. Columns, in order:
//     A  Date      e.g. 2026-09-14  (a normal Google Sheets date also works)
//     B  Choirs    "All", or any of TC (Training Choir), SV (Symphonic
//                  Voices), ME (Mixed Ensemble) -- separate several with
//                  commas, e.g. "SV, ME". Full names also work.
//     C  Type      Rehearsal, Concert, or Other
//     D  Title     e.g. "Monday Rehearsal" or "Fall Concert"
//     E  Start     e.g. 5:30 PM   (shown exactly as typed)
//     F  End       e.g. 7:00 PM   (optional)
//     G  Location  (optional)
//     H  Notes     (optional; call time, dress code, what to bring...)
//
// App settings (Azure Portal > Static Web App > Environment variables):
//   GOOGLE_SHEETS_SCHEDULE_SHEET_ID  -- optional; falls back to
//                                       GOOGLE_SHEETS_FAMILY_ROSTER_SHEET_ID,
//                                       then GOOGLE_SHEETS_PLEDGE_SHEET_ID
//   GOOGLE_SHEETS_SCHEDULE_TAB_NAME  -- optional; default "Schedule"
// (plus the Google service-account settings the other forms already use).
//
// A successful read is cached for 60 seconds.

const { readRows } = require("../pledge-data/googleSheets");

const CACHE_MS = 60 * 1000;
const DEFAULT_TAB = "Schedule";
const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

let cache = null; // { at, events }

function pad(n) { return (n < 10 ? "0" : "") + n; }

function validYmd(y, m, d) {
  if (y < 2000 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) return null;
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  return y + "-" + pad(m) + "-" + pad(d);
}

// Accepts 2026-09-14, 9/14/2026, 9/14/26, "Sep 14, 2026", "September 14 2026".
function parseDate(raw) {
  const s = String(raw || "").trim();
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s);
  if (m) return validYmd(+m[1], +m[2], +m[3]);
  m = /^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/.exec(s);
  if (m) return validYmd(m[3].length === 2 ? 2000 + +m[3] : +m[3], +m[1], +m[2]);
  m = /^(?:[A-Za-z]+,?\s+)?([A-Za-z]{3,})\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})$/.exec(s);
  if (m) {
    const mi = MONTHS.indexOf(m[1].slice(0, 3).toLowerCase());
    if (mi !== -1) return validYmd(+m[3], mi + 1, +m[2]);
  }
  return null;
}

function parseChoirs(raw) {
  const s = String(raw || "").toLowerCase();
  if (!s.trim() || /\ball\b/.test(s)) return ["all"];
  const out = [];
  // Full names or the short codes TC / SV / ME (whole words only).
  if (/train/.test(s) || /\btc\b/.test(s)) out.push("training");
  if (/symph|voices/.test(s) || /\bsv\b/.test(s)) out.push("symphonic");
  if (/mixed|satb|ensemble/.test(s) || /\bme\b/.test(s)) out.push("mixed");
  return out.length ? out : ["all"];
}

function parseType(raw) {
  const s = String(raw || "").toLowerCase();
  if (/concert|perform/.test(s)) return "concert";
  if (/rehears/.test(s)) return "rehearsal";
  return "other";
}

function rowsToEvents(rows) {
  const events = [];
  rows.forEach(function (row) {
    const date = parseDate(row && row[0]);
    if (!date) return; // header row, blank row, or an unreadable date
    const title = String((row && row[3]) || "").trim();
    const type = parseType(row[2]);
    events.push({
      date: date,
      choirs: parseChoirs(row[1]),
      type: type,
      title: title || (type === "concert" ? "Concert" : type === "rehearsal" ? "Rehearsal" : "Event"),
      start: String(row[4] || "").trim(),
      end: String(row[5] || "").trim(),
      location: String(row[6] || "").trim(),
      notes: String(row[7] || "").trim()
    });
  });
  events.sort(function (a, b) {
    return a.date < b.date ? -1 : a.date > b.date ? 1 : 0;
  });
  return events;
}

// Resolves to { ok, events }. ok:false means the schedule could not be read
// (callers should say "couldn't load", not "nothing scheduled").
async function loadSchedule(context) {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  const sheetId =
    process.env.GOOGLE_SHEETS_SCHEDULE_SHEET_ID ||
    process.env.GOOGLE_SHEETS_FAMILY_ROSTER_SHEET_ID ||
    process.env.GOOGLE_SHEETS_PLEDGE_SHEET_ID;
  const tabName = process.env.GOOGLE_SHEETS_SCHEDULE_TAB_NAME || DEFAULT_TAB;

  if (!clientEmail || !privateKey || !sheetId) return { ok: true, events: [] };

  if (cache && Date.now() - cache.at < CACHE_MS) return { ok: true, events: cache.events };

  try {
    const rows = await readRows(sheetId, tabName, clientEmail, privateKey);
    const events = rowsToEvents(rows);
    cache = { at: Date.now(), events: events };
    return { ok: true, events: events };
  } catch (e) {
    if (context && context.log && context.log.error) {
      context.log.error("Family schedule could not be read from Google Sheets: " + e.message);
    }
    if (cache) return { ok: true, events: cache.events };
    return { ok: false, events: [] };
  }
}

module.exports = { loadSchedule: loadSchedule, rowsToEvents: rowsToEvents, parseDate: parseDate };

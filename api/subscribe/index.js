// Records an email-list signup from the "Stay Connected" band on the home page
// and the small subscribe form in every page footer (data-subscribe forms,
// handled in assets/js/main.js).
//
// Works with whichever of these is configured (both is fine):
//
//   1. Google Sheet (a plain, portable list you own).
//      Uses the same service-account settings as the pledge/audition forms:
//        GOOGLE_SERVICE_ACCOUNT_EMAIL
//        GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
//        GOOGLE_SHEETS_NEWSLETTER_SHEET_ID  -- optional; falls back to
//                                              GOOGLE_SHEETS_PLEDGE_SHEET_ID
//        GOOGLE_SHEETS_NEWSLETTER_TAB_NAME  -- optional; defaults to "Newsletter"
//      The tab must already exist (header row suggestion: Timestamp, Email,
//      Source) and the sheet must be shared (Editor) with the service account.
//
//   2. MailerLite (sends, unsubscribe links, reporting).
//        MAILERLITE_API_KEY   -- an API token from MailerLite (Integrations > API)
//        MAILERLITE_GROUP_ID  -- optional; the group new signups are added to
//      Whether new subscribers must confirm by email (double opt-in) is a
//      setting in the MailerLite account, not here.
//
// If neither is configured the form tells the visitor to email the chorus.
// If only one of the two fails, the signup still counts as received.

const { appendRow } = require("../pledge-data/googleSheets");

const SHEET_TAB_NAME = process.env.GOOGLE_SHEETS_NEWSLETTER_TAB_NAME || "Newsletter";
const ALLOWED_SOURCES = ["home-band", "footer", "side-tab"];
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Neutralize anything a spreadsheet would treat as a formula (values are
// written with USER_ENTERED).
function clean(value, max) {
  let s = typeof value === "string" ? value.trim() : "";
  if (s.length > (max || 254)) s = s.slice(0, max || 254);
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return s;
}

async function addToMailerLite(context, email, source) {
  const apiKey = process.env.MAILERLITE_API_KEY;
  if (!apiKey) return null; // not configured
  const payload = { email: email, fields: { source: source } };
  if (process.env.MAILERLITE_GROUP_ID) payload.groups = [process.env.MAILERLITE_GROUP_ID];
  try {
    const resp = await fetch("https://connect.mailerlite.com/api/subscribers", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + apiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });
    if (resp.ok) return true;
    const text = await resp.text();
    context.log.error("MailerLite responded " + resp.status + ": " + text.slice(0, 300));
    return false;
  } catch (e) {
    context.log.error("MailerLite request failed: " + e.message);
    return false;
  }
}

async function addToSheet(context, email, source) {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  const sheetId = process.env.GOOGLE_SHEETS_NEWSLETTER_SHEET_ID || process.env.GOOGLE_SHEETS_PLEDGE_SHEET_ID;
  if (!clientEmail || !privateKey || !sheetId) return null; // not configured
  try {
    await appendRow(sheetId, SHEET_TAB_NAME, [new Date().toISOString(), email, source], clientEmail, privateKey);
    return true;
  } catch (e) {
    context.log.error("Failed to append newsletter signup to Google Sheet: " + e.message);
    return false;
  }
}

module.exports = async function (context, req) {
  context.res = { headers: { "Content-Type": "application/json" } };

  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch (e) {
      body = {};
    }
  }
  body = body || {};

  // Honeypot: real visitors never see or fill this field. Pretend success so
  // bots don't learn anything.
  if (typeof body.website === "string" && body.website.trim() !== "") {
    context.res.status = 200;
    context.res.body = { success: true };
    return;
  }

  const email = clean(body.email).toLowerCase();
  const source = ALLOWED_SOURCES.indexOf(body.source) === -1 ? "other" : body.source;
  if (!email || !EMAIL_PATTERN.test(email)) {
    context.res.status = 400;
    context.res.body = { error: "Please enter a valid email address." };
    return;
  }

  const results = await Promise.all([addToMailerLite(context, email, source), addToSheet(context, email, source)]);
  const configured = results.filter(function (r) { return r !== null; });
  const succeeded = configured.filter(function (r) { return r === true; });

  if (configured.length === 0) {
    context.log.error("Neither MAILERLITE_API_KEY nor the Google Sheets newsletter settings are configured.");
    context.res.status = 500;
    context.res.body = { error: "Sign-ups aren't fully set up yet. Please email us at chorus@dalcc.org and we'll add you." };
    return;
  }
  if (succeeded.length === 0) {
    context.res.status = 502;
    context.res.body = { error: "Something went wrong. Please try again, or email us at chorus@dalcc.org." };
    return;
  }

  context.res.status = 200;
  context.res.body = { success: true };
};

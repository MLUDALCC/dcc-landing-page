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
//      Source, Salutation, First name, Last name) and the sheet must be
//      shared (Editor) with the service account.
//
//   2. MailerLite (sends, unsubscribe links, reporting).
//        MAILERLITE_API_KEY   -- an API token from MailerLite (Integrations > API)
//        MAILERLITE_GROUP_ID  -- optional; the group new signups are added to
//      Whether new subscribers must confirm by email (double opt-in) is a
//      setting in the MailerLite account, not here.
//      Names go into MailerLite's built-in "name" (first name) and
//      "last_name" fields. The title (Mr./Ms./...) goes into a custom text
//      field with the key "salutation", which has to be created in MailerLite
//      (Subscribers > Fields). Until it exists, MailerLite rejects that one
//      field, so the signup is retried without it and still succeeds.
//
// If neither is configured the form tells the visitor to email the chorus.
// If only one of the two fails, the signup still counts as received.

const { appendRow } = require("../pledge-data/googleSheets");

const SHEET_TAB_NAME = process.env.GOOGLE_SHEETS_NEWSLETTER_TAB_NAME || "Newsletter";
const ALLOWED_SOURCES = ["home-band", "footer", "side-tab"];
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ALLOWED_SALUTATIONS = ["Mr.", "Ms.", "Mrs.", "Mx.", "Dr."];
const NAME_MAX = 60;

const MIN_FILL_MS = 2000;
const RATE_LIMIT_MAX = 8;               // signups allowed per visitor...
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // ...in this window
const recentByVisitor = new Map();      // per running instance; resets when it restarts

function visitorKey(req) {
  const headers = (req && req.headers) || {};
  const raw = headers["x-azure-clientip"] || (headers["x-forwarded-for"] || "").split(",")[0] || "unknown";
  return String(raw).trim().replace(/:\d+$/, "") || "unknown";
}

function tooManyFromThisVisitor(req) {
  const now = Date.now();
  const key = visitorKey(req);
  const recent = (recentByVisitor.get(key) || []).filter(function (t) { return now - t < RATE_LIMIT_WINDOW_MS; });
  if (recent.length >= RATE_LIMIT_MAX) {
    recentByVisitor.set(key, recent);
    return true;
  }
  recent.push(now);
  recentByVisitor.set(key, recent);
  if (recentByVisitor.size > 5000) { // keep memory bounded
    recentByVisitor.forEach(function (list, k) {
      if (!list.length || now - list[list.length - 1] >= RATE_LIMIT_WINDOW_MS) recentByVisitor.delete(k);
    });
  }
  return false;
}

// Neutralize anything a spreadsheet would treat as a formula (values are
// written with USER_ENTERED).
function clean(value, max) {
  let s = typeof value === "string" ? value.trim() : "";
  if (s.length > (max || 254)) s = s.slice(0, max || 254);
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return s;
}

// A name is plain text, one line, at most NAME_MAX characters. Anything that
// looks like a link or an email address (what spam bots put in name fields,
// which would then show up in emails addressed to that name) is dropped.
function cleanName(value) {
  let s = typeof value === "string" ? value.replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim() : "";
  if (s.length > NAME_MAX) s = s.slice(0, NAME_MAX).trim();
  if (/:\/\/|www\.|@|[<>]/i.test(s)) return "";
  return s;
}

async function addToMailerLite(context, email, source, person) {
  const apiKey = process.env.MAILERLITE_API_KEY;
  if (!apiKey) return null; // not configured
  const fields = { source: source };
  if (person.firstName) fields.name = person.firstName;
  if (person.lastName) fields.last_name = person.lastName;
  if (person.salutation) fields.salutation = person.salutation;

  async function post(sendFields) {
    const payload = { email: email, fields: sendFields };
    if (process.env.MAILERLITE_GROUP_ID) payload.groups = [process.env.MAILERLITE_GROUP_ID];
    return fetch("https://connect.mailerlite.com/api/subscribers", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + apiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });
  }

  try {
    let resp = await post(fields);
    // If the "salutation" custom field hasn't been created in MailerLite yet,
    // MailerLite answers 422 for the whole request. Retry without that one
    // field so the signup (and the name) still goes through.
    if (resp.status === 422 && fields.salutation) {
      context.log.warn("MailerLite rejected the request (422); retrying without the salutation field. Create a text field with the key 'salutation' in MailerLite (Subscribers > Fields).");
      const withoutSalutation = Object.assign({}, fields);
      delete withoutSalutation.salutation;
      resp = await post(withoutSalutation);
    }
    if (resp.ok) return true;
    const text = await resp.text();
    context.log.error("MailerLite responded " + resp.status + ": " + text.slice(0, 300));
    return false;
  } catch (e) {
    context.log.error("MailerLite request failed: " + e.message);
    return false;
  }
}

async function addToSheet(context, email, source, person) {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  const sheetId = process.env.GOOGLE_SHEETS_NEWSLETTER_SHEET_ID || process.env.GOOGLE_SHEETS_PLEDGE_SHEET_ID;
  if (!clientEmail || !privateKey || !sheetId) return null; // not configured
  try {
    await appendRow(sheetId, SHEET_TAB_NAME, [new Date().toISOString(), email, source, clean(person.salutation), clean(person.firstName), clean(person.lastName)], clientEmail, privateKey);
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

  // Timing check: a person needs a few seconds to load the page, type an
  // address and press the button; a script can submit instantly (or post to
  // this endpoint directly without ever loading the page). The page sends how
  // long it had been open (elapsedMs). Anything faster than MIN_FILL_MS, or
  // with no usable value, gets the same quiet fake success as the honeypot.
  if (typeof body.elapsedMs !== "number" || !isFinite(body.elapsedMs) || body.elapsedMs < MIN_FILL_MS) {
    context.log.warn("Newsletter signup ignored (too fast or missing timing).");
    context.res.status = 200;
    context.res.body = { success: true };
    return;
  }

  // Rate limit: cap signups per visitor address in a short window, so the form
  // can't be used to fire off confirmation emails at strangers.
  if (tooManyFromThisVisitor(req)) {
    context.res.status = 429;
    context.res.body = { error: "Too many sign-up attempts from your connection. Please try again in a few minutes, or email us at chorus@dalcc.org." };
    return;
  }

  const email = clean(body.email).toLowerCase();
  const source = ALLOWED_SOURCES.indexOf(body.source) === -1 ? "other" : body.source;
  if (!email || !EMAIL_PATTERN.test(email)) {
    context.res.status = 400;
    context.res.body = { error: "Please enter a valid email address." };
    return;
  }

  // Optional name details (sent by the "Stay Informed" side tab; the other
  // subscribe forms are email-only). Anything unexpected is simply left out.
  const person = {
    salutation: ALLOWED_SALUTATIONS.indexOf(body.salutation) === -1 ? "" : body.salutation,
    firstName: cleanName(body.firstName),
    lastName: cleanName(body.lastName),
  };

  const results = await Promise.all([addToMailerLite(context, email, source, person), addToSheet(context, email, source, person)]);
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

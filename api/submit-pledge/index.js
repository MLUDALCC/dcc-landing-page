// Records an Annual Pledge submission from the Give page's pledge form
// (id="pledge-form" in give.html).
//
// A pledge here is a stated intent to give a certain amount over the
// season -- not an immediate charge. This function never touches Stripe or
// moves any money; it simply appends the submission as a new row in a
// Google Sheet, so DCC staff can track pledges and follow up the same way
// they would a paper pledge card.
//
// Requires three app settings in the Static Web App's configuration
// (Azure Portal > your Static Web App > Environment variables):
//   GOOGLE_SERVICE_ACCOUNT_EMAIL        -- the Google Cloud service account's email
//   GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY  -- that service account's private key
//   GOOGLE_SHEETS_PLEDGE_SHEET_ID       -- the target Google Sheet's ID (from its URL)
// Optional:
//   GOOGLE_SHEETS_PLEDGE_TAB_NAME       -- defaults to "Pledges"
// See api/pledge-data/googleSheets.js for how these are used.

const { appendRow } = require("../pledge-data/googleSheets");

const SHEET_TAB_NAME = process.env.GOOGLE_SHEETS_PLEDGE_TAB_NAME || "Pledges";
const ALLOWED_CADENCES = ["One-time gift", "Monthly installments", "Quarterly installments"];

// Values are written with USER_ENTERED, so anything starting with = + - or @
// (international phone numbers start with "+") would be read as a formula or
// number by Google Sheets. Prefixing an apostrophe keeps it as plain text.
function safe(value) {
  const s = typeof value === "string" ? value : "";
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

module.exports = async function (context, req) {
  context.res = { headers: { "Content-Type": "application/json" } };

  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  const sheetId = process.env.GOOGLE_SHEETS_PLEDGE_SHEET_ID;
  if (!clientEmail || !privateKey || !sheetId) {
    context.log.error(
      "GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY / GOOGLE_SHEETS_PLEDGE_SHEET_ID is not configured in this Static Web App's settings."
    );
    context.res.status = 500;
    context.res.body = { error: "The pledge form isn't fully set up yet. Please contact us directly at chorus@dalcc.org." };
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

  const parentName = typeof body.parentName === "string" ? body.parentName.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const phone = typeof body.phone === "string" ? body.phone.trim() : "";
  // Mailing address is entirely optional -- not collected as a condition of
  // submitting a pledge, just offered in case staff want to send a written
  // thank-you or pledge reminder by mail.
  const addressLine1 = typeof body.addressLine1 === "string" ? body.addressLine1.trim() : "";
  const addressLine2 = typeof body.addressLine2 === "string" ? body.addressLine2.trim() : "";
  const city = typeof body.city === "string" ? body.city.trim() : "";
  const state = typeof body.state === "string" ? body.state.trim() : "";
  const zip = typeof body.zip === "string" ? body.zip.trim() : "";
  // Optional: not every donor is a chorister's family -- some are relatives
  // or general supporters with no specific chorister to name.
  const choristerName = typeof body.choristerName === "string" ? body.choristerName.trim() : "";
  const cadence = typeof body.cadence === "string" ? body.cadence.trim() : "";
  const pledgeAmount = parseFloat(body.pledgeAmount);

  if (!parentName || !email || !cadence) {
    context.res.status = 400;
    context.res.body = { error: "Please fill in all required fields." };
    return;
  }
  if (!isFinite(pledgeAmount) || pledgeAmount <= 0) {
    context.res.status = 400;
    context.res.body = { error: "Please enter a valid pledge amount." };
    return;
  }
  if (ALLOWED_CADENCES.indexOf(cadence) === -1) {
    context.res.status = 400;
    context.res.body = { error: "Please choose how you'd like to fulfill this pledge." };
    return;
  }

  const submittedAt = new Date().toISOString();
  const formattedAmount = "$" + pledgeAmount.toFixed(2);

  try {
    await appendRow(
      sheetId,
      SHEET_TAB_NAME,
      [
        submittedAt,
        safe(parentName),
        safe(email),
        safe(phone),
        safe(addressLine1),
        safe(addressLine2),
        safe(city),
        safe(state),
        safe(zip),
        safe(choristerName),
        formattedAmount,
        cadence,
      ],
      clientEmail,
      privateKey
    );
  } catch (e) {
    context.log.error("Failed to append pledge to Google Sheet: " + e.message);
    context.res.status = 502;
    context.res.body = { error: "Something went wrong recording your pledge. Please try again, or contact us directly at chorus@dalcc.org." };
    return;
  }

  context.res.status = 200;
  context.res.body = { success: true };
};

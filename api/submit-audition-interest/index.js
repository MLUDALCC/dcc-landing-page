// Records an Audition Interest Form submission from the Auditions page
// (id="audition-form" in auditions.html).
//
// Appends each submission as a new row in a Google Sheet, the same way the
// Annual Pledge form does (see api/submit-pledge/index.js and
// api/pledge-data/googleSheets.js), so DCC staff can follow up with families
// about audition dates.
//
// Uses the same service-account settings as the pledge form:
//   GOOGLE_SERVICE_ACCOUNT_EMAIL
//   GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
// Sheet settings:
//   GOOGLE_SHEETS_AUDITION_SHEET_ID   -- optional; if not set, falls back to
//                                        GOOGLE_SHEETS_PLEDGE_SHEET_ID, so
//                                        auditions can simply be another tab
//                                        in the same spreadsheet
//   GOOGLE_SHEETS_AUDITION_TAB_NAME   -- optional; defaults to "Audition Interest"
//
// The tab needs to exist already, and the sheet must be shared (Editor) with
// the service account.

const { appendRow } = require("../pledge-data/googleSheets");
const { checkAddress } = require("./address");

const SEASON = "2027/28";
const SHEET_TAB_NAME = process.env.GOOGLE_SHEETS_AUDITION_TAB_NAME || "Audition Interest";
const ALLOWED_GENDERS = ["Female", "Male", "Other"];
const ALLOWED_GRADES = ["4th", "5th", "6th", "7th", "8th", "9th", "10th", "11th", "12th"];
const MAX_LEN = 500;

// Trim, cap length, and neutralize anything a spreadsheet would treat as a
// formula (values are written with USER_ENTERED, so a submission beginning
// with = + - or @ could otherwise run as a formula once staff open the sheet).
function clean(value) {
  let s = typeof value === "string" ? value.trim() : "";
  if (s.length > MAX_LEN) s = s.slice(0, MAX_LEN);
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return s;
}

module.exports = async function (context, req) {
  context.res = { headers: { "Content-Type": "application/json" } };

  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  const sheetId = process.env.GOOGLE_SHEETS_AUDITION_SHEET_ID || process.env.GOOGLE_SHEETS_PLEDGE_SHEET_ID;
  if (!clientEmail || !privateKey || !sheetId) {
    context.log.error(
      "GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY / GOOGLE_SHEETS_AUDITION_SHEET_ID (or GOOGLE_SHEETS_PLEDGE_SHEET_ID) is not configured in this Static Web App's settings."
    );
    context.res.status = 500;
    context.res.body = { error: "The audition form isn't fully set up yet. Please contact us directly at chorus@dalcc.org." };
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

  const studentFirstName = clean(body.studentFirstName);
  const studentLastName = clean(body.studentLastName);
  const studentEmail = clean(body.studentEmail);
  const gender = clean(body.gender);
  const grade = clean(body.grade);
  const age = clean(body.age);
  const height = clean(body.height);
  const studentStreet1 = clean(body.studentStreet1);
  const studentStreet2 = clean(body.studentStreet2);
  const studentCity = clean(body.studentCity);
  const studentState = clean(body.studentState);
  const studentZip = clean(body.studentZip);
  const parent1Name = clean(body.parent1Name);
  const parent1Street1 = clean(body.parent1Street1);
  const parent1Street2 = clean(body.parent1Street2);
  const parent1City = clean(body.parent1City);
  const parent1State = clean(body.parent1State);
  const parent1Zip = clean(body.parent1Zip);
  const parent1Email = clean(body.parent1Email);
  const parent1Phone = clean(body.parent1Phone);
  const parent2Name = clean(body.parent2Name);
  const parent2Street1 = clean(body.parent2Street1);
  const parent2Street2 = clean(body.parent2Street2);
  const parent2City = clean(body.parent2City);
  const parent2State = clean(body.parent2State);
  const parent2Zip = clean(body.parent2Zip);
  const parent2Email = clean(body.parent2Email);
  const parent2Phone = clean(body.parent2Phone);
  const heardAbout = clean(body.heardAbout);
  const confirmAddress = body.confirmAddress === true || body.confirmAddress === "true";
  const wantsFutureInfo = body.wantsFutureInfo === true || body.wantsFutureInfo === "true";

  if (
    !studentFirstName || !studentLastName || !studentEmail || !gender || !grade || !age || !height ||
    !studentStreet1 || !studentCity || !studentState || !studentZip ||
    !parent1Name || !parent1Street1 || !parent1City || !parent1State || !parent1Zip || !parent1Email || !parent1Phone || !heardAbout
  ) {
    context.res.status = 400;
    context.res.body = { error: "Please fill in all required fields." };
    return;
  }
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(studentEmail) || !emailPattern.test(parent1Email) || (parent2Email && !emailPattern.test(parent2Email))) {
    context.res.status = 400;
    context.res.body = { error: "Please enter valid email addresses." };
    return;
  }
  if (ALLOWED_GENDERS.indexOf(gender) === -1) {
    context.res.status = 400;
    context.res.body = { error: "Please choose one of the options for M/F." };
    return;
  }
  if (ALLOWED_GRADES.indexOf(grade) === -1) {
    context.res.status = 400;
    context.res.body = { error: "Please choose your student's grade." };
    return;
  }

  // Address checks (format, ZIP/state fit, ZIP/city lookup). Parent #2's
  // address is optional, but if any part is given, all of it must be valid.
  const addresses = [
    ["The student\u2019s address", { street1: studentStreet1, street2: studentStreet2, city: studentCity, state: studentState, zip: studentZip }],
    ["Parent/Guardian #1\u2019s address", { street1: parent1Street1, street2: parent1Street2, city: parent1City, state: parent1State, zip: parent1Zip }],
  ];
  if (parent2Street1 || parent2Street2 || parent2City || parent2State || parent2Zip) {
    addresses.push(["Parent/Guardian #2\u2019s address", { street1: parent2Street1, street2: parent2Street2, city: parent2City, state: parent2State, zip: parent2Zip }]);
  }
  for (const [label, addr] of addresses) {
    const result = await checkAddress(addr, label);
    if (!result.ok && !(result.soft && confirmAddress)) {
      context.res.status = 400;
      context.res.body = { error: result.error, addressWarning: !!result.soft };
      return;
    }
  }

  try {
    await appendRow(
      sheetId,
      SHEET_TAB_NAME,
      [
        new Date().toISOString(),
        SEASON,
        studentFirstName,
        studentLastName,
        studentEmail,
        gender,
        grade,
        age,
        height,
        studentStreet1,
        studentStreet2,
        studentCity,
        studentState.toUpperCase(),
        studentZip,
        parent1Name,
        parent1Street1,
        parent1Street2,
        parent1City,
        parent1State.toUpperCase(),
        parent1Zip,
        parent1Email,
        parent1Phone,
        parent2Name,
        parent2Street1,
        parent2Street2,
        parent2City,
        parent2State.toUpperCase(),
        parent2Zip,
        parent2Email,
        parent2Phone,
        heardAbout,
        wantsFutureInfo ? "Yes" : "No",
      ],
      clientEmail,
      privateKey
    );
  } catch (e) {
    context.log.error("Failed to append audition interest to Google Sheet: " + e.message);
    context.res.status = 502;
    context.res.body = { error: "Something went wrong submitting your form. Please try again, or contact us directly at chorus@dalcc.org." };
    return;
  }

  context.res.status = 200;
  context.res.body = { success: true };
};

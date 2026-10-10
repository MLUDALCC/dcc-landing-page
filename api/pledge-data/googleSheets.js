// Shared helper for writing Annual Pledge submissions into a Google Sheet.
//
// Rather than using Google's own Forms "formResponse" endpoint (undocumented,
// and fragile to any future edit of a Form's questions), this talks to the
// real, documented Google Sheets API v4 directly, authenticating as a
// Google Cloud service account. That requires:
//   1. A Google Sheet, with the service account's email added as an Editor
//      (Google Sheet > Share).
//   2. Three settings configured in this Static Web App (Azure Portal >
//      your Static Web App > Environment variables):
//        GOOGLE_SERVICE_ACCOUNT_EMAIL        -- the service account's email
//        GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY  -- its private key (see below)
//        GOOGLE_SHEETS_PLEDGE_SHEET_ID       -- the sheet's ID (from its URL)
//
// GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: paste the "private_key" value from the
// downloaded service-account JSON key file exactly as-is. If the Environment
// Variables UI flattens its real line breaks into literal "\n" characters,
// normalizePrivateKey() below converts them back to real newlines before
// signing -- so either form works.
//
// Never commit a real value for GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY into this
// repo.

const crypto = require("crypto");

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets";

function base64url(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function normalizePrivateKey(key) {
  return key.indexOf("\\n") !== -1 ? key.replace(/\\n/g, "\n") : key;
}

// Google's service-account flow: a short-lived JWT, self-signed with the
// service account's own private key, exchanged at Google's token endpoint
// for an OAuth access token. No client secret or user consent screen
// involved -- this is what lets a server write to a spreadsheet with no
// human signed in.
function buildSignedJwt(clientEmail, privateKey) {
  const header = { alg: "RS256", typ: "JWT" };
  const nowSeconds = Math.floor(Date.now() / 1000);
  const claimSet = {
    iss: clientEmail,
    scope: SHEETS_SCOPE,
    aud: TOKEN_URL,
    iat: nowSeconds,
    exp: nowSeconds + 3600,
  };

  const signingInput = base64url(JSON.stringify(header)) + "." + base64url(JSON.stringify(claimSet));
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(signingInput);
  signer.end();
  const signature = signer
    .sign(normalizePrivateKey(privateKey))
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  return signingInput + "." + signature;
}

async function getAccessToken(clientEmail, privateKey) {
  const assertion = buildSignedJwt(clientEmail, privateKey);

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: assertion,
    }),
  });

  const data = await res.json().catch(function () {
    return {};
  });
  if (!res.ok || !data.access_token) {
    throw new Error(
      "Google token exchange failed: " + (data.error_description || data.error || res.status)
    );
  }
  return data.access_token;
}

// Appends one row to the given sheet/tab. `values` is a plain array in
// left-to-right column order -- callers are responsible for matching the
// order of the sheet's own header row.
async function appendRow(sheetId, tabName, values, clientEmail, privateKey) {
  const accessToken = await getAccessToken(clientEmail, privateKey);
  const range = encodeURIComponent(tabName + "!A:Z");
  const url =
    "https://sheets.googleapis.com/v4/spreadsheets/" +
    sheetId +
    "/values/" +
    range +
    ":append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS";

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: "Bearer " + accessToken,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ values: [values] }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(function () {
      return "";
    });
    throw new Error("Google Sheets append failed (" + res.status + "): " + errText);
  }
}

// Reads every row of the given sheet/tab and returns them as an array of
// arrays (each inner array is one row, left to right). Used by the Family
// Portal to read its roster from the "Family Roster" tab.
async function readRows(sheetId, tabName, clientEmail, privateKey) {
  const accessToken = await getAccessToken(clientEmail, privateKey);
  const range = encodeURIComponent(tabName + "!A:Z");
  const url = "https://sheets.googleapis.com/v4/spreadsheets/" + sheetId + "/values/" + range;

  const res = await fetch(url, {
    headers: { Authorization: "Bearer " + accessToken },
  });

  if (!res.ok) {
    const errText = await res.text().catch(function () {
      return "";
    });
    throw new Error("Google Sheets read failed (" + res.status + "): " + errText);
  }

  const data = await res.json().catch(function () {
    return {};
  });
  return Array.isArray(data.values) ? data.values : [];
}

module.exports = { appendRow: appendRow, readRows: readRows };

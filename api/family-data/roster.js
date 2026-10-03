// Shared roster loader for the Family Portal login/verify functions.
//
// The roster is a plain CSV file (roster.csv, next to this file) rather
// than a database -- at the scale of a chorus family list (dozens to a
// couple hundred rows) that keeps this whole feature deployable the same
// way as the rest of the site: edit the file, commit, push. Update the
// season's roster by editing roster.csv directly (one row per family:
// email,family_name -- family_name is optional and only used for the
// "Welcome back, <name>!" greeting).
//
// This file is inside api/, which Azure Static Web Apps deploys as the
// separate Functions app -- it is never served as a static, browsable
// file the way anything under assets/ or the site root is.

const fs = require("fs");
const path = require("path");

const ROSTER_PATH = path.join(__dirname, "roster.csv");

function loadRoster() {
  let raw;
  try {
    raw = fs.readFileSync(ROSTER_PATH, "utf8");
  } catch (e) {
    return new Map();
  }

  const roster = new Map();
  raw.split(/\r?\n/).forEach(function (line) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    if (trimmed.toLowerCase().startsWith("email,")) return; // header row

    const commaIdx = trimmed.indexOf(",");
    const email = (commaIdx === -1 ? trimmed : trimmed.slice(0, commaIdx)).trim().toLowerCase();
    const familyName = commaIdx === -1 ? "" : trimmed.slice(commaIdx + 1).trim();
    if (email) roster.set(email, familyName);
  });

  return roster;
}

module.exports = { loadRoster: loadRoster, ROSTER_PATH: ROSTER_PATH };

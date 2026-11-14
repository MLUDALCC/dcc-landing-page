/* Audition form: "Current school" cascading pulldowns (auditions.html).
   Reads window.DCC_SCHOOLS (assets/js/school-data.js):
     counties    -- North Texas county names, in menu order
     public      -- { county: { district: [school, ...] } }   (charter networks listed as districts)
     independent -- { county: [school, ...] }
   Flow: school type -> county -> (independent) school | (public) district -> school -> current grade.
   Every school field is optional; "My school isn't listed" reveals a text box. */
(function () {
  "use strict";
  var data = window.DCC_SCHOOLS;
  var form = document.getElementById("audition-form");
  if (!form || !data) return;

  var $ = function (id) { return document.getElementById(id); };
  var typeSel = $("aud-school-type"), countySel = $("aud-school-county"),
      districtSel = $("aud-school-district"), schoolSel = $("aud-school-name"),
      otherInput = $("aud-school-other");
  var rowCounty = $("aud-row-county"), rowDistrict = $("aud-row-district"),
      rowSchool = $("aud-row-school"), rowOther = $("aud-row-other");
  var NOT_LISTED = "__not_listed__";

  function fill(select, placeholder, items, extra) {
    select.innerHTML = "";
    var first = document.createElement("option");
    first.value = ""; first.textContent = placeholder;
    select.appendChild(first);
    items.forEach(function (name) {
      var o = document.createElement("option");
      o.value = name; o.textContent = name;
      select.appendChild(o);
    });
    if (extra) {
      var n = document.createElement("option");
      n.value = NOT_LISTED; n.textContent = extra;
      select.appendChild(n);
    }
  }
  function show(row, on) { row.hidden = !on; }
  function sorted(obj) { return Object.keys(obj).sort(function (a, b) { return a.localeCompare(b); }); }
  function byName(list) { return list.slice().sort(function (a, b) { return a.localeCompare(b); }); }

  var update = function (level) {
    var type = typeSel.value;
    var county = countySel.value;
    var needsCounty = type === "Public" || type === "Independent";

    if (level <= 0) {                       // school type changed
      countySel.value = ""; districtSel.value = ""; schoolSel.value = ""; otherInput.value = "";
      if (needsCounty) fill(countySel, "Select a county", data.counties, "Another county (not listed)");
    }
    show(rowCounty, needsCounty);

    if (level <= 1) {                       // county changed
      districtSel.value = ""; schoolSel.value = ""; otherInput.value = "";
      if (type === "Independent" && county && county !== NOT_LISTED) {
        fill(schoolSel, "Select a school", byName(data.independent[county] || []), "My school isn\u2019t listed");
      }
      if (type === "Public" && county && county !== NOT_LISTED) {
        fill(districtSel, "Select a school district", sorted(data.public[county] || {}), "My district isn\u2019t listed");
      }
    }
    var district = districtSel.value;
    if (level <= 2 && type === "Public") {  // district changed
      schoolSel.value = ""; otherInput.value = "";
      if (county && county !== NOT_LISTED && district && district !== NOT_LISTED) {
        var list = (data.public[county] || {})[district] || [];
        fill(schoolSel, "Select a school", byName(list), "My school isn\u2019t listed");
      }
    }

    county = countySel.value;
    district = districtSel.value;
    var countyOK = county && county !== NOT_LISTED;
    show(rowDistrict, type === "Public" && countyOK);
    var districtOK = district && district !== NOT_LISTED;
    show(rowSchool, (type === "Independent" && countyOK) || (type === "Public" && countyOK && districtOK));

    // Free-text box when something isn't listed
    var notListed = county === NOT_LISTED || district === NOT_LISTED || schoolSel.value === NOT_LISTED;
    show(rowOther, needsCounty && notListed);
    if (!notListed) otherInput.value = "";
  };

  /* Once the family picks Public or Independent, every field shown in this section is required. */
  var gradeSel = $("aud-current-grade");
  function setRequired(el, on) {
    el.required = on;
    var label = form.querySelector('label[for="' + el.id + '"] .req');
    if (label) label.hidden = !on;
  }
  function refreshRequired() {
    var needs = typeSel.value === "Public" || typeSel.value === "Independent";
    setRequired(countySel, needs && !rowCounty.hidden);
    setRequired(districtSel, needs && !rowDistrict.hidden);
    setRequired(schoolSel, needs && !rowSchool.hidden);
    setRequired(otherInput, needs && !rowOther.hidden);
    setRequired(gradeSel, needs);
  }
  var baseUpdate = update;
  update = function (level) { baseUpdate(level); refreshRequired(); };

  typeSel.addEventListener("change", function () { update(0); });
  countySel.addEventListener("change", function () { update(1); });
  districtSel.addEventListener("change", function () { update(2); });
  schoolSel.addEventListener("change", function () { update(3); });
  update(0);
})();

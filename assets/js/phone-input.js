// Country-code phone fields (flag + dial code, default United States +1).
// Wraps every <input type="tel"> on the page with the intl-tel-input library
// (self-hosted in assets/vendor/intl-tel-input, MIT license). Exposes
// window.dccPhone.read(input) for the form scripts, which returns the number
// in international format ("+1 214-555-1212"), or "" if the field is empty,
// plus whether it looks valid.
(function () {
  if (typeof window.intlTelInput !== "function") return;

  var UTILS_URL = "assets/vendor/intl-tel-input/js/utils.js";

  function init(input) {
    var iti = window.intlTelInput(input, {
      initialCountry: "us",
      separateDialCode: true,
      countrySearch: true,
      formatAsYouType: false, // US/Canada numbers are formatted below as (214) 555-1212
      strictMode: true,
      containerClass: "dcc-iti",
      loadUtils: function () { return import(new URL(UTILS_URL, document.baseURI).href); }
    });
    input._iti = iti;
    attachNanpFormatting(input, iti);
  }

  // For +1 countries (United States, Canada, Caribbean) show the familiar
  // (214) 555-1212 as the visitor types. Other countries are left as typed
  // and are normalized into international format when the form is read.
  // Digits only; a leading 1 (country code typed or pasted) is dropped, since
  // no US/Canadian area code starts with 1.
  function digitsOf(v) {
    var d = v.replace(/\D/g, "");
    if (d.charAt(0) === "1") d = d.slice(1);
    return d.slice(0, 10);
  }
  function formatNanp(d) {
    if (!d.length) return "";
    if (d.length < 4) return "(" + d;
    if (d.length < 7) return "(" + d.slice(0, 3) + ") " + d.slice(3);
    return "(" + d.slice(0, 3) + ") " + d.slice(3, 6) + "-" + d.slice(6);
  }
  function attachNanpFormatting(input, iti) {
    var prevDigits = "";
    input.addEventListener("focus", function () { prevDigits = digitsOf(input.value); });
    input.addEventListener("input", function (e) {
      var country = iti.getSelectedCountry();
      if (!country || country.dialCode !== "1") { prevDigits = ""; return; }
      var caret = input.selectionStart;
      var digitsBeforeCaret = digitsOf(input.value.slice(0, caret)).length;
      var d = digitsOf(input.value);
      // Backspacing over "(", ") " or "-" removes the digit before it
      if (e.inputType === "deleteContentBackward" && d === prevDigits && d.length) {
        d = d.slice(0, -1);
        digitsBeforeCaret = Math.max(0, digitsBeforeCaret - 1);
      }
      var formatted = formatNanp(d);
      input.value = formatted;
      prevDigits = d;
      var pos = 0, seen = 0;
      while (pos < formatted.length && seen < digitsBeforeCaret) {
        if (/\d/.test(formatted.charAt(pos))) seen++;
        pos++;
      }
      if (digitsBeforeCaret >= d.length) pos = formatted.length;
      input.setSelectionRange(pos, pos);
    });
  }

  document.querySelectorAll('input[type="tel"]').forEach(init);

  window.dccPhone = {
    read: function (input) {
      var iti = input && input._iti;
      var raw = input ? input.value.trim() : "";
      if (!raw) return { value: "", valid: true };
      if (!iti) return { value: raw, valid: true };
      var utils = window.intlTelInput.utils;
      var number = utils ? iti.getNumber("INTERNATIONAL") : "";
      if (!number) {
        // Format helper not loaded: fall back to dial code + what was typed
        var country = iti.getSelectedCountry();
        number = "+" + (country && country.dialCode ? country.dialCode : "") + " " + raw;
      }
      var valid = iti.isValidNumber();
      return { value: number, valid: valid !== false };
    }
  };
})();

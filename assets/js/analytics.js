/* Google Analytics 4 for the public pages of dalcc.org.
 *
 * Privacy choices built in:
 *  - Not loaded on the Family Portal.
 *  - Not loaded when the browser sends Global Privacy Control.
 *  - Google signals / ad personalization off (also off in the GA admin).
 *  - Payment query-string values (payment_intent, client secret, redirect
 *    status) are stripped from the page address before it is sent.
 *  - No names, emails or form contents are ever sent -- only event names.
 *
 * To change the property, edit MEASUREMENT_ID below.
 */
(function () {
  "use strict";
  var MEASUREMENT_ID = "G-TGGJPX69PC";

  if (/family-portal/i.test(window.location.pathname)) return;
  if (navigator.globalPrivacyControl === true) return;

  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = gtag;

  function cleanLocation() {
    try {
      var u = new URL(window.location.href);
      ["payment_intent", "payment_intent_client_secret", "redirect_status", "setup_intent", "setup_intent_client_secret"].forEach(function (k) {
        u.searchParams.delete(k);
      });
      return u.toString();
    } catch (e) {
      return window.location.origin + window.location.pathname;
    }
  }

  gtag("js", new Date());
  gtag("config", MEASUREMENT_ID, {
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
    page_location: cleanLocation()
  });

  var s = document.createElement("script");
  s.async = true;
  s.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(MEASUREMENT_ID);
  document.head.appendChild(s);

  // Completed online gift = a visit to the thank-you page (once per session).
  if (/\/thank-you(\.html)?$/i.test(window.location.pathname)) {
    var counted = false;
    try { counted = sessionStorage.getItem("dccGiftCounted") === "1"; } catch (e) {}
    if (!counted) {
      gtag("event", "donation_completed");
      try { sessionStorage.setItem("dccGiftCounted", "1"); } catch (e) {}
    }
  }

  // Custom events dispatched by the site's own form handlers.
  document.addEventListener("dcc:subscribed", function () { gtag("event", "newsletter_signup"); });
  document.addEventListener("dcc:audition-submitted", function () { gtag("event", "audition_interest_submitted"); });
  document.addEventListener("dcc:pledge-submitted", function () { gtag("event", "pledge_submitted"); });
})();

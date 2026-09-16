(function () {
  "use strict";

  var header = document.querySelector(".site-header");
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---- Header solidify on scroll ---------------------------------- */
  function onScroll() {
    if (!header) return;
    if (window.scrollY > 24) header.classList.add("is-scrolled");
    else header.classList.remove("is-scrolled");
  }
  if (header) {
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* ---- Desktop dropdown nav ----------------------------------------- */
  var navItems = document.querySelectorAll(".main-nav__item");
  navItems.forEach(function (item) {
    var link = item.querySelector(".main-nav__link");
    var panel = item.querySelector(".main-nav__panel");
    if (!panel) return;

    function open() { item.classList.add("is-open"); link.setAttribute("aria-expanded", "true"); }
    function close() { item.classList.remove("is-open"); link.setAttribute("aria-expanded", "false"); }

    item.addEventListener("mouseenter", open);
    item.addEventListener("mouseleave", close);
    link.addEventListener("focus", open);
    item.addEventListener("focusout", function (e) {
      if (!item.contains(e.relatedTarget)) close();
    });
    link.addEventListener("click", function (e) {
      if (panel) {
        e.preventDefault();
        item.classList.contains("is-open") ? close() : open();
      }
    });
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") navItems.forEach(function (i) { i.classList.remove("is-open"); });
  });

  /* ---- Mobile nav drawer --------------------------------------------- */
  var toggle = document.querySelector(".nav-toggle");
  var mobileNav = document.querySelector(".mobile-nav");
  var mobileClose = document.querySelector(".mobile-nav__close");

  function openMobile() {
    if (!mobileNav) return;
    mobileNav.classList.add("is-open");
    document.body.classList.add("nav-open");
    toggle && toggle.setAttribute("aria-expanded", "true");
  }
  function closeMobile() {
    if (!mobileNav) return;
    mobileNav.classList.remove("is-open");
    document.body.classList.remove("nav-open");
    toggle && toggle.setAttribute("aria-expanded", "false");
  }
  toggle && toggle.addEventListener("click", openMobile);
  mobileClose && mobileClose.addEventListener("click", closeMobile);

  document.querySelectorAll(".mobile-nav__top").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var li = btn.closest("li");
      var wasOpen = li.classList.contains("is-open");
      document.querySelectorAll(".mobile-nav > ul > li").forEach(function (i) { i.classList.remove("is-open"); });
      if (!wasOpen) li.classList.add("is-open");
    });
  });

  /* ---- Hero video: fade in once playable, respect reduced motion ------ */
  var heroVideo = document.querySelector(".hero__video");
  if (heroVideo) {
    if (reduceMotion) {
      heroVideo.removeAttribute("autoplay");
      heroVideo.pause();
    } else {
      heroVideo.addEventListener("playing", function () { heroVideo.classList.add("is-ready"); });
      var playPromise = heroVideo.play();
      if (playPromise && playPromise.catch) playPromise.catch(function () { /* autoplay blocked; poster remains */ });
    }
  }

  /* ---- Hero: guarantee the box is always tall enough for its own copy ----
     Below 900px the CSS gives .hero a fixed clamp() height; at 900px+ it
     switches to an aspect-ratio box with a min-height floor. Either way,
     at some viewport widths the eyebrow + title + paragraph + buttons need
     more room than that CSS formula assumed, and .hero's overflow:hidden
     then clips the button row (seen on some narrow/portrait phones with
     the longer intro paragraph, not just in the desktop mid-range). A
     single CSS min-height can't reliably predict every width/font/line-wrap
     combination, so instead we measure the real rendered bottom edge of the
     button row and raise .hero's min-height only when the copy actually
     needs more space than the CSS currently provides — this only ever
     grows the box, never shrinks it below what the CSS already set. */
  (function () {
    var hero = document.querySelector(".hero");
    var content = hero && hero.querySelector(".hero__content");
    var actions = content && content.querySelector(".hero__actions");
    if (!hero || !content || !actions) return;

    function sync() {
      var heroTop = hero.getBoundingClientRect().top;
      var actionsBottom = actions.getBoundingClientRect().bottom;
      var needed = Math.ceil(actionsBottom - heroTop) + 96; // breathing room below the buttons, clear of the scroll cue
      hero.style.minHeight = needed + "px";
    }

    sync();
    window.addEventListener("load", sync);
    window.addEventListener("resize", sync);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(sync);
  })();

  /* ---- Scroll reveal ---------------------------------------------------
     IntersectionObserver is the primary, cheap trigger. A throttled
     rAF sweep on scroll/resize is a redundant safety net that checks
     bounding-box geometry directly, so a fast scroll, a keyboard "End"
     jump, a mid-page anchor landing, or any edge case the observer
     happens to miss still can't leave content permanently invisible. */
  var revealEls = Array.prototype.slice.call(document.querySelectorAll("[data-reveal]"));
  if (revealEls.length) {
    var io = ("IntersectionObserver" in window) ? new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) reveal(entry.target);
      });
    }, { threshold: 0, rootMargin: "200px 0px 200px 0px" }) : null;

    function reveal(el) {
      el.classList.add("is-visible");
      if (io) io.unobserve(el);
      var idx = revealEls.indexOf(el);
      if (idx > -1) revealEls.splice(idx, 1);
      if (!revealEls.length) window.removeEventListener("scroll", onScrollSweep);
    }

    var sweepQueued = false;
    function sweepNow() {
      sweepQueued = false;
      revealEls.slice().forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.top < window.innerHeight + 150 && r.bottom > -150) reveal(el);
      });
    }
    function onScrollSweep() {
      if (sweepQueued) return;
      sweepQueued = true;
      requestAnimationFrame(sweepNow);
    }

    if (io) revealEls.forEach(function (el) { io.observe(el); });
    else revealEls.forEach(function (el) { reveal(el); });

    window.addEventListener("scroll", onScrollSweep, { passive: true });
    window.addEventListener("resize", onScrollSweep);
    sweepNow();
  }

  /* ---- Accordion (FAQ) --------------------------------------------------- */
  document.querySelectorAll(".accordion__item").forEach(function (item) {
    var trigger = item.querySelector(".accordion__trigger");
    var panel = item.querySelector(".accordion__panel");
    if (!trigger || !panel) return;
    trigger.addEventListener("click", function () {
      var isOpen = item.classList.contains("is-open");
      item.parentElement.querySelectorAll(".accordion__item").forEach(function (i) {
        i.classList.remove("is-open");
        i.querySelector(".accordion__panel").style.maxHeight = null;
        i.querySelector(".accordion__trigger").setAttribute("aria-expanded", "false");
      });
      if (!isOpen) {
        item.classList.add("is-open");
        panel.style.maxHeight = panel.scrollHeight + "px";
        trigger.setAttribute("aria-expanded", "true");
      }
    });
  });

  /* ---- Leadership bio modal ------------------------------------------------ */
  (function () {
    var modal = document.querySelector(".bio-modal");
    if (!modal) return;
    var backdrop = modal.querySelector(".bio-modal__backdrop");
    var closeBtn = modal.querySelector(".bio-modal__close");
    var photoImg = modal.querySelector(".bio-modal__photo img");
    var nameEl = modal.querySelector(".bio-modal__name");
    var roleEl = modal.querySelector(".bio-modal__role");
    var bodyEl = modal.querySelector(".bio-modal__body");
    var lastTrigger = null;

    function openModal(person, trigger) {
      var photo = person.querySelector(".person__photo img");
      var full = person.querySelector(".person__full-bio-inner");
      if (photo) {
        photoImg.setAttribute("src", photo.getAttribute("src"));
        photoImg.setAttribute("alt", photo.getAttribute("alt") || "");
      }
      nameEl.textContent = person.querySelector("h3").textContent;
      roleEl.textContent = person.querySelector(".role").textContent;
      bodyEl.innerHTML = full ? full.innerHTML : "";

      lastTrigger = trigger;
      modal.classList.add("is-open");
      modal.setAttribute("aria-hidden", "false");
      document.body.classList.add("modal-open");
      bodyEl.scrollTop = 0;
      closeBtn.focus();
      document.addEventListener("keydown", onKeydown);
    }

    function closeModal() {
      modal.classList.remove("is-open");
      modal.setAttribute("aria-hidden", "true");
      document.body.classList.remove("modal-open");
      document.removeEventListener("keydown", onKeydown);
      if (lastTrigger) lastTrigger.focus();
    }

    function getFocusable() {
      return Array.prototype.slice
        .call(modal.querySelectorAll('button, a[href], [tabindex]:not([tabindex="-1"])'))
        .filter(function (el) { return el.offsetParent !== null; });
    }

    function onKeydown(e) {
      if (e.key === "Escape") {
        closeModal();
        return;
      }
      if (e.key === "Tab") {
        var focusable = getFocusable();
        if (!focusable.length) return;
        var first = focusable[0];
        var last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    document.querySelectorAll(".person__bio-toggle").forEach(function (trigger) {
      trigger.addEventListener("click", function () {
        var person = trigger.closest(".person");
        if (person) openModal(person, trigger);
      });
    });

    closeBtn.addEventListener("click", closeModal);
    backdrop.addEventListener("click", closeModal);
  })();

  /* ---- Contact page: match logo height to the facts column --------------- */
  (function () {
    var boxes = document.querySelectorAll(".contact-details.has-image");
    if (!boxes.length) return;

    function sync() {
      boxes.forEach(function (box) {
        var facts = box.querySelector(".contact-details__facts");
        var imageWrap = box.querySelector(".contact-details__image");
        if (!facts || !imageWrap) return;
        if (window.innerWidth <= 640) {
          imageWrap.style.height = "";
        } else {
          imageWrap.style.height = facts.offsetHeight + "px";
        }
      });
    }

    sync();
    window.addEventListener("load", sync);
    window.addEventListener("resize", sync);
  })();

  /* ---- Footer year ------------------------------------------------------- */
  var yearEl = document.getElementById("footer-year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---- Chorister quote carousel --------------------------------------------
     Manual control (native drag/swipe via CSS scroll-snap, plus arrow and dot
     buttons) with a gentle auto-advance that pauses the instant someone
     hovers, touches, or focuses the carousel, and is skipped entirely for
     anyone who has reduced motion turned on.

     Infinite-loop illusion: a clone of the first slide is appended after the
     last, and a clone of the last slide is prepended before the first. The
     visible motion always continues in the same direction (e.g. scrolling
     right past the last real quote glides onto its clone of the first quote)
     -- then, once that clone is fully in view and looks identical to the
     real slide, we silently snap the scroll position over to the real one
     with no animation and no visible seam. Dots and the "quote N of 4"
     bookkeeping always track the real slide, never the clones. */
  document.querySelectorAll(".quote-carousel").forEach(function (carousel) {
    var track = carousel.querySelector(".quote-carousel__track");
    var slides = track ? Array.prototype.slice.call(track.children) : [];
    var dotsWrap = carousel.querySelector(".quote-carousel__dots");
    var prevBtn = carousel.querySelector(".quote-carousel__arrow--prev");
    var nextBtn = carousel.querySelector(".quote-carousel__arrow--next");
    if (!track || slides.length < 2) return;

    var prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var realCount = slides.length;

    // Clone the first/last real slides so the track reads:
    // [clone of last] [real 0] [real 1] ... [real N-1] [clone of first]
    var firstClone = slides[0].cloneNode(true);
    var lastClone = slides[slides.length - 1].cloneNode(true);
    firstClone.setAttribute("aria-hidden", "true");
    lastClone.setAttribute("aria-hidden", "true");
    track.insertBefore(lastClone, slides[0]);
    track.appendChild(firstClone);
    var domSlides = Array.prototype.slice.call(track.children);

    // DOM index of a real slide is always its real index + 1 (offset by the
    // prepended clone).
    var currentDom = 1;
    var current = 0;

    var dots = slides.map(function (_, i) {
      var dot = document.createElement("button");
      dot.type = "button";
      dot.className = "quote-carousel__dot";
      dot.setAttribute("aria-label", "Show quote " + (i + 1) + " of " + realCount);
      dot.addEventListener("click", function () {
        goToReal(i);
        restartAutoplay();
      });
      dotsWrap.appendChild(dot);
      return dot;
    });

    function setActive(i) {
      current = i;
      dots.forEach(function (d, di) {
        d.classList.toggle("is-active", di === i);
      });
    }

    // A custom-animated scroll rather than the browser's built-in "smooth"
    // behavior, whose speed isn't adjustable -- this lets the slide-over feel
    // deliberately slow and unhurried instead of a quick, fixed-speed jump.
    var SLIDE_DURATION = 1400; // ms
    function easeInOutCubic(t) {
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }
    function animateScrollTo(el, target, onComplete) {
      var startX = el.scrollLeft;
      var change = target - startX;
      // CSS scroll-snap fights a manually-driven scroll -- Chromium defers
      // applying in-between positions until the snap "settles," which turns
      // an eased animation into a stuck-then-jump. Suspend snapping only for
      // the duration of this animation (and the silent clone->real reset
      // that may follow it), then hand it back for native drag/swipe.
      el.style.scrollSnapType = "none";
      function finish() {
        if (onComplete) onComplete();
        el.style.scrollSnapType = "";
      }
      if (!change) {
        finish();
        return;
      }
      var startTime = null;
      function step(timestamp) {
        if (startTime === null) startTime = timestamp;
        var progress = Math.min((timestamp - startTime) / SLIDE_DURATION, 1);
        el.scrollLeft = startX + change * easeInOutCubic(progress);
        if (progress < 1) {
          requestAnimationFrame(step);
        } else {
          finish();
        }
      }
      requestAnimationFrame(step);
    }

    // If a DOM index has landed on one of the two clones, silently (no
    // animation) snap over to the real slide it's a stand-in for, and return
    // the corrected DOM index. Otherwise, return it unchanged.
    function normalizeDom(domIndex) {
      if (domIndex === 0) {
        track.scrollLeft = domSlides[realCount].offsetLeft;
        return realCount;
      }
      if (domIndex === realCount + 1) {
        track.scrollLeft = domSlides[1].offsetLeft;
        return 1;
      }
      return domIndex;
    }

    function step(delta) {
      var nextDom = currentDom + delta;
      var target = domSlides[nextDom].offsetLeft;
      if (prefersReducedMotion) {
        track.scrollLeft = target;
        currentDom = normalizeDom(nextDom);
        current = currentDom - 1;
        setActive(current);
        return;
      }
      animateScrollTo(track, target, function () {
        currentDom = normalizeDom(nextDom);
        current = currentDom - 1;
        setActive(current);
      });
    }

    function goToReal(i) {
      var targetDom = i + 1;
      var target = domSlides[targetDom].offsetLeft;
      if (prefersReducedMotion) {
        track.scrollLeft = target;
        currentDom = targetDom;
        setActive(i);
        return;
      }
      animateScrollTo(track, target, function () {
        currentDom = targetDom;
        setActive(i);
      });
    }

    // Start on the real first slide (DOM index 1, past the prepended clone).
    // Suspend scroll-snap for this direct assignment too -- same Chromium
    // quirk as animateScrollTo: mandatory snap can leave a bare scrollLeft
    // assignment only partially applied.
    track.style.scrollSnapType = "none";
    track.scrollLeft = domSlides[1].offsetLeft;
    track.style.scrollSnapType = "";

    prevBtn.addEventListener("click", function () {
      step(-1);
      restartAutoplay();
    });
    nextBtn.addEventListener("click", function () {
      step(1);
      restartAutoplay();
    });

    // Keep the dots in sync when someone drags/swipes the track directly,
    // including snapping silently back to the real slide if a fast swipe
    // lands on one of the clones.
    var syncTimer = null;
    track.addEventListener("scroll", function () {
      clearTimeout(syncTimer);
      syncTimer = setTimeout(function () {
        var trackLeft = track.getBoundingClientRect().left;
        var closestDom = 0;
        var closestDist = Infinity;
        domSlides.forEach(function (slide, i) {
          var dist = Math.abs(slide.getBoundingClientRect().left - trackLeft);
          if (dist < closestDist) {
            closestDist = dist;
            closestDom = i;
          }
        });
        currentDom = normalizeDom(closestDom);
        current = currentDom - 1;
        setActive(current);
      }, 100);
    });

    var autoplayTimer = null;
    function startAutoplay() {
      if (prefersReducedMotion) return;
      stopAutoplay();
      autoplayTimer = setInterval(function () {
        step(1);
      }, 7000);
    }
    function stopAutoplay() {
      clearInterval(autoplayTimer);
    }
    function restartAutoplay() {
      startAutoplay();
    }

    carousel.addEventListener("mouseenter", stopAutoplay);
    carousel.addEventListener("mouseleave", startAutoplay);
    carousel.addEventListener("touchstart", stopAutoplay, { passive: true });
    carousel.addEventListener("focusin", stopAutoplay);
    carousel.addEventListener("focusout", startAutoplay);

    setActive(0);
    startAutoplay();
  });

  /* ---- Subscribe forms (placeholder pending email-service integration) ---
     These forms aren't wired to a real list yet -- once the chorus has a
     Constant Contact (or similar) account set up, swap the form's action/
     method and fields for that service's real embed and this handler goes
     away. Until then, submitting just swaps in a short note instead of
     posting to nowhere. */
  document.querySelectorAll("[data-subscribe-placeholder]").forEach(function (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (form.dataset.noted) return;
      form.dataset.noted = "true";
      var note = document.createElement("p");
      note.className = "subscribe-form__placeholder-note";
      note.textContent = "Thanks! Sign-ups open soon.";
      form.insertAdjacentElement("afterend", note);
      form.hidden = true;
    });
  });

  /* ---- Safari resize-layout workaround ------------------------------------
     Safari has a known bug where certain CSS Grid layouts (like the card
     grid) can end up miscomputing their track sizes after the browser
     window is resized across a few breakpoints in quick succession -- the
     grid renders oversized and off-center until something forces a fresh
     layout pass (a page reload being the most obvious). Rather than wait for
     the user to refresh, force one ourselves shortly after resizing settles:
     briefly toggling display off/on makes the browser throw away any stale
     cached layout for that element and recompute it from scratch. */
  var reflowTargets = document.querySelectorAll(".card-grid, .footer-grid, .news-grid");
  var reflowTimer = null;
  function forceReflow(el) {
    var prevDisplay = el.style.display;
    el.style.display = "none";
    void el.offsetHeight; /* reading this forces the browser to apply the change synchronously */
    el.style.display = prevDisplay;
  }
  function scheduleReflowFix() {
    clearTimeout(reflowTimer);
    reflowTimer = setTimeout(function () {
      reflowTargets.forEach(forceReflow);
    }, 200);
  }

  /* ---- Give Online modal ---------------------------------------------------
     Opens the donation form in an overlay instead of it sitting inline on
     the page -- same accessible pattern as the leadership bio modal above
     (focus trap, Escape closes, backdrop click closes, focus returns to
     whatever button opened it). A page opts in by including one
     .donate-modal near the end of <body> and giving any button/link that
     should open it the class "js-open-give-modal": today that's the
     "Give Now" button on the Give page, and the "Give Online (Credit
     Card)" row on the Ways to Give page. Does nothing on pages with
     neither. */
  (function () {
    var modal = document.querySelector(".donate-modal");
    if (!modal) return;
    var backdrop = modal.querySelector(".donate-modal__backdrop");
    var closeBtn = modal.querySelector(".donate-modal__close");
    var lastTrigger = null;

    function openModal(trigger) {
      lastTrigger = trigger || null;
      modal.classList.add("is-open");
      modal.setAttribute("aria-hidden", "false");
      document.body.classList.add("modal-open");
      closeBtn.focus();
      document.addEventListener("keydown", onKeydown);
    }

    function closeModal() {
      modal.classList.remove("is-open");
      modal.setAttribute("aria-hidden", "true");
      document.body.classList.remove("modal-open");
      document.removeEventListener("keydown", onKeydown);
      if (lastTrigger) lastTrigger.focus();
    }

    function getFocusable() {
      return Array.prototype.slice
        .call(modal.querySelectorAll('button, a[href], input, [tabindex]:not([tabindex="-1"])'))
        .filter(function (el) { return el.offsetParent !== null && !el.disabled; });
    }

    function onKeydown(e) {
      if (e.key === "Escape") {
        closeModal();
        return;
      }
      if (e.key === "Tab") {
        var focusable = getFocusable();
        if (!focusable.length) return;
        var first = focusable[0];
        var last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    document.querySelectorAll(".js-open-give-modal").forEach(function (trigger) {
      trigger.addEventListener("click", function (e) {
        e.preventDefault();
        openModal(trigger);
      });
    });

    closeBtn.addEventListener("click", closeModal);
    backdrop.addEventListener("click", closeModal);
  })();

  /* ---- Give Online (Stripe) donate form ------------------------------------
     Embeds Stripe's own "Payment Element" directly in this form so donors
     never leave the page -- there is no redirect to a Stripe-hosted
     checkout page. The element itself (card fields, and Apple Pay / Google
     Pay buttons where available and enabled in the Stripe Dashboard) is
     still rendered and entirely controlled by Stripe's own script, so this
     code never sees or touches card details; it only ever talks to our own
     two small Azure Functions to create/update a PaymentIntent (amount +
     metadata) and then asks Stripe.js to confirm it in place. The "Give
     another way" link in the form's note is a plain, always-visible
     fallback straight to a Stripe Payment Link, independent of all of
     this, in case Stripe.js itself fails to load or something else here
     breaks. */
  var DONATE_FEE_PERCENT = 0.022; // DCC's Stripe nonprofit rate for Visa/Mastercard -- covers the large majority of donors; Amex costs more (3.5%) and is deliberately undercollected by this estimate, a gap the DCC absorbs. Keep in sync with api/create-payment-intent + api/update-payment-intent
  var DONATE_FEE_FIXED = 0.3; // Visa/Mastercard's $0.30 fixed per-transaction fee, in dollars (this constant is dollars, not cents -- see its cents-context uses below)

  // Safe to publish -- a Stripe *publishable* key (unlike the secret key)
  // is meant to live in public client-side code. Replace with your real
  // key from the Stripe Dashboard (Developers > API keys).
  var STRIPE_PUBLISHABLE_KEY = "pk_live_51UFcpBHMuZLqWRTPQpqPHmzrcgrDvu6otleQkXa1tIW9c1aW3a1k4XlYH5XgKAsFKGVoRMFpNTStYRYQlqfp1jms00Wt0W1haG";

  // Themes the embedded Payment Element to roughly match the site's own
  // design tokens. This can't reach the exact CSS custom properties above
  // (Stripe renders these fields in its own isolated frames for security),
  // so the hex/font values are repeated here by hand -- if the palette in
  // :root ever changes, update this to match.
  var STRIPE_APPEARANCE = {
    theme: "stripe",
    variables: {
      colorPrimary: "#0B2A4A",
      colorBackground: "#ffffff",
      colorText: "#0c2136",
      colorDanger: "#8a2f2f",
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      borderRadius: "4px",
      spacingUnit: "4px"
    }
  };

  function syncAncestorAccordion(el) {
    var item = el.closest(".accordion__item");
    if (!item || !item.classList.contains("is-open")) return;
    var panel = item.querySelector(".accordion__panel");
    if (panel) panel.style.maxHeight = panel.scrollHeight + "px";
  }

  // One Stripe.js client for the whole page (mounting multiple Payment
  // Elements from it, one per .donate-form, is fine). If Stripe.js failed
  // to load -- blocked network, an ad/tracker blocker, offline testing --
  // stripeClient stays null and every form below falls back to a plainly
  // labeled degraded state rather than a silently broken one.
  var stripeClient = null;
  if (window.Stripe) {
    try {
      stripeClient = window.Stripe(STRIPE_PUBLISHABLE_KEY);
    } catch (e) {
      stripeClient = null;
    }
  }

  document.querySelectorAll(".donate-form").forEach(function (form) {
    var amountButtons = form.querySelectorAll(".donate-amount");
    var customWrap = form.querySelector(".donate-custom-amount");
    var customInput = form.querySelector(".donate-custom-input");
    var coverFeeCheckbox = form.querySelector(".donate-cover-fee");
    var feeEstimateEl = form.querySelector(".donate-fee-estimate");
    var anonymousCheckbox = form.querySelector(".donate-anonymous");
    var tributeInput = form.querySelector(".donate-tribute-input");
    var errorEl = form.querySelector(".donate-form__error");
    var submitBtn = form.querySelector(".donate-submit");
    var paymentContainer = form.querySelector(".donate-payment-element");
    var placeholderEl = form.querySelector(".donate-payment-placeholder");
    var selectedAmount = null; // a number, or "custom"

    function getBaseAmount() {
      if (selectedAmount === "custom") {
        var v = customInput ? parseFloat(customInput.value) : NaN;
        return isFinite(v) && v > 0 ? v : null;
      }
      return selectedAmount;
    }

    function updateFeeEstimate() {
      if (!feeEstimateEl) return;
      var base = getBaseAmount();
      if (base == null) {
        feeEstimateEl.textContent = "an estimated amount";
        return;
      }
      var total = (base + DONATE_FEE_FIXED) / (1 - DONATE_FEE_PERCENT);
      feeEstimateEl.textContent = "$" + (total - base).toFixed(2);
    }

    function showError(msg) {
      if (!errorEl) return;
      errorEl.textContent = msg;
      errorEl.hidden = false;
      syncAncestorAccordion(errorEl);
    }
    function hideError() {
      if (!errorEl) return;
      errorEl.hidden = true;
      errorEl.textContent = "";
      syncAncestorAccordion(errorEl);
    }

    // Amount selection and the fee estimate stay useful even if Stripe.js
    // never loads, so these are wired up unconditionally; scheduleSync is
    // only ever assigned below (to a real function) when Stripe.js loaded,
    // and left null otherwise -- callers always check before using it.
    var scheduleSync = null;

    amountButtons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        amountButtons.forEach(function (b) {
          b.classList.remove("is-selected");
          b.setAttribute("aria-pressed", "false");
        });
        btn.classList.add("is-selected");
        btn.setAttribute("aria-pressed", "true");
        var val = btn.getAttribute("data-amount");
        if (val === "custom") {
          selectedAmount = "custom";
          if (customWrap) {
            customWrap.hidden = false;
            syncAncestorAccordion(customWrap);
          }
          if (customInput) customInput.focus();
        } else {
          selectedAmount = parseFloat(val);
          if (customWrap) {
            customWrap.hidden = true;
            syncAncestorAccordion(customWrap);
          }
        }
        hideError();
        updateFeeEstimate();
        if (scheduleSync) scheduleSync();
      });
    });

    if (customInput) {
      customInput.addEventListener("input", function () {
        selectedAmount = "custom";
        updateFeeEstimate();
        if (scheduleSync) scheduleSync();
      });
    }

    if (coverFeeCheckbox) {
      coverFeeCheckbox.addEventListener("change", function () {
        updateFeeEstimate();
        if (scheduleSync) scheduleSync();
      });
    }

    if (submitBtn) submitBtn.disabled = true; // re-enabled once the Payment Element is ready, or never if Stripe.js is unavailable

    if (!stripeClient) {
      if (placeholderEl) {
        placeholderEl.textContent = "Online payment isn’t available right now — please use “Give another way” below.";
      }
      return; // leave amount selection / fee estimate above working; skip everything Stripe-specific for this form
    }

    var elements = null;
    var paymentIntentId = null;
    var syncTimer = null;
    var syncInFlight = null;
    var creatingIntent = false;
    var lastSyncedCents = null;

    function getFinalAmountCents() {
      var base = getBaseAmount();
      if (base == null) return null;
      var cents = Math.round(base * 100);
      if (coverFeeCheckbox && coverFeeCheckbox.checked) {
        cents = Math.round((cents + DONATE_FEE_FIXED * 100) / (1 - DONATE_FEE_PERCENT));
      }
      return cents;
    }

    function currentPayload() {
      return {
        amount: getBaseAmount(),
        tribute: tributeInput ? tributeInput.value : "",
        anonymous: !!(anonymousCheckbox && anonymousCheckbox.checked),
        coverFee: !!(coverFeeCheckbox && coverFeeCheckbox.checked)
      };
    }

    function mountPaymentElement(clientSecret) {
      elements = stripeClient.elements({ clientSecret: clientSecret, appearance: STRIPE_APPEARANCE });
      var paymentElement = elements.create("payment");
      paymentElement.mount(paymentContainer);
      paymentElement.on("ready", function () {
        if (placeholderEl) placeholderEl.hidden = true;
        paymentContainer.hidden = false;
        if (submitBtn) submitBtn.disabled = false;
        syncAncestorAccordion(paymentContainer);
      });
      paymentElement.on("change", function () {
        syncAncestorAccordion(paymentContainer);
      });
    }

    function runSync() {
      var cents = getFinalAmountCents();
      if (cents == null || cents < 500) return Promise.resolve(); // not enough info yet
      if (cents === lastSyncedCents && paymentIntentId) return Promise.resolve(); // nothing changed since the last sync

      var payload = currentPayload();

      if (!paymentIntentId) {
        if (creatingIntent) return syncInFlight || Promise.resolve();
        creatingIntent = true;
        syncInFlight = fetch("/api/create-payment-intent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        })
          .then(function (res) {
            return res.json().catch(function () { return {}; }).then(function (data) { return { ok: res.ok, data: data }; });
          })
          .then(function (result) {
            creatingIntent = false;
            if (!result.ok || !result.data || !result.data.clientSecret) {
              showError((result.data && result.data.error) || "Something went wrong setting up the payment. Please try again, or use “Give another way” below.");
              return;
            }
            paymentIntentId = result.data.paymentIntentId;
            lastSyncedCents = cents;
            mountPaymentElement(result.data.clientSecret);
            // The donor may have changed the amount again while this request
            // was in flight -- catch up with one more sync if so.
            if (getFinalAmountCents() !== lastSyncedCents) scheduleSync();
          })
          .catch(function () {
            creatingIntent = false;
            showError("We couldn’t reach the giving system. Please check your connection and try again, or use “Give another way” below.");
          });
        return syncInFlight;
      }

      syncInFlight = fetch("/api/update-payment-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentIntentId: paymentIntentId,
          amount: payload.amount,
          tribute: payload.tribute,
          anonymous: payload.anonymous,
          coverFee: payload.coverFee
        })
      })
        .then(function (res) {
          return res.json().catch(function () { return {}; }).then(function (data) { return { ok: res.ok, data: data }; });
        })
        .then(function (result) {
          if (!result.ok || !result.data) {
            showError((result.data && result.data.error) || "Something went wrong updating the payment. Please try again, or use “Give another way” below.");
            return;
          }
          lastSyncedCents = cents;
          if (elements) elements.update({ amount: cents });
          if (getFinalAmountCents() !== lastSyncedCents) scheduleSync();
        })
        .catch(function () {
          showError("We couldn’t reach the giving system. Please check your connection and try again, or use “Give another way” below.");
        });
      return syncInFlight;
    }

    scheduleSync = function () {
      hideError();
      clearTimeout(syncTimer);
      syncTimer = setTimeout(runSync, 600);
    };

    function flushSync() {
      clearTimeout(syncTimer);
      return runSync();
    }

    if (tributeInput) tributeInput.addEventListener("input", scheduleSync);
    if (anonymousCheckbox) anonymousCheckbox.addEventListener("change", scheduleSync);

    function resetSubmitButton() {
      if (!submitBtn) return;
      submitBtn.disabled = false;
      submitBtn.classList.remove("is-loading");
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      hideError();

      var base = getBaseAmount();
      if (base == null || base < 5) {
        showError("Please choose or enter an amount of at least $5.");
        return;
      }

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.classList.add("is-loading");
      }

      flushSync().then(function () {
        if (!elements || !paymentIntentId) {
          showError("Please choose an amount to continue.");
          resetSubmitButton();
          return;
        }

        elements.submit().then(function (submitResult) {
          if (submitResult && submitResult.error) {
            showError(submitResult.error.message || "Please check the payment details above and try again.");
            resetSubmitButton();
            return;
          }

          var returnUrl = window.location.origin + "/thank-you.html";

          stripeClient
            .confirmPayment({
              elements: elements,
              confirmParams: { return_url: returnUrl },
              redirect: "if_required"
            })
            .then(function (result) {
              if (result.error) {
                showError(result.error.message || "Something went wrong processing your payment. Please try again, or use “Give another way” below.");
                resetSubmitButton();
                return;
              }
              window.location.href = returnUrl;
            })
            .catch(function () {
              showError("Something went wrong processing your payment. Please try again, or use “Give another way” below.");
              resetSubmitButton();
            });
        });
      });
    });
  });

  if (reflowTargets.length) {
    window.addEventListener("resize", scheduleReflowFix);
  }

})();

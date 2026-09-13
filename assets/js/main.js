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
     anyone who has reduced motion turned on. */
  document.querySelectorAll(".quote-carousel").forEach(function (carousel) {
    var track = carousel.querySelector(".quote-carousel__track");
    var slides = track ? Array.prototype.slice.call(track.children) : [];
    var dotsWrap = carousel.querySelector(".quote-carousel__dots");
    var prevBtn = carousel.querySelector(".quote-carousel__arrow--prev");
    var nextBtn = carousel.querySelector(".quote-carousel__arrow--next");
    if (!track || slides.length < 2) return;

    var prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var current = 0;

    var dots = slides.map(function (_, i) {
      var dot = document.createElement("button");
      dot.type = "button";
      dot.className = "quote-carousel__dot";
      dot.setAttribute("aria-label", "Show quote " + (i + 1) + " of " + slides.length);
      dot.addEventListener("click", function () {
        goTo(i);
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
    function animateScrollTo(el, target) {
      var startX = el.scrollLeft;
      var change = target - startX;
      if (!change) return;
      // CSS scroll-snap fights a manually-driven scroll -- Chromium defers
      // applying in-between positions until the snap "settles," which turns
      // an eased animation into a stuck-then-jump. Suspend snapping only for
      // the duration of this animation, then hand it back for native
      // drag/swipe.
      el.style.scrollSnapType = "none";
      var startTime = null;
      function step(timestamp) {
        if (startTime === null) startTime = timestamp;
        var progress = Math.min((timestamp - startTime) / SLIDE_DURATION, 1);
        el.scrollLeft = startX + change * easeInOutCubic(progress);
        if (progress < 1) {
          requestAnimationFrame(step);
        } else {
          el.style.scrollSnapType = "";
        }
      }
      requestAnimationFrame(step);
    }

    function goTo(i) {
      var idx = (i + slides.length) % slides.length;
      var target = slides[idx].offsetLeft;
      if (prefersReducedMotion) {
        track.scrollLeft = target;
      } else {
        animateScrollTo(track, target);
      }
    }

    prevBtn.addEventListener("click", function () {
      goTo(current - 1);
      restartAutoplay();
    });
    nextBtn.addEventListener("click", function () {
      goTo(current + 1);
      restartAutoplay();
    });

    // Keep the dots in sync when someone drags/swipes the track directly.
    var syncTimer = null;
    track.addEventListener("scroll", function () {
      clearTimeout(syncTimer);
      syncTimer = setTimeout(function () {
        var trackLeft = track.getBoundingClientRect().left;
        var closest = 0;
        var closestDist = Infinity;
        slides.forEach(function (slide, i) {
          var dist = Math.abs(slide.getBoundingClientRect().left - trackLeft);
          if (dist < closestDist) {
            closestDist = dist;
            closest = i;
          }
        });
        setActive(closest);
      }, 100);
    });

    var autoplayTimer = null;
    function startAutoplay() {
      if (prefersReducedMotion) return;
      stopAutoplay();
      autoplayTimer = setInterval(function () {
        goTo(current + 1);
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
  if (reflowTargets.length) {
    window.addEventListener("resize", scheduleReflowFix);
  }

})();

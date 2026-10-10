/* ============================================================================
   Family Portal season calendar (family-portal.html)

   Loads the season schedule from /api/family-schedule (only answers logged-in
   families; the data comes from the "Schedule" tab of the Google Sheet) and
   draws it as a calendar:
     - wide screens: every month of the season at once, like a printed
       year-at-a-glance calendar
     - phones: one month at a time with previous / next arrows
   Days with events are highlighted; tapping one opens a small bubble with the
   details. Chips above the calendar filter by choir (the choice is remembered
   on that device). All text from the schedule is inserted with textContent.
   ========================================================================= */
(function () {
  "use strict";

  var CHOIRS = { training: "Training Choir", symphonic: "Symphonic Voices", mixed: "Mixed Ensemble" };
  var MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  var DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  var TYPE_LABEL = { rehearsal: "Rehearsal", concert: "Concert", other: "Event" };
  var PREF_KEY = "dccFamilyChoirs";

  var root, statusEl, monthsEl, navEl, navTitleEl, prevBtn, nextBtn, upNextEl, upNextList;
  var bubble, bubbleTitle, bubbleBody, bubbleClose, lastTrigger = null;
  var events = [], months = [], current = 0, selected = {};
  var wired = false;

  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function ymd(y, m, d) { return y + "-" + pad(m + 1) + "-" + pad(d); }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function parseYmd(s) {
    var p = s.split("-");
    return new Date(+p[0], +p[1] - 1, +p[2]);
  }
  function longDate(s) {
    var d = parseYmd(s);
    return DAY_NAMES[d.getDay()] + ", " + MONTH_NAMES[d.getMonth()] + " " + d.getDate();
  }
  function todayStr() {
    var n = new Date();
    return ymd(n.getFullYear(), n.getMonth(), n.getDate());
  }

  function loadPrefs() {
    selected = { training: true, symphonic: true, mixed: true };
    try {
      var raw = localStorage.getItem(PREF_KEY);
      if (!raw) return;
      var arr = JSON.parse(raw);
      if (Array.isArray(arr) && arr.length) {
        selected = { training: false, symphonic: false, mixed: false };
        arr.forEach(function (k) { if (k in selected) selected[k] = true; });
        if (!selected.training && !selected.symphonic && !selected.mixed) {
          selected = { training: true, symphonic: true, mixed: true };
        }
      }
    } catch (e) { /* ignore */ }
  }
  function savePrefs() {
    try {
      localStorage.setItem(PREF_KEY, JSON.stringify(Object.keys(selected).filter(function (k) { return selected[k]; })));
    } catch (e) { /* ignore */ }
  }

  function visible(ev) {
    if (ev.choirs.indexOf("all") !== -1) return true;
    return ev.choirs.some(function (c) { return selected[c]; });
  }

  function choirLabel(ev) {
    if (ev.choirs.indexOf("all") !== -1) return "All choirs";
    return ev.choirs.map(function (c) { return CHOIRS[c]; }).join(", ");
  }

  function timeLabel(ev) {
    if (ev.start && ev.end) return ev.start + " – " + ev.end;
    return ev.start || "";
  }

  function byDate() {
    var map = {};
    events.filter(visible).forEach(function (ev) { (map[ev.date] = map[ev.date] || []).push(ev); });
    return map;
  }

  /* ---- Rendering ------------------------------------------------------- */
  function buildMonthList() {
    months = [];
    if (!events.length) return;
    var first = parseYmd(events[0].date), last = parseYmd(events[events.length - 1].date);
    var y = first.getFullYear(), m = first.getMonth();
    while (y < last.getFullYear() || (y === last.getFullYear() && m <= last.getMonth())) {
      months.push({ y: y, m: m });
      m++; if (m > 11) { m = 0; y++; }
    }
  }

  function pickStartMonth() {
    var t = new Date(), idx = -1;
    months.forEach(function (mo, i) { if (mo.y === t.getFullYear() && mo.m === t.getMonth()) idx = i; });
    if (idx !== -1) return idx;
    // Outside the season: show the next month with events (or the first month).
    var today = todayStr();
    for (var i = 0; i < events.length; i++) {
      if (events[i].date >= today) {
        var d = parseYmd(events[i].date);
        for (var j = 0; j < months.length; j++) if (months[j].y === d.getFullYear() && months[j].m === d.getMonth()) return j;
      }
    }
    return 0;
  }

  function render() {
    closeBubble();
    var map = byDate();
    var today = todayStr();
    monthsEl.textContent = "";

    months.forEach(function (mo, i) {
      var box = el("section", "cal-month" + (i === current ? " is-current" : ""));
      box.setAttribute("aria-label", MONTH_NAMES[mo.m] + " " + mo.y);
      box.appendChild(el("h3", "cal-month__title", MONTH_NAMES[mo.m] + " " + mo.y));

      var grid = el("div", "cal-grid");
      ["S", "M", "T", "W", "T", "F", "S"].forEach(function (d, k) {
        var h = el("div", "cal-grid__dow", d);
        h.setAttribute("aria-hidden", "true");
        grid.appendChild(h);
      });

      var firstDow = new Date(mo.y, mo.m, 1).getDay();
      var days = new Date(mo.y, mo.m + 1, 0).getDate();
      for (var b = 0; b < firstDow; b++) grid.appendChild(el("div", "cal-grid__blank"));

      for (var d = 1; d <= days; d++) {
        var key = ymd(mo.y, mo.m, d);
        var list = map[key];
        var isToday = key === today;
        if (list && list.length) {
          var top = list.some(function (e) { return e.type === "concert"; }) ? "concert"
                  : list.some(function (e) { return e.type === "rehearsal"; }) ? "rehearsal" : "other";
          var btn = el("button", "cal-day cal-day--" + top + (isToday ? " is-today" : ""), String(d));
          btn.type = "button";
          btn.setAttribute("data-date", key);
          btn.setAttribute("aria-haspopup", "dialog");
          btn.setAttribute("aria-label", longDate(key) + ": " + list.length + (list.length === 1 ? " event" : " events"));
          grid.appendChild(btn);
        } else {
          var plain = el("div", "cal-day cal-day--none" + (isToday ? " is-today" : ""), String(d));
          grid.appendChild(plain);
        }
      }
      box.appendChild(grid);
      monthsEl.appendChild(box);
    });

    updateNav();
    renderUpNext();
  }

  function updateNav() {
    if (!months.length) return;
    var mo = months[current];
    navTitleEl.textContent = MONTH_NAMES[mo.m] + " " + mo.y;
    prevBtn.disabled = current === 0;
    nextBtn.disabled = current === months.length - 1;
    var boxes = monthsEl.querySelectorAll(".cal-month");
    for (var i = 0; i < boxes.length; i++) boxes[i].classList.toggle("is-current", i === current);
  }

  function renderUpNext() {
    var today = todayStr();
    var groups = [], seen = {};
    events.forEach(function (e) {
      if (!visible(e) || e.date < today) return;
      if (!seen[e.date]) {
        if (groups.length === 3) { seen[e.date] = "skip"; return; }
        seen[e.date] = { date: e.date, list: [] };
        groups.push(seen[e.date]);
      }
      if (seen[e.date] !== "skip") seen[e.date].list.push(e);
    });
    upNextList.textContent = "";
    if (!groups.length) { upNextEl.hidden = true; return; }
    groups.forEach(function (g) {
      var li = el("li", "cal-up");
      li.appendChild(el("span", "cal-up__date", longDate(g.date)));
      g.list.forEach(function (ev) {
        var row = el("span", "cal-up__row cal-up__row--" + ev.type);
        var line = ev.title;
        var t = timeLabel(ev);
        if (t) line += " \u00b7 " + t;
        row.appendChild(el("span", "cal-up__title", line));
        if (ev.choirs.indexOf("all") === -1) row.appendChild(el("span", "cal-up__who", choirLabel(ev)));
        li.appendChild(row);
      });
      upNextList.appendChild(li);
    });
    upNextEl.hidden = false;
  }

  /* ---- Details bubble -------------------------------------------------- */
  function openBubble(btn) {
    var key = btn.getAttribute("data-date");
    var list = byDate()[key] || [];
    lastTrigger = btn;
    bubbleTitle.textContent = longDate(key);
    bubbleBody.textContent = "";
    list.forEach(function (ev) {
      var item = el("div", "cal-ev cal-ev--" + ev.type);
      item.appendChild(el("span", "cal-ev__tag", TYPE_LABEL[ev.type]));
      item.appendChild(el("strong", "cal-ev__title", ev.title));
      var t = timeLabel(ev);
      if (t) item.appendChild(el("span", "cal-ev__line", t));
      item.appendChild(el("span", "cal-ev__line", choirLabel(ev)));
      if (ev.location) item.appendChild(el("span", "cal-ev__line", ev.location));
      if (ev.notes) item.appendChild(el("span", "cal-ev__notes", ev.notes));
      bubbleBody.appendChild(item);
    });
    bubble.hidden = false;
    positionBubble(btn);
    bubbleClose.focus({ preventScroll: true });
  }

  function positionBubble(btn) {
    bubble.style.left = ""; bubble.style.top = "";
    if (window.matchMedia("(max-width: 640px)").matches) return; // CSS makes it a bottom sheet
    var host = root.getBoundingClientRect();
    var r = btn.getBoundingClientRect();
    var w = bubble.offsetWidth, h = bubble.offsetHeight;
    var left = r.left - host.left + r.width / 2 - w / 2;
    left = Math.max(0, Math.min(left, host.width - w));
    var top = r.bottom - host.top + 8;
    // Flip above the day if it would run off the bottom of the viewport.
    if (r.bottom + 8 + h > window.innerHeight && r.top - 8 - h > 0) top = r.top - host.top - h - 8;
    bubble.style.left = left + "px";
    bubble.style.top = top + "px";
  }

  function closeBubble() {
    if (!bubble || bubble.hidden) return;
    bubble.hidden = true;
    if (lastTrigger && document.body.contains(lastTrigger)) lastTrigger.focus({ preventScroll: true });
    lastTrigger = null;
  }

  /* ---- Wiring ---------------------------------------------------------- */
  function wire() {
    if (wired) return;
    wired = true;

    root.querySelectorAll(".cal__chip").forEach(function (chip) {
      chip.addEventListener("click", function () {
        var k = chip.getAttribute("data-choir");
        var onCount = Object.keys(selected).filter(function (x) { return selected[x]; }).length;
        if (selected[k] && onCount === 1) return; // always keep at least one choir showing
        selected[k] = !selected[k];
        chip.classList.toggle("is-on", selected[k]);
        chip.setAttribute("aria-pressed", selected[k] ? "true" : "false");
        savePrefs();
        render();
      });
    });

    monthsEl.addEventListener("click", function (e) {
      var btn = e.target.closest ? e.target.closest(".cal-day[data-date]") : null;
      if (!btn) return;
      if (!bubble.hidden && lastTrigger === btn) { closeBubble(); return; }
      openBubble(btn);
    });

    bubbleClose.addEventListener("click", closeBubble);
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeBubble(); });
    document.addEventListener("click", function (e) {
      if (bubble.hidden) return;
      if (bubble.contains(e.target)) return;
      if (e.target.closest && e.target.closest(".cal-day[data-date]")) return;
      closeBubble();
    });
    window.addEventListener("resize", function () { if (!bubble.hidden && lastTrigger) positionBubble(lastTrigger); });

    prevBtn.addEventListener("click", function () { if (current > 0) { current--; closeBubble(); updateNav(); } });
    nextBtn.addEventListener("click", function () { if (current < months.length - 1) { current++; closeBubble(); updateNav(); } });
  }

  function setStatus(text) {
    statusEl.textContent = text || "";
    statusEl.hidden = !text;
  }

  function load(token, onSessionEnded) {
    root = document.getElementById("family-calendar");
    if (!root) return;
    statusEl = document.getElementById("cal-status");
    monthsEl = document.getElementById("cal-months");
    navEl = document.getElementById("cal-nav");
    navTitleEl = document.getElementById("cal-nav-title");
    prevBtn = document.getElementById("cal-prev");
    nextBtn = document.getElementById("cal-next");
    upNextEl = document.getElementById("cal-upnext");
    upNextList = document.getElementById("cal-upnext-list");
    bubble = document.getElementById("cal-bubble");
    bubbleTitle = document.getElementById("cal-bubble-title");
    bubbleBody = document.getElementById("cal-bubble-body");
    bubbleClose = document.getElementById("cal-bubble-close");

    loadPrefs();
    root.querySelectorAll(".cal__chip").forEach(function (chip) {
      var k = chip.getAttribute("data-choir");
      chip.classList.toggle("is-on", !!selected[k]);
      chip.setAttribute("aria-pressed", selected[k] ? "true" : "false");
    });
    wire();
    setStatus("Loading the season schedule…");

    fetch("/api/family-schedule", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: token })
    })
      .then(function (r) {
        if (r.status === 401) { if (onSessionEnded) onSessionEnded(); return null; }
        if (!r.ok) throw new Error("bad status");
        return r.json();
      })
      .then(function (data) {
        if (!data) return;
        events = Array.isArray(data.events) ? data.events : [];
        buildMonthList();
        if (!events.length) {
          monthsEl.textContent = "";
          navEl.hidden = true;
          upNextEl.hidden = true;
          setStatus("The season schedule will appear here once it has been posted. Questions? Email chorus@dalcc.org.");
          return;
        }
        current = pickStartMonth();
        setStatus("");
        navEl.hidden = false;
        render();
      })
      .catch(function () {
        setStatus("We couldn’t load the schedule just now. Please refresh the page in a moment, or email chorus@dalcc.org.");
      });
  }

  window.DCCFamilyCalendar = { load: load };
})();

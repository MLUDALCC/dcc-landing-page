/* ============================================================================
   Performances page data + rendering (performances.html)

   Every performance -- upcoming or past -- lives in the PERFORMANCES list
   below. Nothing needs to be moved by hand: on each visit the page compares
   today's date with each performance's date and sorts it into either
   "Upcoming Performances" (until the end of its last day) or the "Past
   Performances" archive, which is grouped by concert season.

   Seasons run August 1 - July 31 (e.g. "2026/27" covers August 1, 2026
   through July 31, 2027). This is deliberately not the DCC fiscal year
   (June 1 - May 31) so that summer performances stay with the season they
   belong to. A season button appears automatically the first time a past
   performance falls in it. To override a performance's season, add
   season: "2025/26" to its entry.

   Fields
     startDate   "YYYY-MM-DD" -- first (or only) performance day
     endDate     optional "YYYY-MM-DD" -- last day of a multi-day run; the
                 performance counts as upcoming through this day
     title       card heading
     tag         short line beside the heading (dates · time · choir)
     desc        sentence(s) shown while the performance is upcoming
     pastDesc    optional -- same, in the past tense, shown once it's over
                 (falls back to desc)
     facts       [["Label", "Value"], ...] -- the grey facts box; use "\n"
                 inside a value for a line break (e.g. an address)
     badge       optional label shown above an upcoming card (e.g. "Tickets
                 On Sale Now")
     note        optional line under an upcoming card's facts
     noteLink    optional { label, href } link under an upcoming card's facts
     ctas        optional buttons while upcoming: { label, href }  (open in a
                 new tab -- for ticket links)
     pastCtas    optional buttons once past: { label, href }  (same tab -- for
                 links within this site, e.g. the Media page)
   ========================================================================= */
(function () {
  "use strict";

  var PERFORMANCES = [
    {
      startDate: "2026-04-19",
      title: "DSCC Spring Concert",
      tag: "April 19, 2026 · All Choirs",
      desc: "All three choruses closed out the 2025/26 season together at the Morton H. Meyerson Symphony Center, marking the ensemble’s fourth season of concerts.",
      facts: [
        ["Date", "April 19, 2026"],
        ["Choirs", "All Choirs"],
        ["Location", "Morton H. Meyerson Symphony Center"],
        ["Address", "2301 Flora Street\nDallas, TX 75201"]
      ]
    },
    {
      startDate: "2026-05-15",
      endDate: "2026-05-17",
      title: "Mahler’s Symphony No. 8",
      tag: "May 15, 16 & 17, 2026 · Symphonic Voices",
      desc: "Symphonic Voices joined the Dallas Symphony Orchestra, the Dallas Symphony Chorus, and the Baltimore Choral Arts Society for three performances of Mahler’s Symphony No. 8 at the Morton H. Meyerson Symphony Center.",
      facts: [
        ["Dates", "May 15, 16 & 17, 2026"],
        ["Choir", "Symphonic Voices"],
        ["With", "Dallas Symphony Orchestra, Dallas Symphony Chorus & Baltimore Choral Arts Society"],
        ["Location", "Morton H. Meyerson Symphony Center"],
        ["Address", "2301 Flora Street\nDallas, TX 75201"]
      ]
    },
    {
      startDate: "2026-08-28",
      title: "Performance with Foreigner",
      tag: "August 28, 2026 · 6:30 PM · Symphonic Voices",
      desc: "Symphonic Voices joined the rock band Foreigner on stage at Fair Park’s Dos Equis Pavilion, performing the band’s hit “I Want to Know What Love Is.”",
      facts: [
        ["Date", "August 28, 2026"],
        ["Time", "6:30 PM"],
        ["Choir", "Symphonic Voices"],
        ["Location", "Dos Equis Pavilion, Fair Park"]
      ],
      pastCtas: [{ label: "Watch the Video", href: "media.html" }]
    },
    {
      startDate: "2026-11-01",
      title: "DSCC Fall Concert",
      tag: "November 1, 2026 · 7:30 PM · All Choirs",
      badge: "Tickets On Sale Now",
      desc: "All three DSCC choruses open the season together at the Morton H. Meyerson Symphony Center, marking the ensemble’s fifth season of concerts.",
      pastDesc: "All three DSCC choruses opened the season together at the Morton H. Meyerson Symphony Center, marking the ensemble’s fifth season of concerts.",
      facts: [
        ["Date", "November 1, 2026"],
        ["Time", "7:30 PM"],
        ["Choirs", "All Choirs"],
        ["Location", "Morton H. Meyerson Symphony Center"],
        ["Address", "2301 Flora Street\nDallas, TX 75201"]
      ],
      note: "Tickets are $30 per seat.",
      ctas: [{ label: "Buy Tickets", href: "https://www.dallassymphony.org/productions/dscc-fall-concert-2026/" }]
    },
    {
      startDate: "2026-12-12",
      endDate: "2026-12-20",
      title: "Holidays with the DSO",
      tag: "December 12, 13, 19 & 20, 2026 · Symphonic Voices",
      desc: "Symphonic Voices joins the Dallas Symphony Orchestra and the Dallas Symphony Chorus for this beloved holiday tradition at the Morton H. Meyerson Symphony Center.",
      pastDesc: "Symphonic Voices joined the Dallas Symphony Orchestra and the Dallas Symphony Chorus for this beloved holiday tradition at the Morton H. Meyerson Symphony Center.",
      facts: [
        ["Dates", "December 12, 13, 19 & 20, 2026"],
        ["Choir", "Symphonic Voices"],
        ["With", "Dallas Symphony Orchestra & Dallas Symphony Chorus"],
        ["Location", "Morton H. Meyerson Symphony Center"],
        ["Address", "2301 Flora Street\nDallas, TX 75201"]
      ],
      noteLink: { label: "Reserve Tickets", href: "https://www.dallassymphony.org/productions/holidays-with-the-dso-subs-2026/" }
    },
    {
      startDate: "2026-12-12",
      title: "Performance at the Thompson Dallas Hotel",
      tag: "December 12, 2026 · Mixed Ensemble",
      desc: "Mixed Ensemble performs at a private corporate holiday event at the Thompson Dallas Hotel.",
      pastDesc: "Mixed Ensemble performed at a private corporate holiday event at the Thompson Dallas Hotel.",
      facts: [
        ["Date", "December 12, 2026"],
        ["Choir", "Mixed Ensemble"],
        ["Location", "Thompson Dallas Hotel"],
        ["Address", "205 N Akard St\nDallas, TX 75201"],
        ["Event Type", "Private Corporate Event"]
      ]
    },
    {
      startDate: "2026-12-13",
      title: "Performance at Shiloh Missionary Baptist Church",
      tag: "December 13, 2026 · Training Choir",
      desc: "Training Choir joins a worship service at Shiloh Missionary Baptist Church in Plano, where Victor Johnson serves as music director.",
      pastDesc: "Training Choir joined a worship service at Shiloh Missionary Baptist Church in Plano, where Victor Johnson serves as music director.",
      facts: [
        ["Date", "December 13, 2026"],
        ["Choir", "Training Choir"],
        ["Location", "Shiloh Missionary Baptist Church"],
        ["Address", "920 14th Street\nPlano, TX 75074"]
      ]
    },
    {
      startDate: "2027-05-02",
      title: "DSCC Spring Concert",
      tag: "May 2, 2027 · 7:30 PM · All Choirs",
      badge: "Tickets On Sale Now",
      desc: "All three DSCC choruses close out the season together at the Morton H. Meyerson Symphony Center, marking the ensemble’s fifth season of concerts.",
      pastDesc: "All three DSCC choruses closed out the season together at the Morton H. Meyerson Symphony Center, marking the ensemble’s fifth season of concerts.",
      facts: [
        ["Date", "May 2, 2027"],
        ["Time", "7:30 PM"],
        ["Choirs", "All Choirs"],
        ["Location", "Morton H. Meyerson Symphony Center"],
        ["Address", "2301 Flora Street\nDallas, TX 75201"]
      ],
      note: "Tickets are $30 per seat.",
      ctas: [{ label: "Buy Tickets", href: "https://www.dallassymphony.org/productions/dscc-spring-concert-2027/" }]
    }
  ];

  /* ---- helpers --------------------------------------------------------- */
  function pad(n) { return (n < 10 ? "0" : "") + n; }

  // Visitor's local calendar date as "YYYY-MM-DD" (a performance stays
  // "upcoming" through the whole of its last day).
  function todayString() {
    var d = new Date();
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }

  // Season label for a date string: Aug 1 starts a new season.
  function seasonOfDate(dateStr) {
    var y = Number(dateStr.slice(0, 4));
    var m = Number(dateStr.slice(5, 7));
    var start = m >= 8 ? y : y - 1;
    return start + "/" + pad((start + 1) % 100);
  }
  function seasonOf(item) { return item.season || seasonOfDate(item.startDate); }
  function lastDay(item) { return item.endDate || item.startDate; }

  function el(tag, className, text) {
    var e = document.createElement(tag);
    if (className) e.className = className;
    if (text !== undefined) e.textContent = text;
    return e;
  }

  function cardTemplate(item, isPast, headingClass) {
    var card = el("div", "program-card");

    if (!isPast && item.badge) {
      card.appendChild(el("span", "status-badge status-badge--accent", item.badge));
    }

    var head = el("div", "program-card__head");
    head.appendChild(el("h3", headingClass, item.title));
    head.appendChild(el("span", "program-card__tag", item.tag));
    card.appendChild(head);

    card.appendChild(el("p", "body-text", isPast && item.pastDesc ? item.pastDesc : item.desc));

    // The facts box is for planning (dates, times, address), so it only shows
    // on upcoming cards; past cards keep the heading line and description.
    if (!isPast && item.facts && item.facts.length) {
      var dl = el("dl", "program-facts");
      item.facts.forEach(function (fact) {
        var row = document.createElement("div");
        row.appendChild(el("dt", "", fact[0]));
        var dd = document.createElement("dd");
        fact[1].split("\n").forEach(function (line, i) {
          if (i) dd.appendChild(document.createElement("br"));
          dd.appendChild(document.createTextNode(line));
        });
        row.appendChild(dd);
        dl.appendChild(row);
      });
      card.appendChild(dl);
    }

    if (!isPast) {
      if (item.note) card.appendChild(el("p", "program-note", item.note));
      if (item.noteLink) {
        var np = el("p", "program-note");
        var na = el("a", "", item.noteLink.label);
        na.href = item.noteLink.href;
        np.appendChild(na);
        card.appendChild(np);
      }
    }

    var ctas = isPast ? item.pastCtas : item.ctas;
    if (ctas && ctas.length) {
      var row2 = el("div", "btn-row mt-sm");
      ctas.forEach(function (cta) {
        var a = el("a", "btn btn--accent");
        a.href = cta.href;
        a.appendChild(document.createTextNode(cta.label));
        if (!isPast) {
          // Ticket links leave the site: new tab, arrow icon, and a
          // screen-reader note, matching the other external buttons.
          a.className = "btn btn--accent btn--external";
          a.target = "_blank";
          a.rel = "noopener noreferrer";
          a.appendChild(el("span", "visually-hidden", " (opens in a new tab)"));
          var svgNS = "http://www.w3.org/2000/svg";
          var svg = document.createElementNS(svgNS, "svg");
          svg.setAttribute("viewBox", "0 0 16 16");
          svg.setAttribute("fill", "none");
          var path = document.createElementNS(svgNS, "path");
          path.setAttribute("d", "M5 11 11 5M11 5H6M11 5v5");
          path.setAttribute("stroke", "currentColor");
          path.setAttribute("stroke-width", "1.4");
          path.setAttribute("stroke-linecap", "round");
          path.setAttribute("stroke-linejoin", "round");
          svg.appendChild(path);
          a.appendChild(svg);
        }
        row2.appendChild(a);
      });
      card.appendChild(row2);
    }
    return card;
  }

  document.addEventListener("DOMContentLoaded", function () {
    var today = todayString();
    var upcoming = PERFORMANCES
      .filter(function (p) { return lastDay(p) >= today; })
      .sort(function (a, b) { return a.startDate < b.startDate ? -1 : a.startDate > b.startDate ? 1 : 0; });
    var past = PERFORMANCES.filter(function (p) { return lastDay(p) < today; });

    /* ---- Upcoming ----------------------------------------------------- */
    var upcomingEl = document.querySelector(".perf-upcoming");
    var seasonEyebrow = document.querySelector(".perf-season-eyebrow");
    if (seasonEyebrow) seasonEyebrow.textContent = seasonOfDate(today) + " Season";
    if (upcomingEl) {
      if (upcoming.length) {
        upcoming.forEach(function (item) { upcomingEl.appendChild(cardTemplate(item, false, "h2")); });
      } else {
        upcomingEl.appendChild(el("p", "news-empty", "Our next performances will be announced soon. Check the News page for updates."));
      }
    }

    /* ---- Past, grouped by season -------------------------------------- */
    var seasonListEl = document.querySelector(".perf-year-list");
    var listEl = document.querySelector(".perf-list");
    if (!seasonListEl || !listEl) return;

    var seasons = [];
    past.forEach(function (item) {
      var s = seasonOf(item);
      if (seasons.indexOf(s) === -1) seasons.push(s);
    });
    seasons.sort().reverse(); // "2026/27" > "2025/26"

    if (!seasons.length) {
      listEl.appendChild(el("p", "news-empty", "Past performances will be listed here."));
      return;
    }

    seasons.forEach(function (season) {
      var count = past.filter(function (i) { return seasonOf(i) === season; }).length;
      var btn = el("button", "year-list__btn");
      btn.type = "button";
      btn.setAttribute("data-season", season);
      btn.setAttribute("aria-pressed", "false");
      btn.innerHTML = "<span>" + season + "</span><span class=\"year-list__count\">" + count + "</span>";
      btn.addEventListener("click", function () { selectSeason(season); });
      seasonListEl.appendChild(btn);
    });

    function selectSeason(season) {
      var buttons = seasonListEl.querySelectorAll(".year-list__btn");
      for (var i = 0; i < buttons.length; i++) {
        var isActive = buttons[i].getAttribute("data-season") === season;
        buttons[i].classList.toggle("is-active", isActive);
        buttons[i].setAttribute("aria-pressed", isActive ? "true" : "false");
      }
      var items = past
        .filter(function (p) { return seasonOf(p) === season; })
        .sort(function (a, b) { return a.startDate < b.startDate ? 1 : a.startDate > b.startDate ? -1 : 0; });
      listEl.innerHTML = "";
      items.forEach(function (item) { listEl.appendChild(cardTemplate(item, true, "program-card__title")); });
    }

    selectSeason(seasons[0]);
  });
})();

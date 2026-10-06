/* ============================================================================
   News page data + rendering (news.html)

   To add a new announcement, add one object to NEWS_ITEMS below -- everything
   else (the year sidebar, counts, and card markup) is generated from this
   list automatically. Newest-first within a year isn't required; items are
   sorted by date automatically as long as the "date" string is written so it
   sorts correctly, which is why each one also carries a plain ISO "sortDate".

   Replace these placeholder entries with the DCC's real announcements.
   ========================================================================= */
(function () {
  "use strict";

  var NEWS_ITEMS = [
    {
      year: 2026,
      date: "October 2026",
      sortDate: "2026-10-01",
      title: "Fall and Spring Concert Tickets Now on Sale",
      blurb: "Tickets are now on sale for both of the Dallas Symphony Children's Chorus's Meyerson Symphony Center concerts this season. The DSCC Fall Concert takes place November 1, 2026, with all three choruses — Training Choir, Symphonic Voices, and Mixed Ensemble — opening the 2026/27 season together. The DSCC Spring Concert follows on May 2, 2027, when the same three choruses return to close out the season. Both concerts begin at 7:30 PM at the Morton H. Meyerson Symphony Center. Tickets are $30 per seat and can be purchased directly through the Dallas Symphony Orchestra's website using the links below.",
      ctas: [
        { label: "Buy Fall Concert Tickets", href: "https://www.dallassymphony.org/productions/dscc-fall-concert-2026/" },
        { label: "Buy Spring Concert Tickets", href: "https://www.dallassymphony.org/productions/dscc-spring-concert-2027/" }
      ]
    },
    {
      year: 2026,
      date: "August 28, 2026",
      sortDate: "2026-08-28",
      title: "Choristers Join Foreigner at Fair Park",
      blurb: "Symphonic Voices took the stage with the rock band Foreigner at the Dos Equis Pavilion, performing the band's hit “I Want to Know What Love Is” in front of a sold-out crowd."
    },
    {
      year: 2026,
      date: "April 19, 2026",
      sortDate: "2026-04-19",
      title: "DSCC Spring Concert Caps a Milestone Season",
      blurb: "All three choruses closed out the 2025/26 season together at the Meyerson, marking the ensemble's fourth season of concerts since its founding."
    },
    {
      year: 2026,
      date: "February 2026",
      sortDate: "2026-02-01",
      title: "Auditions Open for the 2026/27 Season",
      blurb: "Auditions for Training Choir, Symphonic Voices, and Mixed Ensemble opened for singers in grades 4–12, with no prior experience required for our entry-level choruses."
    }
  ];

  document.addEventListener("DOMContentLoaded", function () {
    var yearListEl = document.querySelector(".year-list");
    var listEl = document.querySelector(".news-list");
    if (!yearListEl || !listEl) return;

    var years = [];
    NEWS_ITEMS.forEach(function (item) {
      if (years.indexOf(item.year) === -1) years.push(item.year);
    });
    years.sort(function (a, b) { return b - a; });

    if (!years.length) {
      listEl.innerHTML = '<p class="news-empty">No announcements have been posted yet.</p>';
      return;
    }

    var currentYear = new Date().getFullYear();
    var defaultYear = years.indexOf(currentYear) !== -1 ? currentYear : years[0];

    years.forEach(function (year) {
      var count = NEWS_ITEMS.filter(function (i) { return i.year === year; }).length;
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "year-list__btn";
      btn.setAttribute("data-year", year);
      btn.setAttribute("aria-pressed", "false");
      btn.innerHTML = "<span>" + year + "</span><span class=\"year-list__count\">" + count + "</span>";
      btn.addEventListener("click", function () { selectYear(year); });
      yearListEl.appendChild(btn);
    });

    function cardTemplate(item) {
      var card = document.createElement("article");
      card.className = "news-card";
      var time = document.createElement("time");
      time.textContent = item.date;
      var h3 = document.createElement("h3");
      h3.textContent = item.title;
      var p = document.createElement("p");
      p.textContent = item.blurb;
      card.appendChild(time);
      card.appendChild(h3);
      card.appendChild(p);

      /* Optional call-to-action buttons (e.g. "Buy Tickets" linking out to
         the DSO's site). Mirrors the external-link button markup used on
         index.html / our-connection-to-the-dso.html -- diagonal arrow icon
         plus visually-hidden "(opens in a new tab)" text -- built with the
         DOM API since this list is rendered from plain data, not HTML. */
      if (item.ctas && item.ctas.length) {
        var svgNS = "http://www.w3.org/2000/svg";
        var row = document.createElement("div");
        row.className = "btn-row mt-sm";
        item.ctas.forEach(function (cta) {
          var a = document.createElement("a");
          a.href = cta.href;
          a.target = "_blank";
          a.rel = "noopener noreferrer";
          a.className = "btn btn--accent btn--external";
          a.appendChild(document.createTextNode(cta.label));

          var vh = document.createElement("span");
          vh.className = "visually-hidden";
          vh.textContent = " (opens in a new tab)";
          a.appendChild(vh);

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

          row.appendChild(a);
        });
        card.appendChild(row);
      }

      return card;
    }

    function selectYear(year) {
      var buttons = yearListEl.querySelectorAll(".year-list__btn");
      for (var i = 0; i < buttons.length; i++) {
        var isActive = Number(buttons[i].getAttribute("data-year")) === year;
        buttons[i].classList.toggle("is-active", isActive);
        buttons[i].setAttribute("aria-pressed", isActive ? "true" : "false");
      }

      var items = NEWS_ITEMS
        .filter(function (i) { return i.year === year; })
        .sort(function (a, b) { return a.sortDate < b.sortDate ? 1 : -1; });

      listEl.innerHTML = "";
      if (!items.length) {
        listEl.innerHTML = '<p class="news-empty">No announcements posted for ' + year + ' yet.</p>';
        return;
      }
      items.forEach(function (item) { listEl.appendChild(cardTemplate(item)); });
    }

    selectYear(defaultYear);
  });
})();

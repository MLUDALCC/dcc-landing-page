/* ============================================================================
   Past-performance archive (performances.html)

   Once a performance is over, move its card out of the "Upcoming
   Performances" section of performances.html and add one object to
   PAST_PERFORMANCES below. The year sidebar, the counts, and the card markup
   are all generated from this list automatically, so the history simply keeps
   growing -- a new year gets its own button the first time an item for that
   year is added.

   Fields
     year        number, e.g. 2026
     sortDate    ISO date of the (first) performance, e.g. "2026-05-15" --
                 used to sort newest-first within a year
     title       card heading
     tag         the short line beside the heading (date · choir)
     desc        one or two sentences
     facts       [["Label", "Value"], ...] -- shown in the grey facts box;
                 use "\n" in a value for a line break (e.g. an address)
     ctas        optional buttons: { label, href, external: true|false }
   ========================================================================= */
(function () {
  "use strict";

  var PAST_PERFORMANCES = [
    {
      year: 2026,
      sortDate: "2026-08-28",
      title: "Performance with Foreigner",
      tag: "August 28, 2026 · 6:30 PM · Symphonic Voices",
      desc: "Symphonic Voices joined the rock band Foreigner on stage at Fair Park's Dos Equis Pavilion, performing the band's hit “I Want to Know What Love Is.”",
      facts: [
        ["Date", "August 28, 2026"],
        ["Time", "6:30 PM"],
        ["Choir", "Symphonic Voices"],
        ["Location", "Dos Equis Pavilion, Fair Park"]
      ],
      ctas: [{ label: "Watch the Video", href: "media.html" }]
    },
    {
      year: 2026,
      sortDate: "2026-05-15",
      title: "Mahler's Symphony No. 8",
      tag: "May 15, 16 & 17, 2026 · Symphonic Voices",
      desc: "Symphonic Voices joined the Dallas Symphony Orchestra, the Dallas Symphony Chorus, and the Baltimore Choral Arts Society for three performances of Mahler's Symphony No. 8.",
      facts: [
        ["Dates", "May 15, 16 & 17, 2026"],
        ["Choir", "Symphonic Voices"],
        ["With", "Dallas Symphony Orchestra, Dallas Symphony Chorus & Baltimore Choral Arts Society"]
      ]
    },
    {
      year: 2026,
      sortDate: "2026-04-19",
      title: "DSCC Spring Concert",
      tag: "April 19, 2026 · All Choirs",
      desc: "All three choruses closed out the 2025/26 season together at the Morton H. Meyerson Symphony Center, marking the ensemble's fourth season of concerts.",
      facts: [
        ["Date", "April 19, 2026"],
        ["Choirs", "All Choirs"],
        ["Location", "Morton H. Meyerson Symphony Center"],
        ["Address", "2301 Flora Street\nDallas, TX 75201"]
      ]
    }
  ];

  document.addEventListener("DOMContentLoaded", function () {
    var yearListEl = document.querySelector(".perf-year-list");
    var listEl = document.querySelector(".perf-list");
    if (!yearListEl || !listEl) return;

    var years = [];
    PAST_PERFORMANCES.forEach(function (item) {
      if (years.indexOf(item.year) === -1) years.push(item.year);
    });
    years.sort(function (a, b) { return b - a; });

    if (!years.length) {
      listEl.innerHTML = '<p class="news-empty">Past performances will be listed here.</p>';
      return;
    }

    var currentYear = new Date().getFullYear();
    var defaultYear = years.indexOf(currentYear) !== -1 ? currentYear : years[0];

    years.forEach(function (year) {
      var count = PAST_PERFORMANCES.filter(function (i) { return i.year === year; }).length;
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
      var card = document.createElement("div");
      card.className = "program-card";

      var head = document.createElement("div");
      head.className = "program-card__head";
      var h3 = document.createElement("h3");
      h3.className = "program-card__title";
      h3.textContent = item.title;
      var tag = document.createElement("span");
      tag.className = "program-card__tag";
      tag.textContent = item.tag;
      head.appendChild(h3);
      head.appendChild(tag);
      card.appendChild(head);

      var p = document.createElement("p");
      p.className = "body-text";
      p.textContent = item.desc;
      card.appendChild(p);

      if (item.facts && item.facts.length) {
        var dl = document.createElement("dl");
        dl.className = "program-facts";
        item.facts.forEach(function (fact) {
          var row = document.createElement("div");
          var dt = document.createElement("dt");
          dt.textContent = fact[0];
          var dd = document.createElement("dd");
          fact[1].split("\n").forEach(function (line, i) {
            if (i) dd.appendChild(document.createElement("br"));
            dd.appendChild(document.createTextNode(line));
          });
          row.appendChild(dt);
          row.appendChild(dd);
          dl.appendChild(row);
        });
        card.appendChild(dl);
      }

      if (item.ctas && item.ctas.length) {
        var btnRow = document.createElement("div");
        btnRow.className = "btn-row mt-sm";
        item.ctas.forEach(function (cta) {
          var a = document.createElement("a");
          a.href = cta.href;
          a.className = "btn btn--accent";
          a.appendChild(document.createTextNode(cta.label));
          if (cta.external) {
            a.target = "_blank";
            a.rel = "noopener noreferrer";
            var vh = document.createElement("span");
            vh.className = "visually-hidden";
            vh.textContent = " (opens in a new tab)";
            a.appendChild(vh);
          }
          btnRow.appendChild(a);
        });
        card.appendChild(btnRow);
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
      var items = PAST_PERFORMANCES
        .filter(function (i) { return i.year === year; })
        .sort(function (a, b) { return a.sortDate < b.sortDate ? 1 : -1; });
      listEl.innerHTML = "";
      items.forEach(function (item) { listEl.appendChild(cardTemplate(item)); });
    }

    selectYear(defaultYear);
  });
})();

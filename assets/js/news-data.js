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
      date: "September 2026",
      sortDate: "2026-09-01",
      title: "Fall Concert Tickets Now Available",
      blurb: "Tickets are on sale for the DSCC Fall Concert on November 1 at the Morton H. Meyerson Symphony Center, where all three choruses open the 2026/27 season together."
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
      date: "May 2, 2026",
      sortDate: "2026-05-02",
      title: "DSCC Spring Concert Caps a Milestone Season",
      blurb: "All three choruses closed out the 2025/26 season together at the Meyerson, marking the ensemble's fourth season of concerts since its founding."
    },
    {
      year: 2026,
      date: "February 2026",
      sortDate: "2026-02-01",
      title: "Auditions Open for the 2026/27 Season",
      blurb: "Auditions for Training Choir, Symphonic Voices, and Mixed Ensemble opened for singers in grades 4–12, with no prior experience required for our entry-level choruses."
    },
    {
      year: 2025,
      date: "October 2025",
      sortDate: "2025-10-01",
      title: "DSCC to Become the Dallas Children's Chorus",
      blurb: "The Dallas Symphony Children's Chorus announced its transition to an independent 501(c)(3) nonprofit, taking on the Dallas Children's Chorus name beginning with the 2027/28 season."
    },
    {
      year: 2025,
      date: "May 3, 2025",
      sortDate: "2025-05-03",
      title: "DSCC Celebrates Its Fourth Season",
      blurb: "The combined choruses closed the 2024/25 season at the Meyerson, the ensemble's fourth season of concerts since being founded by the Dallas Symphony Orchestra."
    },
    {
      year: 2024,
      date: "November 2024",
      sortDate: "2024-11-01",
      title: "Holidays with the DSO Concerts Announced",
      blurb: "Symphonic Voices was invited to join the Dallas Symphony Orchestra and the Dallas Symphony Chorus for the beloved holiday tradition at the Meyerson."
    },
    {
      year: 2024,
      date: "August 2024",
      sortDate: "2024-08-01",
      title: "DSCC Returns for a Third Season",
      blurb: "Rehearsals resumed at Lovers Lane United Methodist Church as the ensemble began its third season, welcoming new choristers across all three choruses."
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

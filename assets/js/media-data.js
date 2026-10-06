/* ============================================================================
   Media page data + rendering (media.html)

   To add a recording, add an object to MEDIA_ITEMS with a "videoId" (the
   part of the YouTube URL after "watch?v="). An item left without a
   "videoId" renders as a "Recording coming soon" placeholder tile instead
   of a broken embed -- useful for a concert that's on the calendar but
   hasn't been recorded/uploaded yet. Everything else (the grid markup) is
   generated from this list automatically via one shared template.

   Replace or add to these entries as new recordings become available.
   ========================================================================= */
(function () {
  "use strict";

  var MEDIA_ITEMS = [
    {
      videoId: "7Aa4BVeEmuE",
      title: "Symphonic Voices with Foreigner",
      meta: "August 28, 2026 · Symphonic Voices",
      desc: "Symphonic Voices joined the rock band Foreigner on stage at Fair Park's Dos Equis Pavilion, performing the band's hit “I Want to Know What Love Is.”"
    },
    {
      videoId: "wzswrw1HDOs",
      title: "United in Song",
      meta: "Combined Choruses · Victor C. Johnson",
      desc: "The combined choruses of the Dallas Symphony Children's Chorus perform “United in Song” — young voices coming together to create something extraordinary."
    },
    {
      title: "DSCC Fall Concert",
      meta: "November 1, 2026 · All Choirs",
      desc: "All three choruses open the 2026/27 season together at the Morton H. Meyerson Symphony Center."
    },
    {
      title: "Holidays with the DSO",
      meta: "December 2026 · Symphonic Voices",
      desc: "Symphonic Voices joins the Dallas Symphony Orchestra and the Dallas Symphony Chorus for this beloved holiday tradition."
    },
    {
      title: "DSCC Spring Concert",
      meta: "May 2, 2027 · All Choirs",
      desc: "All three choruses close out the season together at the Meyerson Symphony Center."
    }
  ];

  document.addEventListener("DOMContentLoaded", function () {
    var gridEl = document.querySelector(".media-grid");
    if (!gridEl) return;

    function template(item) {
      var wrap = document.createElement("article");
      wrap.className = "media-item";

      if (item.videoId) {
        var embed = document.createElement("div");
        embed.className = "video-embed";
        var iframe = document.createElement("iframe");
        iframe.src = "https://www.youtube-nocookie.com/embed/" + encodeURIComponent(item.videoId) + "?rel=0";
        iframe.title = item.title;
        iframe.loading = "lazy";
        iframe.setAttribute("frameborder", "0");
        iframe.setAttribute("allow", "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share");
        iframe.setAttribute("referrerpolicy", "strict-origin-when-cross-origin");
        iframe.setAttribute("allowfullscreen", "");
        var frame = document.createElement("div");
        frame.className = "frame";
        frame.setAttribute("aria-hidden", "true");
        embed.appendChild(iframe);
        embed.appendChild(frame);
        wrap.appendChild(embed);
      } else {
        var placeholder = document.createElement("div");
        placeholder.className = "media-item__placeholder";
        placeholder.innerHTML =
          '<svg width="34" height="34" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3" y="6" width="18" height="12" rx="3" stroke="currentColor" stroke-width="1.3"/><path d="M10 9.5l5 2.5-5 2.5z" fill="currentColor"/></svg>' +
          '<span>Recording coming soon</span>';
        wrap.appendChild(placeholder);
      }

      var body = document.createElement("div");
      body.className = "media-item__body";
      var meta = document.createElement("span");
      meta.className = "media-item__meta";
      meta.textContent = item.meta;
      var h3 = document.createElement("h3");
      h3.textContent = item.title;
      var p = document.createElement("p");
      p.textContent = item.desc;
      body.appendChild(meta);
      body.appendChild(h3);
      body.appendChild(p);
      wrap.appendChild(body);

      return wrap;
    }

    MEDIA_ITEMS.forEach(function (item) { gridEl.appendChild(template(item)); });
  });
})();

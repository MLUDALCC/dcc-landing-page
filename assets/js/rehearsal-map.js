// Rehearsal-location map (Contact page). Built on Leaflet + Esri's free,
// no-API-key "World Light Gray" basemap. The base tiles are recolored
// toward the site's navy/cool-grey palette by a CSS filter scoped to the
// tile pane (see .location-map .leaflet-tile-pane in style.css) -- this file
// only sets up the map, marker, and popup.
(function () {
  var mapEl = document.getElementById('rehearsal-map');
  if (!mapEl || typeof L === 'undefined') return;

  var CHURCH = {
    lat: 32.86676,
    lng: -96.82083,
    name: 'Lovers Lane United Methodist Church',
    note: 'Entrance D — 9200 Inwood Rd, Dallas, TX 75220'
  };
  var DIRECTIONS_URL =
    'https://www.google.com/maps/dir/?api=1&destination=' +
    encodeURIComponent('9200 Inwood Rd, Dallas, TX 75220');

  var map = L.map(mapEl, {
    center: [CHURCH.lat, CHURCH.lng],
    zoom: 15,
    scrollWheelZoom: false,
    attributionControl: true
  });

  L.tileLayer(
    'https://services.arcgisonline.com/arcgis/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    {
      minZoom: 11,
      maxZoom: 16,
      attribution: 'Tiles &copy; Esri'
    }
  ).addTo(map);

  var pin = L.divIcon({
    className: 'dcc-map-pin',
    html:
      '<svg width="28" height="36" viewBox="0 0 30 38" fill="none" xmlns="http://www.w3.org/2000/svg">' +
      '<path d="M15 0C6.7 0 0 6.7 0 15c0 10.3 13 21.6 14 22.5.6.5 1.4.5 2 0C17 36.6 30 25.3 30 15 30 6.7 23.3 0 15 0z" fill="#0B2A4A"/>' +
      '<circle cx="15" cy="15" r="5.5" fill="#fff"/>' +
      '</svg>',
    iconSize: [28, 36],
    iconAnchor: [14, 36],
    popupAnchor: [0, -32]
  });

  L.marker([CHURCH.lat, CHURCH.lng], { icon: pin, alt: CHURCH.name })
    .addTo(map)
    .bindPopup(
      '<strong>' + CHURCH.name + '</strong><br>' + CHURCH.note +
      '<br><a href="' + DIRECTIONS_URL + '" target="_blank" rel="noopener">Get Directions →</a>'
    );
})();

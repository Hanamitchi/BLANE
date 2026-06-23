/* ============================================================
   BLANE — Markets Module
   Handles: SVG map, market list, filter, detail panel
   Depends on: supabase-config.js, auth.js

   NOTE: Replace SVG map with Google Maps / Leaflet.js by
   adding your API key and uncommenting the integration block
   at the bottom of this file.
   ============================================================ */

/* ============================================================
   MARKET DATA  (demo — replace with Supabase / geo API later)
   ============================================================ */
const MARKETS = [
  {
    id: 'mk1',
    name: 'Tarlac City Public Market',
    type: 'palengke',
    icon: '🏪',
    distance: 0.8,
    open: true,
    hours: '4:00 AM – 6:00 PM',
    address: 'F. Tañedo St., Tarlac City',
    lat: 15.4889, lng: 120.5985,
    availableTags: ['Eggs', 'Malunggay', 'Bangus', 'Kangkong', 'Garlic', 'Onion'],
    ingredients: [
      { name: 'Eggs',          qty: '1 tray (30 pcs)',  price: '₱180',  status: 'avail'   },
      { name: 'Malunggay',     qty: '1 bundle',         price: '₱10',   status: 'avail'   },
      { name: 'Bangus',        qty: 'per kg',           price: '₱160',  status: 'avail'   },
      { name: 'Kangkong',      qty: '1 bundle',         price: '₱15',   status: 'avail'   },
      { name: 'Garlic',        qty: '100g',             price: '₱25',   status: 'avail'   },
      { name: 'Onion',         qty: '100g',             price: '₱20',   status: 'avail'   },
      { name: 'Tomato',        qty: '100g',             price: '₱18',   status: 'avail'   },
      { name: 'Ginger',        qty: '100g',             price: '₱22',   status: 'avail'   },
      { name: 'Ampalaya',      qty: 'per pc',           price: '₱25',   status: 'limited' },
      { name: 'Broccoli',      qty: 'per head',         price: '₱65',   status: 'unavail' },
    ],
  },
  {
    id: 'mk2',
    name: 'Puregold Tarlac',
    type: 'supermarket',
    icon: '🛒',
    distance: 1.2,
    open: true,
    hours: '8:00 AM – 9:00 PM',
    address: 'MacArthur Highway, Tarlac City',
    lat: 15.4910, lng: 120.5920,
    availableTags: ['Oats', 'Peanut Butter', 'Brown Rice', 'Chicken', 'Broccoli'],
    ingredients: [
      { name: 'Rolled Oats',   qty: '500g pack',        price: '₱85',   status: 'avail'   },
      { name: 'Peanut Butter', qty: '340g jar',         price: '₱120',  status: 'avail'   },
      { name: 'Brown Rice',    qty: '1 kg',             price: '₱68',   status: 'avail'   },
      { name: 'Chicken Breast', qty: 'per kg',          price: '₱220',  status: 'avail'   },
      { name: 'Broccoli',      qty: 'per head',         price: '₱55',   status: 'avail'   },
      { name: 'Honey',         qty: '250g bottle',      price: '₱95',   status: 'avail'   },
      { name: 'Soy Sauce',     qty: '1L bottle',        price: '₱52',   status: 'avail'   },
      { name: 'Sesame Oil',    qty: '200ml',            price: '₱88',   status: 'avail'   },
      { name: 'Fish Sauce',    qty: '750ml',            price: '₱45',   status: 'avail'   },
      { name: 'Tamarind Mix',  qty: '10s pack',         price: '₱15',   status: 'avail'   },
    ],
  },
  {
    id: 'mk3',
    name: 'Daan Bago Talipapa',
    type: 'talipapa',
    icon: '🥬',
    distance: 0.4,
    open: false,
    hours: '4:00 AM – 10:00 AM',
    address: 'Daan Bago, Tarlac City',
    lat: 15.4760, lng: 120.6010,
    availableTags: ['Kangkong', 'Malunggay', 'Camote', 'Eggplant', 'Squash'],
    ingredients: [
      { name: 'Kangkong',      qty: '1 bundle',         price: '₱10',   status: 'avail'   },
      { name: 'Malunggay',     qty: '1 bundle',         price: '₱8',    status: 'avail'   },
      { name: 'Sweet Potato',  qty: 'per kg',           price: '₱40',   status: 'avail'   },
      { name: 'Eggplant',      qty: 'per pc',           price: '₱15',   status: 'avail'   },
      { name: 'Squash',        qty: 'per kg',           price: '₱35',   status: 'avail'   },
      { name: 'Okra',          qty: '100g',             price: '₱12',   status: 'limited' },
      { name: 'Ampalaya',      qty: 'per pc',           price: '₱20',   status: 'avail'   },
      { name: 'String Beans',  qty: '1 bundle',         price: '₱18',   status: 'avail'   },
    ],
  },
  {
    id: 'mk4',
    name: 'SM Hypermarket Tarlac',
    type: 'supermarket',
    icon: '🏬',
    distance: 2.1,
    open: true,
    hours: '9:00 AM – 9:00 PM',
    address: 'SM City Tarlac, Tarlac City',
    lat: 15.5005, lng: 120.5860,
    availableTags: ['Chicken', 'Pork', 'Brown Rice', 'Broccoli', 'Oats', 'Honey'],
    ingredients: [
      { name: 'Chicken Breast', qty: 'per kg',          price: '₱210',  status: 'avail'   },
      { name: 'Pork Belly',    qty: 'per kg',           price: '₱280',  status: 'avail'   },
      { name: 'Brown Rice',    qty: '2 kg',             price: '₱130',  status: 'avail'   },
      { name: 'Broccoli',      qty: 'per head',         price: '₱58',   status: 'avail'   },
      { name: 'Rolled Oats',   qty: '1 kg pack',        price: '₱155',  status: 'avail'   },
      { name: 'Honey',         qty: '500g',             price: '₱175',  status: 'avail'   },
      { name: 'Banana',        qty: 'per kg',           price: '₱55',   status: 'avail'   },
      { name: 'Greek Yogurt',  qty: '150g cup',         price: '₱65',   status: 'limited' },
    ],
  },
  {
    id: 'mk5',
    name: 'Robinsons Supermarket',
    type: 'supermarket',
    icon: '🛍️',
    distance: 1.8,
    open: true,
    hours: '9:00 AM – 9:00 PM',
    address: 'Robinsons Place Tarlac',
    lat: 15.4795, lng: 120.5870,
    availableTags: ['Chicken', 'Eggs', 'Peanut Butter', 'Oats', 'Fish Sauce'],
    ingredients: [
      { name: 'Chicken Breast', qty: 'per kg',          price: '₱215',  status: 'avail'   },
      { name: 'Eggs',           qty: '12 pcs',          price: '₱90',   status: 'avail'   },
      { name: 'Peanut Butter',  qty: '340g jar',        price: '₱115',  status: 'avail'   },
      { name: 'Rolled Oats',    qty: '500g',            price: '₱82',   status: 'avail'   },
      { name: 'Fish Sauce',     qty: '750ml',           price: '₱48',   status: 'avail'   },
      { name: 'Brown Sugar',    qty: '500g',            price: '₱38',   status: 'avail'   },
      { name: 'Calamansi',      qty: '12 pcs',          price: '₱20',   status: 'avail'   },
    ],
  },
  {
    id: 'mk6',
    name: 'Balibago Wet Market',
    type: 'palengke',
    icon: '🐟',
    distance: 1.1,
    open: true,
    hours: '4:00 AM – 5:00 PM',
    address: 'Balibago, Tarlac City',
    lat: 15.4860, lng: 120.5790,
    availableTags: ['Bangus', 'Tilapia', 'Pork', 'Beef', 'Garlic', 'Tomato'],
    ingredients: [
      { name: 'Bangus',        qty: 'per kg',           price: '₱150',  status: 'avail'   },
      { name: 'Tilapia',       qty: 'per kg',           price: '₱120',  status: 'avail'   },
      { name: 'Pork Belly',    qty: 'per kg',           price: '₱260',  status: 'avail'   },
      { name: 'Chicken',       qty: 'per kg',           price: '₱185',  status: 'avail'   },
      { name: 'Garlic',        qty: '100g',             price: '₱22',   status: 'avail'   },
      { name: 'Tomato',        qty: '100g',             price: '₱15',   status: 'avail'   },
      { name: 'Kamote',        qty: 'per kg',           price: '₱38',   status: 'limited' },
    ],
  },
  {
    id: 'mk7',
    name: 'Lipa Sari-Sari & Grocery',
    type: 'grocery',
    icon: '🏠',
    distance: 0.2,
    open: true,
    hours: '6:00 AM – 10:00 PM',
    address: 'Brgy. Tibag, Tarlac City',
    lat: 15.4830, lng: 120.6040,
    availableTags: ['Eggs', 'Garlic', 'Onion', 'Cooking Oil', 'Salt', 'Sugar'],
    ingredients: [
      { name: 'Eggs',          qty: 'per pc',           price: '₱7',    status: 'avail'   },
      { name: 'Garlic',        qty: '1 head',           price: '₱8',    status: 'avail'   },
      { name: 'Onion',         qty: 'per pc',           price: '₱10',   status: 'avail'   },
      { name: 'Cooking Oil',   qty: '1L',               price: '₱78',   status: 'avail'   },
      { name: 'Salt',          qty: '250g',             price: '₱12',   status: 'avail'   },
      { name: 'Sugar',         qty: '500g',             price: '₱32',   status: 'avail'   },
      { name: 'Fish Sauce',    qty: '250ml',            price: '₱18',   status: 'avail'   },
    ],
  },
];

/* Type config */
const TYPE_META = {
  palengke:    { label: 'Palengke',    color: '#60a5fa' },
  supermarket: { label: 'Supermarket', color: '#2ddc7a' },
  talipapa:    { label: 'Talipapa',    color: '#fbbf24' },
  grocery:     { label: 'Grocery',     color: '#a78bfa' },
};

/* ============================================================
   STATE
   ============================================================ */
let activeFilter      = 'All';
let selectedMarketId  = null;

/* ============================================================
   INIT
   ============================================================ */
document.addEventListener('DOMContentLoaded', async function () {
  const session = await guardPage();
  if (!session) return;

  buildFilterBar();
  renderMap();
  renderList();

  /* Locate button — real GPS via navigator.geolocation */
  document.getElementById('mk-locate-btn').addEventListener('click', locateUser);

  /* Detail panel close */
  document.getElementById('mk-detail-close').addEventListener('click', closeDetail);
});

/* ============================================================
   FILTER BAR
   ============================================================ */
const FILTERS = ['All', 'Palengke', 'Supermarket', 'Talipapa', 'Grocery'];

function buildFilterBar() {
  const row = document.getElementById('mk-filter-row');
  row.innerHTML = '';

  FILTERS.forEach(function (f) {
    const btn = document.createElement('button');
    btn.className = 'mk-filter-btn' + (f === activeFilter ? ' active' : '');
    btn.textContent = f;
    btn.addEventListener('click', function () {
      activeFilter = f;
      buildFilterBar();
      renderList();
      renderMap();
    });
    row.appendChild(btn);
  });

  /* Count */
  const count = document.createElement('span');
  count.className = 'mk-market-count';
  const filtered = getFiltered();
  count.innerHTML = '<span>' + filtered.length + '</span> markets nearby';
  row.appendChild(count);
}

/* ============================================================
   FILTER LOGIC
   ============================================================ */
function getFiltered() {
  if (activeFilter === 'All') return MARKETS;
  return MARKETS.filter(function (m) {
    return m.type === activeFilter.toLowerCase();
  });
}

/* ============================================================
   MAP (Leaflet + OpenStreetMap — 100% free, no API key)
   ============================================================ */
let map;
let markersLayer;
let userMarker;
let userAccuracyCircle;
let userCoords = null; /* { lat, lng } once GPS succeeds */

/* Default center: Tarlac City (used until GPS locates the user) */
const DEFAULT_CENTER = { lat: 15.4858, lng: 120.5970 };

function renderMap() {
  /* Init map only once */
  if (!map) {
    map = L.map('map', { zoomControl: false })
      .setView([DEFAULT_CENTER.lat, DEFAULT_CENTER.lng], 14);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    markersLayer = L.layerGroup().addTo(map);

    /* Re-render filtered markers when zoom/pan happens isn't needed —
       Leaflet keeps markers fixed; we only rebuild on filter change. */
  }

  /* Clear old market markers (NOT the user marker) */
  markersLayer.clearLayers();

  const filtered = getFiltered();

  filtered.forEach(function (market) {
    const meta  = TYPE_META[market.type] || TYPE_META.grocery;
    const icon  = buildMarketDivIcon(market, meta);

    const marker = L.marker([market.lat, market.lng], { icon: icon }).addTo(markersLayer);

    marker.bindPopup(
      '<div style="font-family:DM Sans,sans-serif;min-width:160px;">' +
        '<div style="font-weight:700;font-size:13px;margin-bottom:3px;">' + market.icon + ' ' + market.name + '</div>' +
        '<div style="font-size:11px;color:#666;">' + meta.label + ' · ' + market.distance + ' km · ' +
          (market.open ? '<span style="color:#16a34a;">Open</span>' : '<span style="color:#dc2626;">Closed</span>') +
        '</div>' +
      '</div>'
    );

    marker.on('click', function () { selectMarket(market.id); });
  });
}

/* ---- Custom colored pin icon per market type ---- */
function buildMarketDivIcon(market, meta) {
  const isSelected = market.id === selectedMarketId;
  const color = market.open ? meta.color : '#9ca3af';
  return L.divIcon({
    className: 'mk-leaflet-pin',
    html:
      '<div style="' +
        'width:30px;height:30px;border-radius:50% 50% 50% 0;' +
        'background:' + color + ';transform:rotate(-45deg);' +
        'border:2px solid ' + (isSelected ? '#ffffff' : 'rgba(0,0,0,0.25)') + ';' +
        'box-shadow:0 2px 6px rgba(0,0,0,0.4);' +
        'display:flex;align-items:center;justify-content:center;' +
      '">' +
        '<span style="transform:rotate(45deg);font-size:14px;">' + market.icon + '</span>' +
      '</div>',
    iconSize:   [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -28],
  });
}

/* ============================================================
   GPS — "Update Location" points to where the user actually is
   ============================================================ */
function locateUser() {
  const btn = document.getElementById('mk-locate-btn');
  if (!navigator.geolocation) {
    alert('Your browser does not support geolocation.');
    return;
  }

  if (btn) { btn.disabled = true; btn.querySelector('span') ? null : null; }
  setLocationBarText('Locating you…', 'Requesting GPS permission');

  navigator.geolocation.getCurrentPosition(
    function (pos) {
      userCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      placeUserMarker(userCoords, pos.coords.accuracy);
      recalcDistancesFromUser(userCoords);

      map.setView([userCoords.lat, userCoords.lng], 15, { animate: true });

      setLocationBarText(
        'Your Current Location',
        'Lat ' + userCoords.lat.toFixed(5) + ', Lng ' + userCoords.lng.toFixed(5) + ' · Accuracy ±' + Math.round(pos.coords.accuracy) + 'm'
      );

      renderList();
      if (btn) btn.disabled = false;
    },
    function (err) {
      let msg = 'Could not get your location.';
      if (err.code === 1) msg = 'Location permission denied. Showing default area instead.';
      if (err.code === 2) msg = 'Location unavailable. Showing default area instead.';
      if (err.code === 3) msg = 'Location request timed out. Showing default area instead.';
      setLocationBarText('Tarlac City, Central Luzon, PH', msg);
      if (btn) btn.disabled = false;
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
  );
}

/* Drop / move the blue "you are here" marker + accuracy ring */
function placeUserMarker(coords, accuracyMeters) {
  const youIcon = L.divIcon({
    className: 'mk-user-pin',
    html:
      '<div style="position:relative;width:18px;height:18px;">' +
        '<div style="position:absolute;inset:0;background:#2563eb;border:3px solid #ffffff;' +
        'border-radius:50%;box-shadow:0 0 0 4px rgba(37,99,235,0.25);"></div>' +
      '</div>',
    iconSize:   [18, 18],
    iconAnchor: [9, 9],
  });

  if (userMarker) {
    userMarker.setLatLng([coords.lat, coords.lng]);
  } else {
    userMarker = L.marker([coords.lat, coords.lng], { icon: youIcon, zIndexOffset: 1000 })
      .addTo(map)
      .bindPopup('<strong>You are here</strong>');
  }

  if (userAccuracyCircle) {
    userAccuracyCircle.setLatLng([coords.lat, coords.lng]);
    userAccuracyCircle.setRadius(accuracyMeters || 50);
  } else {
    userAccuracyCircle = L.circle([coords.lat, coords.lng], {
      radius: accuracyMeters || 50,
      color: '#2563eb',
      fillColor: '#2563eb',
      fillOpacity: 0.08,
      weight: 1,
    }).addTo(map);
  }
}

/* Recompute every market's distance from the real user position (Haversine) */
function recalcDistancesFromUser(coords) {
  MARKETS.forEach(function (m) {
    m.distance = haversineKm(coords.lat, coords.lng, m.lat, m.lng);
  });
}

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10;
}

function setLocationBarText(nameText, subText) {
  const nameEl = document.getElementById('mk-location-name');
  const subEl  = document.getElementById('mk-location-sub');
  if (nameEl) nameEl.textContent = nameText;
  if (subEl)  subEl.textContent  = subText;
}

/* Recenter button — goes to user's GPS pin if known, else default area */
function recenterMap() {
  if (!map) return;
  if (userCoords) {
    map.setView([userCoords.lat, userCoords.lng], 15, { animate: true });
  } else {
    map.setView([DEFAULT_CENTER.lat, DEFAULT_CENTER.lng], 14, { animate: true });
  }
}

/* ============================================================
   MARKET LIST
   ============================================================ */
function renderList() {
  const col      = document.getElementById('mk-list-col');
  const filtered = getFiltered();
  col.innerHTML  = '';

  if (filtered.length === 0) {
    col.innerHTML = '<div class="mk-empty"><span class="mk-empty-icon">🗺️</span>No markets match this filter.</div>';
    return;
  }

  /* Sort by distance */
  const sorted = filtered.slice().sort(function (a, b) { return a.distance - b.distance; });

  sorted.forEach(function (market) {
    col.appendChild(buildMarketCard(market));
  });
}

function buildMarketCard(market) {
  const card = document.createElement('div');
  card.className = 'mk-market-card' + (market.id === selectedMarketId ? ' selected' : '');
  card.setAttribute('data-id', market.id);

  const meta = TYPE_META[market.type] || TYPE_META.grocery;

  const tagsHTML = market.availableTags.slice(0, 5).map(function (tag) {
    return '<span class="mk-ing-tag found">' + tag + '</span>';
  }).join('') + (market.availableTags.length > 5
    ? '<span class="mk-ing-tag">+' + (market.availableTags.length - 5) + '</span>'
    : '');

  card.innerHTML =
    '<div class="mk-card-top">' +
      '<div class="mk-card-icon">' + market.icon + '</div>' +
      '<div class="mk-card-info">' +
        '<div class="mk-card-name">' + market.name + '</div>' +
        '<div class="mk-card-meta">' +
          '<span class="mk-type-badge ' + market.type + '">' + meta.label + '</span>' +
          '<span class="mk-distance">📍 ' + market.distance + ' km</span>' +
        '</div>' +
      '</div>' +
      '<span class="mk-status-badge ' + (market.open ? 'open' : 'closed') + '">' +
        (market.open ? '● Open' : '● Closed') +
      '</span>' +
    '</div>' +
    '<div class="mk-card-ingredients">' + tagsHTML + '</div>';

  card.addEventListener('click', function () { selectMarket(market.id); });
  return card;
}

/* ============================================================
   SELECT MARKET
   ============================================================ */
function selectMarket(id) {
  selectedMarketId = (selectedMarketId === id) ? null : id;
  renderMap();
  renderList();
  if (selectedMarketId) {
    const market = MARKETS.find(function (m) { return m.id === id; });
    openDetail(market);
  } else {
    closeDetail();
  }
}

/* ============================================================
   DETAIL PANEL
   ============================================================ */
function openDetail(market) {
  const panel = document.getElementById('mk-detail-panel');
  const inner = document.getElementById('mk-detail-inner');
  const meta  = TYPE_META[market.type] || TYPE_META.grocery;

  /* Build ingredient rows */
  const headerRow =
    '<div class="mk-ing-row mk-ing-row-header">' +
      '<span>Ingredient</span><span style="text-align:center;">Qty</span>' +
      '<span style="text-align:center;">Price</span><span style="text-align:center;">Status</span>' +
    '</div>';

  const rowsHTML = market.ingredients.map(function (ing) {
    return '<div class="mk-ing-row">' +
      '<div class="mk-ing-row-name"><div class="mk-ing-dot"></div>' + ing.name + '</div>' +
      '<div class="mk-ing-row-qty">' + ing.qty + '</div>' +
      '<div class="mk-ing-row-price">' + ing.price + '</div>' +
      '<div class="mk-ing-row-status ' + ing.status + '">' +
        (ing.status === 'avail' ? '✓ Available' : ing.status === 'limited' ? '⚠ Limited' : '✕ Unavailable') +
      '</div>' +
    '</div>';
  }).join('');

  inner.innerHTML =
    '<div class="mk-detail-header">' +
      '<div class="mk-detail-title-block">' +
        '<div class="mk-detail-icon">' + market.icon + '</div>' +
        '<div>' +
          '<div class="mk-detail-name">' + market.name + '</div>' +
          '<div class="mk-detail-meta">' +
            '<span class="mk-type-badge ' + market.type + '">' + meta.label + '</span>' +
            '<span class="mk-status-badge ' + (market.open ? 'open' : 'closed') + '">' +
              (market.open ? '● Open' : '● Closed') +
            '</span>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<button class="mk-detail-close" id="mk-detail-close">✕</button>' +
    '</div>' +

    '<div class="mk-info-chips">' +
      '<div class="mk-info-chip">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 1 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>' +
        '<strong>' + market.distance + ' km</strong> away' +
      '</div>' +
      '<div class="mk-info-chip">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>' +
        market.hours +
      '</div>' +
      '<div class="mk-info-chip">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>' +
        market.address +
      '</div>' +
    '</div>' +

    '<div class="mk-detail-section-title">Ingredient Availability & Prices</div>' +
    '<div class="mk-ingredient-table">' + headerRow + rowsHTML + '</div>';

  /* Re-bind close (inner was rebuilt) */
  document.getElementById('mk-detail-close').addEventListener('click', closeDetail);

  panel.classList.add('open');

  /* Scroll into view */
  setTimeout(function () {
    panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, 100);
}

function closeDetail() {
  document.getElementById('mk-detail-panel').classList.remove('open');
  selectedMarketId = null;
  renderMap();
  renderList();
}
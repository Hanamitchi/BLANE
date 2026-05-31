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
    mapX: 52,   /* percent position on SVG map */
    mapY: 44,
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
    mapX: 65,
    mapY: 36,
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
    mapX: 38,
    mapY: 58,
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
    mapX: 72,
    mapY: 62,
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
    mapX: 58,
    mapY: 68,
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
    mapX: 42,
    mapY: 30,
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
    mapX: 47,
    mapY: 50,
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

  /* Locate button (demo) */
  document.getElementById('mk-locate-btn').addEventListener('click', function () {
    alert('Location detected: Tarlac City, Central Luzon\n\n(Live geolocation will use navigator.geolocation in production)');
  });

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
   SVG MAP
   ============================================================ */
function renderMap() {
  const svg    = document.getElementById('mk-map-svg');
  const W      = 100; /* viewBox percent coords */
  const H      = 100;
  const filtered = getFiltered();
  const filteredIds = filtered.map(function (m) { return m.id; });

  svg.innerHTML = '';
  svg.setAttribute('viewBox', '0 0 100 100');
  svg.setAttribute('preserveAspectRatio', 'xMidYMid slice');

  /* ---- Background grid ---- */
  const defs = mkSVG('defs');
  const pattern = mkSVG('pattern');
  setAttrs(pattern, { id: 'grid', width: '8', height: '8', patternUnits: 'userSpaceOnUse' });
  const pPath = mkSVG('path');
  setAttrs(pPath, { d: 'M 8 0 L 0 0 0 8', fill: 'none', stroke: 'rgba(45,220,122,0.06)', 'stroke-width': '0.3' });
  pattern.appendChild(pPath);
  defs.appendChild(pattern);
  svg.appendChild(defs);

  /* Background */
  const bg = mkSVG('rect');
  setAttrs(bg, { width: '100', height: '100', fill: '#060d0a' });
  svg.appendChild(bg);

  /* Grid overlay */
  const gridRect = mkSVG('rect');
  setAttrs(gridRect, { width: '100', height: '100', fill: 'url(#grid)' });
  svg.appendChild(gridRect);

  /* ---- Stylized road lines ---- */
  const roads = [
    'M 0 50 Q 30 48 50 50 T 100 52',
    'M 50 0 Q 52 30 50 50 T 48 100',
    'M 0 30 Q 40 32 70 28 T 100 35',
    'M 20 100 Q 22 70 45 55',
    'M 100 75 Q 75 73 55 68',
  ];
  roads.forEach(function (d) {
    const road = mkSVG('path');
    setAttrs(road, { d: d, fill: 'none', stroke: 'rgba(45,220,122,0.1)', 'stroke-width': '1.2', 'stroke-linecap': 'round' });
    svg.appendChild(road);
  });

  /* ---- User location pin ---- */
  const userX = 50, userY = 50;
  const pulse = mkSVG('circle');
  setAttrs(pulse, { cx: userX, cy: userY, r: '10', fill: 'none', stroke: 'rgba(45,220,122,0.35)', 'stroke-width': '0.8' });
  pulse.classList.add('mk-user-pulse');
  svg.appendChild(pulse);

  const userDot = mkSVG('circle');
  setAttrs(userDot, { cx: userX, cy: userY, r: '3.5', fill: '#2ddc7a', stroke: '#060d0a', 'stroke-width': '1' });
  svg.appendChild(userDot);

  const userLabel = mkSVG('text');
  setAttrs(userLabel, { x: userX + 5, y: userY - 5, fill: '#2ddc7a', 'font-size': '3.5', 'font-family': 'Syne, sans-serif', 'font-weight': '600' });
  userLabel.textContent = 'You';
  svg.appendChild(userLabel);

  /* ---- Market pins ---- */
  MARKETS.forEach(function (market) {
    const isFiltered = filteredIds.includes(market.id);
    const isSelected = market.id === selectedMarketId;
    const meta       = TYPE_META[market.type] || TYPE_META.grocery;
    const color      = market.open ? meta.color : '#4d6e5a';
    const opacity    = isFiltered ? 1 : 0.25;

    const group = mkSVG('g');
    group.style.cursor  = 'pointer';
    group.style.opacity = opacity;

    /* Shadow */
    const shadow = mkSVG('ellipse');
    setAttrs(shadow, { cx: market.mapX, cy: market.mapY + 6.5, rx: '4', ry: '1.5', fill: 'rgba(0,0,0,0.4)' });
    group.appendChild(shadow);

    /* Pin body (teardrop shape) */
    const pinPath = mkSVG('path');
    const px = market.mapX, py = market.mapY;
    setAttrs(pinPath, {
      d: 'M ' + px + ' ' + (py + 7) + ' C ' + (px - 5) + ' ' + (py + 2) + ' ' + (px - 5) + ' ' + (py - 5) + ' ' + px + ' ' + (py - 5) + ' C ' + (px + 5) + ' ' + (py - 5) + ' ' + (px + 5) + ' ' + (py + 2) + ' ' + px + ' ' + (py + 7) + ' Z',
      fill: isSelected ? color : (market.open ? color : '#4d6e5a'),
      stroke: isSelected ? '#e8f5ee' : 'rgba(6,13,10,0.6)',
      'stroke-width': isSelected ? '0.8' : '0.5',
      filter: isSelected ? 'drop-shadow(0 0 3px ' + color + ')' : 'none',
    });
    group.appendChild(pinPath);

    /* Pin center dot */
    const pinDot = mkSVG('circle');
    setAttrs(pinDot, { cx: px, cy: py, r: '1.5', fill: '#060d0a' });
    group.appendChild(pinDot);

    /* Distance label */
    const distLabel = mkSVG('text');
    setAttrs(distLabel, { x: px, y: py - 8, 'text-anchor': 'middle', fill: '#8aab96', 'font-size': '2.8', 'font-family': 'DM Sans, sans-serif' });
    distLabel.textContent = market.distance + 'km';
    group.appendChild(distLabel);

    /* Hover tooltip & click */
    group.addEventListener('mouseenter', function (e) { showTooltip(e, market); });
    group.addEventListener('mouseleave', hideTooltip);
    group.addEventListener('click',      function ()  { selectMarket(market.id); });

    svg.appendChild(group);
  });
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

/* ============================================================
   MAP TOOLTIP
   ============================================================ */
function showTooltip(e, market) {
  const tip  = document.getElementById('mk-map-tooltip');
  const wrap = document.getElementById('mk-map-wrap');
  const rect = wrap.getBoundingClientRect();
  const meta = TYPE_META[market.type] || TYPE_META.grocery;

  tip.querySelector('.mk-map-tooltip-name').textContent = market.name;
  tip.querySelector('.mk-map-tooltip-meta').textContent =
    meta.label + ' · ' + market.distance + ' km · ' + (market.open ? 'Open' : 'Closed');

  tip.classList.add('visible');

  /* Position near cursor */
  const x = e.clientX - rect.left + 12;
  const y = e.clientY - rect.top  - 10;
  tip.style.left = Math.min(x, wrap.offsetWidth - 200) + 'px';
  tip.style.top  = Math.max(y - tip.offsetHeight, 8) + 'px';
}

function hideTooltip() {
  document.getElementById('mk-map-tooltip').classList.remove('visible');
}

/* ============================================================
   SVG HELPERS
   ============================================================ */
function mkSVG(tag) {
  return document.createElementNS('http://www.w3.org/2000/svg', tag);
}

function setAttrs(el, attrs) {
  Object.keys(attrs).forEach(function (k) { el.setAttribute(k, attrs[k]); });
}

/* ============================================================
   GOOGLE MAPS INTEGRATION (uncomment when API key is ready)
   ============================================================
   Replace the SVG map block in markets.html with:
   <div id="google-map" style="width:100%;height:100%;"></div>

   Then replace renderMap() with:

   let googleMap;
   function renderMap() {
     if (!googleMap) {
       googleMap = new google.maps.Map(document.getElementById('google-map'), {
         center: { lat: 15.4755, lng: 120.5963 },  // Tarlac City
         zoom: 14,
         styles: [ ... dark theme styles ... ]
       });
     }
     const filtered = getFiltered();
     MARKETS.forEach(function (market) {
       if (!filtered.find(function(m){ return m.id === market.id; })) return;
       new google.maps.Marker({
         position: { lat: market.lat, lng: market.lng },
         map: googleMap,
         title: market.name,
         icon: { path: google.maps.SymbolPath.CIRCLE, scale: 8,
                 fillColor: TYPE_META[market.type].color, fillOpacity: 1,
                 strokeColor: '#060d0a', strokeWeight: 2 }
       }).addListener('click', function () { selectMarket(market.id); });
     });
   }

   Add to each market object: lat & lng coordinates.
   Load script: <script src="https://maps.googleapis.com/maps/api/js?key=YOUR_KEY&callback=renderMap"></script>
   ============================================================ */
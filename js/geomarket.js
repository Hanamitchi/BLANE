/* ============================================================
   BLANE — GeoMarket Ingredient Scanner (Module 04)

   Features:
   1. GPS location via navigator.geolocation → sorts markets
      by real distance
   2. Ingredient Search → which markets carry it + price
   3. Meal Plan Scan → full availability matrix
   4. Missing ingredients → locally available substitutes

   Depends on: supabase-config.js, auth.js, markets.js (MARKETS)
   ============================================================ */

/* ============================================================
   SUBSTITUTE LOOKUP TABLE
   ingredient name (lowercase) → array of substitute options
   ============================================================ */
const SUBSTITUTES = {
  'broccoli':        [{ name: 'Pechay (Bok Choy)', icon: '🥬', note: 'Similar texture, high in vitamins' },
                      { name: 'Cabbage',            icon: '🥦', note: 'Widely available, cheaper' },
                      { name: 'Sitaw (String Beans)', icon: '🫘', note: 'Local and in season' }],
  'ampalaya leaves': [{ name: 'Malunggay',          icon: '🌿', note: 'More nutritious, easier to find' },
                      { name: 'Kangkong',            icon: '🥬', note: 'Very affordable and local' }],
  'ampalaya':        [{ name: 'Upo (Bottle Gourd)',  icon: '🫙', note: 'Mild flavor, same use case' },
                      { name: 'Patola',              icon: '🥒', note: 'Similar texture when cooked' }],
  'okra':            [{ name: 'Sitaw (String Beans)', icon: '🫘', note: 'Good texture substitute' },
                      { name: 'Upo',                  icon: '🫙', note: 'Commonly available' }],
  'greek yogurt':    [{ name: 'Kesong Puti',         icon: '🧀', note: 'Local white cheese, similar protein' },
                      { name: 'Plain Yogurt',         icon: '🥛', note: 'Available at Puregold/SM' }],
  'sesame oil':      [{ name: 'Vegetable Oil',        icon: '🫙', note: 'Use sparingly as substitute' },
                      { name: 'Toasted Sesame Seeds', icon: '🌾', note: 'Add for aroma instead' }],
  'brown rice':      [{ name: 'Sinandomeng Rice',    icon: '🍚', note: 'Local variety, widely available' },
                      { name: 'Quinoa',               icon: '🌾', note: 'At SM/Robinsons health section' }],
  'default':         [{ name: 'Check local palengke', icon: '🏪', note: 'Vendors may carry seasonal alternatives' },
                      { name: 'Ask market vendor',    icon: '💬', note: 'Local vendors often suggest substitutes' }],
};

/* Today's demo meal plan ingredients (from mealplan MEAL_DB) */
const TODAY_PLAN_INGREDIENTS = [
  'Eggs', 'Malunggay', 'Garlic', 'Onion', 'Cooking oil',
  'Chicken breast', 'Brown rice', 'Broccoli', 'Soy sauce',
  'Bangus', 'Kangkong', 'Tamarind mix', 'Ripe banana', 'Peanut butter',
];

/* Quick search suggestions */
const QUICK_SUGGESTIONS = [
  'Eggs', 'Chicken', 'Malunggay', 'Kangkong', 'Bangus',
  'Brown rice', 'Garlic', 'Broccoli', 'Pork',
];

/* ============================================================
   STATE
   ============================================================ */
let gmUserCoords   = null;   /* { lat, lng } from GPS */
let gmActiveTab    = 'search';
let gmScanDone     = false;
let gmSearchResults = [];

/* ============================================================
   INIT
   ============================================================ */
document.addEventListener('DOMContentLoaded', function () {
  buildScannerSection();
  bindGpsBadge();
});

/* ============================================================
   BUILD SCANNER SECTION HTML
   ============================================================ */
function buildScannerSection() {
  const container = document.getElementById('gm-scanner-root');
  if (!container) return;

  container.innerHTML =
    '<div class="gm-scanner">' +

    /* Header */
    '<div class="gm-header">' +
      '<div class="gm-header-left">' +
        '<div class="gm-header-icon">🔍</div>' +
        '<div>' +
          '<div class="gm-title">GeoMarket Ingredient Scanner</div>' +
          '<div class="gm-sub">Find ingredients at nearby markets · Module 04</div>' +
        '</div>' +
      '</div>' +
      '<button class="gm-gps-badge" id="gm-gps-btn">' +
        '📡 Enable GPS Location' +
      '</button>' +
    '</div>' +

    /* Tabs */
    '<div class="gm-tabs">' +
      '<button class="gm-tab active" data-tab="search">' +
        '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>' +
        'Search Ingredient' +
      '</button>' +
      '<button class="gm-tab" data-tab="scan">' +
        '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>' +
        'Scan Meal Plan' +
      '</button>' +
      '<button class="gm-tab" data-tab="subs">' +
        '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>' +
        'Substitutes' +
      '</button>' +
    '</div>' +

    /* Tab body */
    '<div class="gm-tab-body">' +

      /* Tab 1 — Search */
      '<div class="gm-panel active" id="gm-panel-search">' +
        '<div class="gm-search-row">' +
          '<div class="gm-search-wrap">' +
            '<span class="gm-search-icon">🔍</span>' +
            '<input class="gm-search-input" type="text" id="gm-search-input" placeholder="e.g. Malunggay, Bangus, Broccoli..." />' +
          '</div>' +
          '<button class="gm-search-btn" id="gm-search-btn">Search</button>' +
        '</div>' +
        '<div class="gm-quick-pills" id="gm-quick-pills"></div>' +
        '<div class="gm-search-results" id="gm-search-results">' +
          '<div class="gm-no-results" style="color:#4d6e5a;font-size:13px;padding:16px 0;">Type an ingredient above or tap a suggestion to search.</div>' +
        '</div>' +
      '</div>' +

      /* Tab 2 — Meal Plan Scan */
      '<div class="gm-panel" id="gm-panel-scan">' +
        '<div class="gm-scan-btn-row">' +
          '<button class="gm-scan-btn" id="gm-scan-btn">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>' +
            'Scan Today\'s Meal Plan' +
          '</button>' +
          '<span class="gm-scan-meta" id="gm-scan-meta">' + TODAY_PLAN_INGREDIENTS.length + ' ingredients to scan</span>' +
        '</div>' +
        '<div id="gm-scan-output"></div>' +
      '</div>' +

      /* Tab 3 — Substitutes */
      '<div class="gm-panel" id="gm-panel-subs">' +
        '<p class="gm-sub-intro">Missing ingredients from your meal plan that cannot be found at nearby markets, with locally available alternatives.</p>' +
        '<div class="gm-missing-list" id="gm-missing-list">' +
          '<div class="gm-no-results" style="color:#4d6e5a;font-size:13px;padding:12px 0;">Run <strong style="color:#e8f5ee;">Scan Meal Plan</strong> first to identify missing ingredients.</div>' +
        '</div>' +
      '</div>' +

    '</div>' + /* /gm-tab-body */
    '</div>'; /* /gm-scanner */

  /* Bind tabs */
  container.querySelectorAll('.gm-tab').forEach(function (tab) {
    tab.addEventListener('click', function () {
      gmActiveTab = tab.getAttribute('data-tab');
      container.querySelectorAll('.gm-tab').forEach(function (t) { t.classList.remove('active'); });
      container.querySelectorAll('.gm-panel').forEach(function (p) { p.classList.remove('active'); });
      tab.classList.add('active');
      document.getElementById('gm-panel-' + gmActiveTab).classList.add('active');
    });
  });

  /* Search bindings */
  const searchInput = document.getElementById('gm-search-input');
  const searchBtn   = document.getElementById('gm-search-btn');
  searchBtn.addEventListener('click', function () { runIngredientSearch(searchInput.value.trim()); });
  searchInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') runIngredientSearch(searchInput.value.trim());
  });

  /* Quick pills */
  buildQuickPills();

  /* Scan button */
  document.getElementById('gm-scan-btn').addEventListener('click', runMealPlanScan);
}

/* ============================================================
   GPS
   (Delegates to the single GPS flow in markets.js so there is
    only one source of truth for user location + distances.)
   ============================================================ */
function bindGpsBadge() {
  const btn = document.getElementById('gm-gps-btn');
  if (!btn) return;

  btn.addEventListener('click', function () {
    if (!navigator.geolocation) {
      btn.textContent = '❌ GPS not supported';
      return;
    }
    btn.className   = 'gm-gps-badge locating';
    btn.textContent = '📡 Locating...';

    /* Reuse markets.js locateUser() — it sets userCoords, drops the
       "you are here" pin, recalculates real distances, and updates
       the location bar. We just reflect the result in this badge. */
    if (typeof locateUser === 'function') {
      locateUser();
    }

    /* Poll briefly for the result set by markets.js */
    const checkInterval = setInterval(function () {
      if (typeof userCoords !== 'undefined' && userCoords) {
        clearInterval(checkInterval);
        gmUserCoords     = userCoords;
        btn.className    = 'gm-gps-badge located';
        btn.textContent  = '✓ GPS: ' + userCoords.lat.toFixed(4) + ', ' + userCoords.lng.toFixed(4);
        if (typeof renderList === 'function') renderList();
      }
    }, 400);
    setTimeout(function () {
      clearInterval(checkInterval);
      if (!gmUserCoords) {
        btn.className   = 'gm-gps-badge';
        btn.textContent = '⚠️ GPS denied — using default location';
      }
    }, 11000);
  });
}

/* ============================================================
   TAB 1 — INGREDIENT SEARCH
   ============================================================ */
function buildQuickPills() {
  const wrap = document.getElementById('gm-quick-pills');
  if (!wrap) return;
  QUICK_SUGGESTIONS.forEach(function (ing) {
    const pill = document.createElement('button');
    pill.className   = 'gm-quick-pill';
    pill.textContent = ing;
    pill.addEventListener('click', function () {
      document.getElementById('gm-search-input').value = ing;
      runIngredientSearch(ing);
    });
    wrap.appendChild(pill);
  });
}

function runIngredientSearch(query) {
  const resultsEl = document.getElementById('gm-search-results');
  if (!query) return;

  const q       = query.toLowerCase().trim();
  const matches = [];

  /* Search through all markets */
  if (typeof MARKETS !== 'undefined') {
    MARKETS.forEach(function (market) {
      const found = market.ingredients.filter(function (ing) {
        return ing.name.toLowerCase().includes(q);
      });
      if (found.length > 0) {
        matches.push({ market, ingredients: found });
      }
    });
  }

  resultsEl.innerHTML = '';

  if (matches.length === 0) {
    resultsEl.innerHTML =
      '<div class="gm-no-results">No markets found carrying <strong style="color:#e8f5ee;">"' + escHtml(query) + '"</strong>.<br>' +
      'Check the <strong>Substitutes</strong> tab for alternatives.</div>';
    return;
  }

  /* Sort by open → distance */
  matches.sort(function (a, b) {
    if (a.market.open !== b.market.open) return b.market.open ? 1 : -1;
    return a.market.distance - b.market.distance;
  });

  matches.forEach(function (m, i) {
    const block = document.createElement('div');
    block.className  = 'gm-result-market';
    block.style.animationDelay = (i * 0.06) + 's';

    const ingRows = m.ingredients.map(function (ing) {
      return '<div class="gm-result-ing-row">' +
        '<div class="gm-result-ing-name"><div class="gm-result-ing-dot"></div>' + ing.name + '</div>' +
        '<div class="gm-result-ing-price">' + (ing.price || '—') + '</div>' +
        '<span class="gm-result-ing-status ' + ing.status + '">' +
          (ing.status === 'avail' ? '✓ Available' : ing.status === 'limited' ? '⚠ Limited' : '✕ Unavail') +
        '</span>' +
      '</div>';
    }).join('');

    block.innerHTML =
      '<div class="gm-result-market-header">' +
        '<span class="gm-result-market-icon">' + m.market.icon + '</span>' +
        '<span class="gm-result-market-name">' + m.market.name + '</span>' +
        '<span class="gm-result-market-dist">' + m.market.distance + ' km · ' +
          (m.market.open ? '<span style="color:#2ddc7a;">Open</span>' : '<span style="color:#f87171;">Closed</span>') +
        '</span>' +
      '</div>' +
      ingRows;

    resultsEl.appendChild(block);
  });
}

/* ============================================================
   TAB 2 — MEAL PLAN SCAN
   ============================================================ */
function runMealPlanScan() {
  const output = document.getElementById('gm-scan-output');
  const btn    = document.getElementById('gm-scan-btn');

  btn.textContent = 'Scanning...';
  btn.disabled    = true;

  setTimeout(function () {
    btn.textContent = 'Scan Today\'s Meal Plan';
    btn.disabled    = false;
    gmScanDone      = true;

    const scanData = buildScanMatrix();
    renderScanMatrix(output, scanData);
    renderSubstitutes(scanData.missing);
  }, 600); /* Simulated scan delay */
}

function buildScanMatrix() {
  const markets   = typeof MARKETS !== 'undefined' ? MARKETS.slice(0, 5) : [];
  const allIngs   = TODAY_PLAN_INGREDIENTS;
  const found     = [];
  const missing   = [];
  const limited   = [];

  /* For each ingredient, check each market */
  const matrix = allIngs.map(function (ingName) {
    const row = { name: ingName, markets: {} };
    let anyFound = false;
    let anyLimited = false;

    markets.forEach(function (market) {
      const match = market.ingredients.find(function (mi) {
        return mi.name.toLowerCase().includes(ingName.toLowerCase()) ||
               ingName.toLowerCase().includes(mi.name.toLowerCase().split(' ')[0]);
      });

      if (match) {
        row.markets[market.id] = match.status;
        if (match.status === 'avail')   anyFound   = true;
        if (match.status === 'limited') anyLimited = true;
      } else {
        row.markets[market.id] = 'unknown';
      }
    });

    if      (anyFound)   found.push(ingName);
    else if (anyLimited) limited.push(ingName);
    else                 missing.push(ingName);

    return row;
  });

  return { matrix, markets, found, missing, limited, allIngs };
}

function renderScanMatrix(output, data) {
  const { matrix, markets, found, missing, limited } = data;

  /* Summary chips */
  const summaryHTML =
    '<div class="gm-scan-summary">' +
      '<div class="gm-summary-chip found">✓ ' + found.length   + ' Available</div>' +
      '<div class="gm-summary-chip limited">⚠ ' + limited.length + ' Limited</div>' +
      '<div class="gm-summary-chip missing">✕ ' + missing.length + ' Not Found</div>' +
    '</div>';

  /* Matrix table */
  const marketHeaders = markets.map(function (m) {
    return '<th class="market-col">' + m.icon + '<br>' +
      '<span style="font-size:10px;">' + m.name.split(' ')[0] + '</span>' +
    '</th>';
  }).join('');

  const rows = matrix.map(function (row) {
    const cells = markets.map(function (m) {
      const status = row.markets[m.id] || 'unknown';
      const sym    = status === 'avail' ? '✓' : status === 'limited' ? '⚠' : status === 'unavail' ? '✕' : '?';
      return '<td class="gm-matrix-status-cell"><div class="gm-matrix-dot ' + status + '">' + sym + '</div></td>';
    }).join('');

    return '<tr><td class="gm-matrix-ing-cell">' + row.name + '</td>' + cells + '</tr>';
  }).join('');

  /* Best market (most ingredients available) */
  const marketScores = markets.map(function (m) {
    let score = 0;
    matrix.forEach(function (row) { if (row.markets[m.id] === 'avail') score++; });
    return { market: m, score };
  }).sort(function (a, b) { return b.score - a.score; });

  const best = marketScores[0];
  const bestBanner = best
    ? '<div class="gm-best-market">' +
        '<span class="gm-best-icon">🏆</span>' +
        '<div class="gm-best-text">' +
          '<strong>Best market: ' + best.market.name + '</strong>' +
          'Carries ' + best.score + ' of ' + data.allIngs.length + ' ingredients from today\'s meal plan' +
          (best.market.open ? ' · Currently Open' : ' · Currently Closed') +
        '</div>' +
      '</div>'
    : '';

  output.innerHTML =
    summaryHTML +
    '<div class="gm-matrix-wrap">' +
      '<table class="gm-matrix">' +
        '<thead><tr>' +
          '<th>Ingredient</th>' + marketHeaders +
        '</tr></thead>' +
        '<tbody>' + rows + '</tbody>' +
      '</table>' +
    '</div>' +
    bestBanner;
}

/* ============================================================
   TAB 3 — SUBSTITUTES
   ============================================================ */
function renderSubstitutes(missingList) {
  const wrap = document.getElementById('gm-missing-list');
  if (!wrap) return;

  if (!missingList || missingList.length === 0) {
    wrap.innerHTML =
      '<div class="gm-all-found">' +
        '<span class="gm-all-found-icon">🎉</span>' +
        'All ingredients from today\'s meal plan are available at nearby markets!' +
      '</div>';
    return;
  }

  wrap.innerHTML = '';

  missingList.forEach(function (ingName, i) {
    const key  = ingName.toLowerCase();
    const subs = SUBSTITUTES[key] || SUBSTITUTES['default'];

    const subOpts = subs.map(function (s) {
      /* Find which market carries this substitute */
      let whereStr = 'Check local markets';
      if (typeof MARKETS !== 'undefined') {
        const carrier = MARKETS.find(function (m) {
          return m.availableTags.some(function (t) {
            return t.toLowerCase().includes(s.name.toLowerCase().split(' ')[0]);
          });
        });
        if (carrier) whereStr = carrier.name;
      }

      return '<div class="gm-sub-option">' +
        '<div class="gm-sub-option-name">' +
          '<span class="gm-sub-option-icon">' + s.icon + '</span>' + s.name +
        '</div>' +
        '<span class="gm-sub-option-where">' + whereStr + '</span>' +
        '<span class="gm-sub-option-avail">Available</span>' +
      '</div>' +
      '<div style="font-size:11px;color:#4d6e5a;padding:2px 12px 4px;">' + s.note + '</div>';
    }).join('');

    const block = document.createElement('div');
    block.className = 'gm-missing-item';
    block.style.animationDelay = (i * 0.08) + 's';
    block.innerHTML =
      '<div class="gm-missing-header">' +
        '<span style="font-size:18px;">❌</span>' +
        '<span class="gm-missing-name">' + ingName + '</span>' +
        '<span class="gm-missing-tag">Not found nearby</span>' +
      '</div>' +
      '<div class="gm-sub-list">' +
        '<div class="gm-sub-label">Suggested substitutes</div>' +
        subOpts +
      '</div>';

    wrap.appendChild(block);
  });
}

/* ============================================================
   HELPER
   ============================================================ */
function escHtml(str) {
  return str.replace(/[&<>"']/g, function (c) {
    return { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c];
  });
}
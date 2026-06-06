/* ============================================================
   BLANE — Dashboard Module
   Handles: session guard, profile load, widget interactions
   Depends on: supabase-config.js, auth.js
   ============================================================ */

document.addEventListener('DOMContentLoaded', async function () {

  /* ---- Session guard ---- */
  const session = await guardPage();
  if (!session) return;

  /* ---- Load profile from Supabase ---- */
  /* Profile data for populating widgets */
  const { data: profile } = await _supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .maybeSingle();

  /* ---- Populate UI with profile data ---- */
  initGreeting(profile);
  initDateHeader();
  initBmiWidget(profile);
  initMealTabs();
  initWaterTracker();
  initMarketWidget();
  initNavDropdown();
  initMobileNav();

  /* ---- Module 01: Real-Time Body Feedback Loop ---- */
  if (typeof initFeedbackLoop === 'function') {
    await initFeedbackLoop(session, profile);
  }

  /* ---- Module 02: Health Drift Detection ---- */
  if (typeof initDriftDetection === 'function') {
    initDriftDetection(session, profile, typeof fbLogs !== 'undefined' ? fbLogs : []);
  }

});


/* ============================================================
   GREETING & DATE
   ============================================================ */
function initGreeting(profile) {
  const name      = (profile.full_name || 'there').split(' ')[0];
  const greetEl   = document.getElementById('dash-greeting-name');
  const avatarEl  = document.getElementById('dash-avatar-initials');

  if (greetEl)  greetEl.textContent = name;
  if (avatarEl) avatarEl.textContent = name.charAt(0).toUpperCase();

  /* Dropdown name */
  const dropName = document.getElementById('dropdown-full-name');
  const dropEmail = document.getElementById('dropdown-email');
  if (dropName)  dropName.textContent  = profile.full_name  || name;

  /* Fill email from session */
  _supabase.auth.getSession().then(function ({ data: { session } }) {
    if (session && dropEmail) dropEmail.textContent = session.user.email;
  });
}

function initDateHeader() {
  const el = document.getElementById('dash-date');
  if (!el) return;
  const now = new Date();
  el.textContent = now.toLocaleDateString('en-PH', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
}


/* ============================================================
   AVATAR DROPDOWN
   ============================================================ */
function initNavDropdown() {
  const avatarBtn = document.getElementById('dash-avatar-btn');
  const dropdown  = document.getElementById('dash-dropdown');
  if (!avatarBtn || !dropdown) return;

  avatarBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    dropdown.classList.toggle('open');
  });

  document.addEventListener('click', function () {
    dropdown.classList.remove('open');
  });

  dropdown.addEventListener('click', function (e) {
    e.stopPropagation();
  });
}


/* ============================================================
   MOBILE NAV
   ============================================================ */
function initMobileNav() {
  const hamburger  = document.getElementById('dash-hamburger');
  const mobileNav  = document.getElementById('dash-mobile-nav');
  if (!hamburger || !mobileNav) return;

  hamburger.addEventListener('click', function () {
    mobileNav.classList.toggle('open');
  });

  mobileNav.querySelectorAll('a').forEach(function (link) {
    link.addEventListener('click', function () {
      mobileNav.classList.remove('open');
    });
  });
}


/* ============================================================
   WIDGET 2 — BMI & BODY STATS
   ============================================================ */
function initBmiWidget(profile) {
  const h = profile.height_cm;
  const w = profile.weight_kg;
  if (!h || !w) return;

  const bmi     = w / ((h / 100) * (h / 100));
  const bmiFixed = bmi.toFixed(1);

  /* Category */
  let category = 'Normal';
  let color    = '#2ddc7a';
  if      (bmi < 18.5) { category = 'Underweight'; color = '#60a5fa'; }
  else if (bmi < 25)   { category = 'Normal';       color = '#2ddc7a'; }
  else if (bmi < 30)   { category = 'Overweight';   color = '#fbbf24'; }
  else                 { category = 'Obese';         color = '#f87171'; }

  /* Update DOM */
  setEl('bmi-number',        bmiFixed);
  setEl('bmi-category-name', category);
  setEl('bmi-category-desc', bmiDescription(category));
  setEl('stat-height',       h + ' cm');
  setEl('stat-weight',       w + ' kg');
  setEl('stat-bmi-val',      bmiFixed);

  /* Ring arc */
  const ringFill = document.getElementById('bmi-ring-fill');
  if (ringFill) {
    const pct       = Math.min(bmi / 40, 1);
    const circumf   = 2 * Math.PI * 36;
    const dash      = pct * circumf;
    ringFill.setAttribute('stroke-dasharray', dash + ' ' + circumf);
    ringFill.setAttribute('stroke', color);
  }

  /* Scale marker — maps BMI 10-40 to 0-100% */
  const marker = document.getElementById('bmi-scale-marker');
  if (marker) {
    const pctScale = Math.min(Math.max((bmi - 10) / 30, 0), 1) * 100;
    marker.style.left = pctScale + '%';
  }

  /* Ideal weight range */
  const idealLow  = (18.5 * (h / 100) * (h / 100)).toFixed(1);
  const idealHigh = (24.9 * (h / 100) * (h / 100)).toFixed(1);
  setEl('stat-ideal-range', idealLow + ' – ' + idealHigh + ' kg');
}

function bmiDescription(category) {
  const map = {
    'Underweight': 'Your BMI is below the healthy range. Consider a calorie surplus plan.',
    'Normal':      'Your BMI is within the healthy range. Keep up the great work!',
    'Overweight':  'Your BMI is slightly above normal. A moderate deficit may help.',
    'Obese':       'Your BMI indicates obesity. Please consult a healthcare provider.',
  };
  return map[category] || '';
}

function setEl(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}


/* ============================================================
   WIDGET 1 — MEAL TABS
   ============================================================ */
function initMealTabs() {
  const tabs   = document.querySelectorAll('.meal-tab-btn');
  const panels = document.querySelectorAll('.meal-panel');

  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      const target = tab.getAttribute('data-meal');

      tabs.forEach(function (t)   { t.classList.remove('active'); });
      panels.forEach(function (p) { p.classList.remove('active'); });

      tab.classList.add('active');
      const panel = document.getElementById('meal-' + target);
      if (panel) panel.classList.add('active');
    });
  });

  /* Animate calorie bar on load */
  setTimeout(function () {
    const bar = document.getElementById('daily-cal-bar');
    if (bar) bar.style.width = bar.getAttribute('data-width');
  }, 500);
}


/* ============================================================
   WIDGET 3 — WATER TRACKER
   ============================================================ */
const WATER_GOAL_ML  = 2400;
const ML_PER_CUP     = 300;
const TOTAL_CUPS     = Math.round(WATER_GOAL_ML / ML_PER_CUP); /* 8 cups */

let filledCups = 0;

function initWaterTracker() {
  /* Load saved cups from sessionStorage (resets on browser close) */
  const saved = sessionStorage.getItem('blane_water_cups');
  if (saved !== null) filledCups = parseInt(saved);

  renderCups();
  updateWaterDisplay();
}

function renderCups() {
  const grid = document.getElementById('water-cups-grid');
  if (!grid) return;
  grid.innerHTML = '';
  for (let i = 0; i < TOTAL_CUPS; i++) {
    const cup = document.createElement('div');
    cup.className = 'water-cup' + (i < filledCups ? ' filled' : '');
    cup.textContent = i < filledCups ? '💧' : '🫙';
    cup.setAttribute('data-index', i);
    cup.addEventListener('click', function () {
      const idx = parseInt(cup.getAttribute('data-index'));
      /* Toggle: clicking a filled cup unfills from that point */
      filledCups = (idx < filledCups) ? idx : idx + 1;
      sessionStorage.setItem('blane_water_cups', filledCups);
      renderCups();
      updateWaterDisplay();
    });
    grid.appendChild(cup);
  }
}

function updateWaterDisplay() {
  const ml    = filledCups * ML_PER_CUP;
  const pct   = Math.round((ml / WATER_GOAL_ML) * 100);
  const liter = (ml / 1000).toFixed(1);

  setEl('water-consumed-val', liter);

  const bar = document.getElementById('water-progress-fill');
  if (bar) bar.style.width = pct + '%';

  setEl('water-cups-label', filledCups + ' / ' + TOTAL_CUPS + ' cups');
}


/* ============================================================
   WIDGET 4 — MARKET (static demo data)
   ============================================================ */
function initMarketWidget() {
  const searchBtn   = document.getElementById('market-search-btn');
  const searchInput = document.getElementById('market-search-input');
  if (!searchBtn || !searchInput) return;

  searchBtn.addEventListener('click', function () {
    const query = searchInput.value.trim();
    if (!query) return;
    /* TODO: integrate real GeoMarket API / Supabase RPC */
  });

  searchInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') searchBtn.click();
  });
}
/* ============================================================
   BLANE — Meal Plan Module
   Handles: week nav, day view, meal slots, swap modal,
            grocery list, add-slot modal
   Depends on: supabase-config.js, auth.js
   ============================================================ */

/* ============================================================
   MEAL DATA (demo — replace with Supabase fetch later)
   ============================================================ */
const MEAL_DB = [
  {
    id: 'm1', emoji: '🍳', name: 'Egg & Malunggay Scramble',
    type: 'Breakfast', time: '7:00 AM', prep: '15 min', kcal: 380, cost: 45,
    protein: 24, carbs: 18, fats: 12,
    ingredients: [
      { name: 'Eggs',           qty: '2 pcs',     status: 'avail' },
      { name: 'Malunggay',      qty: '1 handful',  status: 'avail' },
      { name: 'Garlic',         qty: '2 cloves',   status: 'avail' },
      { name: 'Cooking oil',    qty: '1 tsp',      status: 'avail' },
    ],
  },
  {
    id: 'm2', emoji: '🥗', name: 'Chicken & Veggie Rice Bowl',
    type: 'Lunch', time: '12:00 PM', prep: '25 min', kcal: 520, cost: 95,
    protein: 38, carbs: 52, fats: 10,
    ingredients: [
      { name: 'Chicken breast', qty: '150g',        status: 'avail' },
      { name: 'Brown rice',     qty: '1 cup',       status: 'avail' },
      { name: 'Broccoli',       qty: '80g',         status: 'warn'  },
      { name: 'Soy sauce',      qty: '1 tbsp',      status: 'avail' },
    ],
  },
  {
    id: 'm3', emoji: '🍲', name: 'Sinigang na Isda',
    type: 'Dinner', time: '6:30 PM', prep: '35 min', kcal: 480, cost: 80,
    protein: 32, carbs: 28, fats: 8,
    ingredients: [
      { name: 'Bangus / Tilapia', qty: '200g',     status: 'avail' },
      { name: 'Kangkong',         qty: '1 bundle', status: 'avail' },
      { name: 'Tamarind mix',     qty: '1 pack',   status: 'avail' },
      { name: 'Tomatoes',         qty: '2 pcs',    status: 'avail' },
    ],
  },
  {
    id: 'm4', emoji: '🍌', name: 'Banana & Peanut Butter',
    type: 'Snack', time: '3:00 PM', prep: '5 min', kcal: 210, cost: 25,
    protein: 6, carbs: 30, fats: 8,
    ingredients: [
      { name: 'Ripe banana',    qty: '1 pc',       status: 'avail' },
      { name: 'Peanut butter',  qty: '1 tbsp',     status: 'avail' },
    ],
  },
  {
    id: 'm5', emoji: '🥣', name: 'Oatmeal with Banana & Honey',
    type: 'Breakfast', time: '7:00 AM', prep: '10 min', kcal: 320, cost: 35,
    protein: 10, carbs: 58, fats: 6,
    ingredients: [
      { name: 'Rolled oats',    qty: '1/2 cup',    status: 'avail' },
      { name: 'Banana',         qty: '1 pc',       status: 'avail' },
      { name: 'Honey',          qty: '1 tsp',      status: 'avail' },
      { name: 'Milk',           qty: '1 cup',      status: 'avail' },
    ],
  },
  {
    id: 'm6', emoji: '🍜', name: 'Arroz Caldo',
    type: 'Breakfast', time: '7:30 AM', prep: '30 min', kcal: 340, cost: 50,
    protein: 18, carbs: 48, fats: 7,
    ingredients: [
      { name: 'Glutinous rice', qty: '1/2 cup',    status: 'avail' },
      { name: 'Chicken',        qty: '100g',       status: 'avail' },
      { name: 'Ginger',         qty: '2 slices',   status: 'avail' },
    ],
  },
  {
    id: 'm7', emoji: '🥩', name: 'Grilled Pork Liempo',
    type: 'Lunch', time: '12:00 PM', prep: '40 min', kcal: 560, cost: 110,
    protein: 42, carbs: 10, fats: 28,
    ingredients: [
      { name: 'Pork belly',     qty: '200g',       status: 'avail' },
      { name: 'Calamansi',      qty: '4 pcs',      status: 'avail' },
      { name: 'Garlic',         qty: '4 cloves',   status: 'avail' },
    ],
  },
  {
    id: 'm8', emoji: '🍛', name: 'Monggo Soup',
    type: 'Dinner', time: '6:00 PM', prep: '45 min', kcal: 380, cost: 55,
    protein: 22, carbs: 45, fats: 6,
    ingredients: [
      { name: 'Mung beans',     qty: '1/2 cup',    status: 'avail' },
      { name: 'Ampalaya leaves',qty: '1 handful',  status: 'warn'  },
      { name: 'Garlic & onion', qty: 'to taste',   status: 'avail' },
    ],
  },
];

/* Swap alternatives pool */
const SWAP_POOL = {
  Breakfast: ['m5', 'm6'],
  Lunch:     ['m7'],
  Dinner:    ['m8'],
  Snack:     ['m4'],
};

/* Slot type presets */
const SLOT_PRESETS = [
  { type: 'Breakfast', icon: '🌅', time: '7:00 AM'  },
  { type: 'Brunch',    icon: '🍳', time: '10:00 AM' },
  { type: 'Lunch',     icon: '☀️', time: '12:00 PM' },
  { type: 'Snack',     icon: '🍎', time: '3:00 PM'  },
  { type: 'Dinner',    icon: '🌙', time: '6:30 PM'  },
  { type: 'Supper',    icon: '🌃', time: '9:00 PM'  },
  { type: 'Custom',    icon: '✏️', time: ''          },
];

/* ============================================================
   STATE
   ============================================================ */
let currentWeekOffset = 0;   /* 0 = current week */
let selectedDayIndex  = new Date().getDay(); /* 0=Sun … 6=Sat */

/* daySlots[dayIndex] = [ { slotType, mealId }, ... ] */
const daySlots = {};

/* Grocery list: [ { name, qty, checked } ] */
let groceryList = JSON.parse(sessionStorage.getItem('blane_grocery') || '[]');

let swapTargetSlotKey = null; /* "dayIndex-slotIndex" */

/* ============================================================
   INIT
   ============================================================ */
document.addEventListener('DOMContentLoaded', async function () {
  const session = await guardPage();
  if (!session) return;

  /* ---- Module 03: Dynamic Portion Optimizer ---- */
  if (typeof initOptimizer === 'function') {
    await initOptimizer(session);
  }

  /* ---- Module 07: Explainable AI ---- */
  if (typeof initExplainAI === 'function') {
    await initExplainAI(session);
  }

  /* Seed demo data for today and nearby days */
  seedDemoSlots();

  buildWeekNav();
  renderDayView();
  renderGroceryPanel();

  /* Add-slot modal */
  document.getElementById('add-slot-fab').addEventListener('click', openAddSlotModal);
  document.getElementById('slot-modal-close').addEventListener('click', closeAddSlotModal);
  document.getElementById('slot-modal-overlay').addEventListener('click', function (e) {
    if (e.target === this) closeAddSlotModal();
  });
  document.getElementById('slot-confirm-btn').addEventListener('click', confirmAddSlot);

  /* Slot type option selection */
  document.querySelectorAll('.slot-type-option').forEach(function (opt) {
    opt.addEventListener('click', function () {
      document.querySelectorAll('.slot-type-option').forEach(function (o) { o.classList.remove('selected'); });
      opt.classList.add('selected');
      const isCustom = opt.getAttribute('data-type') === 'Custom';
      document.getElementById('slot-custom-wrap').classList.toggle('show', isCustom);
    });
  });

  /* Swap modal close */
  document.getElementById('swap-close').addEventListener('click', closeSwapModal);
  document.getElementById('swap-modal-overlay').addEventListener('click', function (e) {
    if (e.target === this) closeSwapModal();
  });
  document.getElementById('swap-confirm-btn').addEventListener('click', confirmSwap);

  /* Grocery clear */
  document.getElementById('grocery-clear-btn').addEventListener('click', function () {
    groceryList = [];
    saveGrocery();
    renderGroceryPanel();
  });
});

/* ============================================================
   SEED DEMO DATA
   ============================================================ */
function seedDemoSlots() {
  const today = new Date().getDay();
  /* Today gets breakfast + lunch + snack + dinner */
  daySlots[today] = [
    { type: 'Breakfast', mealId: 'm1' },
    { type: 'Lunch',     mealId: 'm2' },
    { type: 'Snack',     mealId: 'm4' },
    { type: 'Dinner',    mealId: 'm3' },
  ];
  /* Yesterday gets 2 meals */
  const yest = (today + 6) % 7;
  daySlots[yest] = [
    { type: 'Breakfast', mealId: 'm5' },
    { type: 'Dinner',    mealId: 'm8' },
  ];
  /* Tomorrow gets 2 meals */
  const tom = (today + 1) % 7;
  daySlots[tom] = [
    { type: 'Breakfast', mealId: 'm6' },
    { type: 'Lunch',     mealId: 'm7' },
  ];
}

/* ============================================================
   WEEK NAVIGATION
   ============================================================ */
function buildWeekNav() {
  const container = document.getElementById('week-days-container');
  const labelEl   = document.getElementById('week-range-label');
  container.innerHTML = '';

  const today   = new Date();
  const base    = new Date(today);
  /* Get Monday of current week + offset */
  const dayOfWeek = (today.getDay() + 6) % 7; /* Mon=0 */
  base.setDate(today.getDate() - dayOfWeek + currentWeekOffset * 7);

  const days    = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const months  = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const weekStart = new Date(base);
  const weekEnd   = new Date(base); weekEnd.setDate(base.getDate() + 6);
  labelEl.textContent = months[weekStart.getMonth()] + ' ' + weekStart.getDate() +
    ' – ' + months[weekEnd.getMonth()] + ' ' + weekEnd.getDate() + ', ' + weekEnd.getFullYear();

  for (let i = 0; i < 7; i++) {
    const d     = new Date(base);
    d.setDate(base.getDate() + i);
    const jsDay = d.getDay(); /* 0=Sun */
    const isToday   = d.toDateString() === today.toDateString();
    const isActive  = jsDay === selectedDayIndex && currentWeekOffset === 0;
    const hasMeals  = daySlots[jsDay] && daySlots[jsDay].length > 0;

    const btn = document.createElement('button');
    btn.className = 'week-day-btn' +
      (isActive  ? ' active'    : '') +
      (isToday   ? ' today'     : '') +
      (hasMeals  ? ' has-meals' : '');

    btn.innerHTML = '<span class="day-name">' + days[i] + '</span>' +
                    '<span class="day-num">'  + d.getDate() + '</span>' +
                    '<span class="day-dot"></span>';

    btn.addEventListener('click', function () {
      selectedDayIndex = jsDay;
      buildWeekNav();
      renderDayView();
    });

    container.appendChild(btn);
  }
}

document.addEventListener('DOMContentLoaded', function () {
  document.getElementById('week-prev').addEventListener('click', function () {
    currentWeekOffset--; buildWeekNav(); renderDayView();
  });
  document.getElementById('week-next').addEventListener('click', function () {
    currentWeekOffset++; buildWeekNav(); renderDayView();
  });
});

/* ============================================================
   DAY VIEW
   ============================================================ */
function renderDayView() {
  const slots = daySlots[selectedDayIndex] || [];
  const col   = document.getElementById('meal-slots-col');
  col.innerHTML = '';

  /* Day summary */
  const totalKcal = slots.reduce(function (s, slot) {
    const m = getMeal(slot.mealId); return s + (m ? m.kcal : 0);
  }, 0);
  const totalCost = slots.reduce(function (s, slot) {
    const m = getMeal(slot.mealId); return s + (m ? m.cost : 0);
  }, 0);
  const totalProtein = slots.reduce(function (s, slot) {
    const m = getMeal(slot.mealId); return s + (m ? m.protein : 0);
  }, 0);
  const calGoal = 1840;
  const pct = Math.min(Math.round((totalKcal / calGoal) * 100), 100);

  const summaryBar = document.createElement('div');
  summaryBar.className = 'day-summary-bar';
  summaryBar.innerHTML =
    '<div class="day-summary-item">' +
      '<span class="day-summary-label">Calories</span>' +
      '<span class="day-summary-value green">' + totalKcal + ' <small style="font-size:13px;color:#4d6e5a;font-family:\'DM Sans\',sans-serif;font-weight:400;">kcal</small></span>' +
    '</div>' +
    '<div class="day-summary-divider"></div>' +
    '<div class="day-summary-item">' +
      '<span class="day-summary-label">Protein</span>' +
      '<span class="day-summary-value">' + totalProtein + '<small style="font-size:12px;color:#4d6e5a;font-weight:400;font-family:\'DM Sans\',sans-serif;">g</small></span>' +
    '</div>' +
    '<div class="day-summary-divider"></div>' +
    '<div class="day-summary-item">' +
      '<span class="day-summary-label">Est. Cost</span>' +
      '<span class="day-summary-value yellow">₱' + totalCost + '</span>' +
    '</div>' +
    '<div class="day-summary-divider"></div>' +
    '<div class="day-cal-bar-wrap">' +
      '<div class="day-cal-bar-label"><span>Progress</span><span>' + pct + '%</span></div>' +
      '<div class="day-cal-bar-bg"><div class="day-cal-bar-fill" style="width:0%" data-w="' + pct + '%"></div></div>' +
    '</div>';
  col.appendChild(summaryBar);
  setTimeout(function () {
    const bar = summaryBar.querySelector('.day-cal-bar-fill');
    if (bar) bar.style.width = bar.getAttribute('data-w');
  }, 100);

  /* Meal slots */
  if (slots.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-slot';
    empty.innerHTML = '<span class="empty-slot-icon">🍽️</span>No meals planned yet. Add a slot below!';
    col.appendChild(empty);
  } else {
    slots.forEach(function (slot, idx) {
      col.appendChild(buildSlotEl(slot, idx));
    });
  }

  /* Add slot button */
  const addBtn = document.createElement('button');
  addBtn.className = 'add-slot-btn';
  addBtn.id = 'add-slot-fab';
  addBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Add meal slot';
  addBtn.addEventListener('click', openAddSlotModal);
  col.appendChild(addBtn);
}

/* ============================================================
   BUILD SLOT ELEMENT
   ============================================================ */
function buildSlotEl(slot, idx) {
  const meal = getMeal(slot.mealId);
  const wrap = document.createElement('div');

  /* Slot header */
  const header = document.createElement('div');
  header.className = 'slot-header';
  header.innerHTML =
    '<div class="slot-time-pill">⏰ ' + (meal ? meal.time : '--:--') + '</div>' +
    '<span class="slot-type-label">' + slot.type + '</span>';

  const removeBtn = document.createElement('button');
  removeBtn.className = 'slot-remove-btn';
  removeBtn.title = 'Remove slot';
  removeBtn.innerHTML = '✕';
  removeBtn.addEventListener('click', function () {
    if (!daySlots[selectedDayIndex]) return;
    daySlots[selectedDayIndex].splice(idx, 1);
    renderDayView();
    buildWeekNav();
  });
  header.appendChild(removeBtn);
  wrap.appendChild(header);

  /* Meal card */
  if (meal) {
    const mealCard = buildMealCard(meal, idx);
    mealCard.setAttribute('data-meal-id', meal.id);
    wrap.appendChild(mealCard);

    /* Optimizer panel (hidden until Optimize button clicked) */
    const optPanel = document.createElement('div');
    optPanel.className = 'opt-panel';
    optPanel.id = 'opt-panel-' + meal.id;
    wrap.appendChild(optPanel);
  } else {
    const empty = document.createElement('div');
    empty.className = 'empty-slot';
    empty.textContent = 'No meal assigned to this slot.';
    wrap.appendChild(empty);
  }

  return wrap;
}

/* ============================================================
   BUILD MEAL CARD
   ============================================================ */
function buildMealCard(meal, slotIdx) {
  const card = document.createElement('div');
  card.className = 'meal-card';

  /* Seasonal score for this meal */
  const seasonScore = typeof SEASONAL !== 'undefined'
    ? SEASONAL.scoreRecipe(meal.ingredients) : null;
  const seasonBadge = seasonScore ? SEASONAL.badgeHTML(seasonScore) : '';

  /* Top section */
  card.innerHTML =
    '<div class="meal-card-top">' +
      '<div class="meal-card-emoji">' + meal.emoji + '</div>' +
      '<div class="meal-card-info">' +
        '<div class="meal-card-name">' + meal.name + '</div>' +
        '<div class="meal-card-meta">' + meal.time + ' &nbsp;·&nbsp; ' + meal.prep + ' prep</div>' +
        '<div class="meal-macro-chips">' +
          '<div class="macro-chip"><b>' + meal.protein + 'g</b> Protein</div>' +
          '<div class="macro-chip"><b>' + meal.carbs   + 'g</b> Carbs</div>' +
          '<div class="macro-chip"><b>' + meal.fats    + 'g</b> Fats</div>' +
          (seasonBadge ? seasonBadge : '') +
        '</div>' +
      '</div>' +
      '<div class="meal-card-right">' +
        '<div class="meal-kcal-badge">' + meal.kcal + '<small>kcal</small></div>' +
        '<div class="meal-cost-badge">₱' + meal.cost + '</div>' +
      '</div>' +
    '</div>';

  /* Ingredients section with seasonal tags */
  const ingWrap = document.createElement('div');
  ingWrap.className = 'meal-card-ingredients';
  let ingHTML = '<div class="ingredients-title">Ingredients</div>';
  meal.ingredients.forEach(function (ing) {
    const seasonTag = typeof SEASONAL !== 'undefined'
      ? SEASONAL.ingTagHTML(ing.name) : '';
    const altBanner = typeof SEASONAL !== 'undefined'
      ? SEASONAL.altBannerHTML(ing.name) : '';
    ingHTML +=
      '<div class="ingredient-row">' +
        '<div class="ingredient-dot"></div>' +
        '<span class="ingredient-name">' + ing.name + '</span>' +
        '<span class="ingredient-qty">' + ing.qty + '</span>' +
        seasonTag +
        '<span class="ingredient-status ' + ing.status + '">' +
          (ing.status === 'avail' ? '✓ Available' : '⚠ Check market') +
        '</span>' +
      '</div>' +
      altBanner;
  });
  ingWrap.innerHTML = ingHTML;
  card.appendChild(ingWrap);

  /* Action bar */
  const actionBar = document.createElement('div');
  actionBar.className = 'meal-card-actions';

  /* Swap button */
  const swapBtn = document.createElement('button');
  swapBtn.className = 'meal-action-btn swap';
  swapBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3L4 7l4 4"/><path d="M4 7h16"/><path d="M16 21l4-4-4-4"/><path d="M20 17H4"/></svg> Swap meal';
  swapBtn.addEventListener('click', function () { openSwapModal(meal, slotIdx); });
  actionBar.appendChild(swapBtn);

  /* Grocery button */
  const grocBtn = document.createElement('button');
  const alreadyAdded = groceryList.some(function (g) { return g.mealId === meal.id; });
  grocBtn.className = 'meal-action-btn grocery' + (alreadyAdded ? ' added' : '');
  grocBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg> ' +
    (alreadyAdded ? 'Added ✓' : 'Add to grocery');
  grocBtn.addEventListener('click', function () { addMealToGrocery(meal, grocBtn); });
  actionBar.appendChild(grocBtn);

  /* Optimize Portions button */
  const optBtn = document.createElement('button');
  optBtn.className = 'meal-action-btn';
  optBtn.style.cssText = 'border-color:rgba(96,165,250,0.25);color:#60a5fa;';
  optBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg> Optimize';
  optBtn.addEventListener('click', function () {
    const slots   = daySlots[selectedDayIndex] || [];
    const total   = Math.max(slots.length, 1);
    if (typeof openOptimizer === 'function') openOptimizer(meal.id, total);
  });
  actionBar.appendChild(optBtn);

  /* Why Recommended button (Explainable AI) */
  const whyBtn = document.createElement('button');
  whyBtn.className = 'xai-why-btn';
  whyBtn.innerHTML =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>' +
    ' Why?';
  whyBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    if (typeof openXaiPopover === 'function') openXaiPopover(whyBtn, meal);
  });
  actionBar.appendChild(whyBtn);

  /* Toggle ingredients */
  const toggleBtn = document.createElement('button');
  toggleBtn.className = 'toggle-ingredients-btn';
  toggleBtn.innerHTML = 'Ingredients <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M6 9l6 6 6-6"/></svg>';
  toggleBtn.addEventListener('click', function () {
    ingWrap.classList.toggle('open');
    toggleBtn.classList.toggle('open');
  });
  actionBar.appendChild(toggleBtn);

  card.appendChild(actionBar);
  return card;
}

/* ============================================================
   GROCERY LIST
   ============================================================ */
function addMealToGrocery(meal, btn) {
  /* Remove existing entries for this meal first */
  groceryList = groceryList.filter(function (g) { return g.mealId !== meal.id; });
  meal.ingredients.forEach(function (ing) {
    groceryList.push({ mealId: meal.id, name: ing.name, qty: ing.qty, checked: false });
  });
  saveGrocery();
  renderGroceryPanel();
  btn.className = 'meal-action-btn grocery added';
  btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg> Added ✓';
}

function saveGrocery() {
  sessionStorage.setItem('blane_grocery', JSON.stringify(groceryList));
}

function renderGroceryPanel() {
  const list    = document.getElementById('grocery-list-items');
  const count   = document.getElementById('grocery-count');
  const totalEl = document.getElementById('grocery-cost-total-val');
  list.innerHTML = '';

  if (count) count.textContent = groceryList.length;

  if (groceryList.length === 0) {
    list.innerHTML = '<div class="grocery-empty"><span class="grocery-empty-icon">🛒</span>No items yet. Add meals to build your list.</div>';
    if (totalEl) totalEl.textContent = '₱0';
    return;
  }

  /* Estimated total from current day's slots */
  const slots = daySlots[selectedDayIndex] || [];
  const totalCost = slots.reduce(function (s, slot) {
    const m = getMeal(slot.mealId); return s + (m ? m.cost : 0);
  }, 0);
  if (totalEl) totalEl.textContent = '₱' + totalCost;

  groceryList.forEach(function (item, i) {
    const el = document.createElement('div');
    el.className = 'grocery-item' + (item.checked ? ' checked' : '');

    const chk = document.createElement('div');
    chk.className = 'grocery-checkbox';
    chk.textContent = item.checked ? '✓' : '';
    chk.addEventListener('click', function () {
      groceryList[i].checked = !groceryList[i].checked;
      saveGrocery();
      renderGroceryPanel();
    });

    const nameEl = document.createElement('span');
    nameEl.className = 'grocery-item-name';
    nameEl.textContent = item.name;

    const qtyEl = document.createElement('span');
    qtyEl.className = 'grocery-item-qty';
    qtyEl.textContent = item.qty;

    const rmBtn = document.createElement('button');
    rmBtn.className = 'grocery-remove-btn';
    rmBtn.innerHTML = '✕';
    rmBtn.addEventListener('click', function () {
      groceryList.splice(i, 1);
      saveGrocery();
      renderGroceryPanel();
    });

    el.appendChild(chk);
    el.appendChild(nameEl);
    el.appendChild(qtyEl);
    el.appendChild(rmBtn);
    list.appendChild(el);
  });
}

/* ============================================================
   ADD SLOT MODAL
   ============================================================ */
function openAddSlotModal() {
  document.getElementById('slot-modal-overlay').classList.add('active');
  document.body.style.overflow = 'hidden';
  /* reset selection */
  document.querySelectorAll('.slot-type-option').forEach(function (o) { o.classList.remove('selected'); });
  document.getElementById('slot-custom-wrap').classList.remove('show');
}

function closeAddSlotModal() {
  document.getElementById('slot-modal-overlay').classList.remove('active');
  document.body.style.overflow = '';
}

function confirmAddSlot() {
  const selected = document.querySelector('.slot-type-option.selected');
  if (!selected) { alert('Please select a meal type.'); return; }

  let type = selected.getAttribute('data-type');
  if (type === 'Custom') {
    const custom = document.getElementById('slot-custom-name').value.trim();
    if (!custom) { alert('Please enter a custom slot name.'); return; }
    type = custom;
  }

  /* Find a matching meal or use null */
  const match = MEAL_DB.find(function (m) { return m.type === type; });
  if (!daySlots[selectedDayIndex]) daySlots[selectedDayIndex] = [];
  daySlots[selectedDayIndex].push({ type: type, mealId: match ? match.id : null });

  closeAddSlotModal();
  renderDayView();
  buildWeekNav();
}

/* ============================================================
   SWAP MODAL
   ============================================================ */
function openSwapModal(currentMeal, slotIdx) {
  swapTargetSlotKey = selectedDayIndex + '-' + slotIdx;
  document.getElementById('swap-current-name').textContent = 'Swapping: ' + currentMeal.name;

  /* Build alternatives */
  const pool = SWAP_POOL[currentMeal.type] || [];
  const options = document.getElementById('swap-options-list');
  options.innerHTML = '';

  const alts = MEAL_DB.filter(function (m) {
    return m.type === currentMeal.type && m.id !== currentMeal.id;
  }).slice(0, 3);

  if (alts.length === 0) {
    options.innerHTML = '<div style="font-size:14px;color:#4d6e5a;text-align:center;padding:20px 0;">No alternatives available for this meal type.</div>';
  } else {
    alts.forEach(function (alt) {
      const card = document.createElement('div');
      card.className = 'swap-option-card';
      card.setAttribute('data-id', alt.id);
      card.innerHTML =
        '<div class="swap-option-emoji">' + alt.emoji + '</div>' +
        '<div class="swap-option-info">' +
          '<div class="swap-option-name">' + alt.name + '</div>' +
          '<div class="swap-option-meta">' +
            '<span>' + alt.kcal + ' kcal</span> &nbsp;' +
            alt.protein + 'g protein &nbsp; ' + alt.prep + ' prep' +
          '</div>' +
        '</div>' +
        '<div class="swap-option-cost">₱' + alt.cost + '</div>';
      card.addEventListener('click', function () {
        options.querySelectorAll('.swap-option-card').forEach(function (c) { c.classList.remove('selected'); });
        card.classList.add('selected');
      });
      options.appendChild(card);
    });
  }

  document.getElementById('swap-modal-overlay').classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeSwapModal() {
  document.getElementById('swap-modal-overlay').classList.remove('active');
  document.body.style.overflow = '';
  swapTargetSlotKey = null;
}

function confirmSwap() {
  const selected = document.querySelector('.swap-option-card.selected');
  if (!selected) { alert('Please select an alternative meal.'); return; }

  const newId  = selected.getAttribute('data-id');
  const parts  = swapTargetSlotKey.split('-');
  const dayIdx = parseInt(parts[0]);
  const slotIdx = parseInt(parts[1]);

  if (daySlots[dayIdx] && daySlots[dayIdx][slotIdx]) {
    daySlots[dayIdx][slotIdx].mealId = newId;
  }

  closeSwapModal();
  renderDayView();
}

/* ============================================================
   HELPER
   ============================================================ */
function getMeal(id) {
  return MEAL_DB.find(function (m) { return m.id === id; }) || null;
}
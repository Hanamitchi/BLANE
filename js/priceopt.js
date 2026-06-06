/* ============================================================
   BLANE — Price-Aware Meal Optimizer (Module 05)

   Features:
   1. Set daily budget (₱/day) → per-meal budget = daily ÷ meals
   2. Rank all meals cheapest → most expensive
   3. Filter meals that exceed per-meal budget
   4. Suggest cheaper ingredient substitutes for over-budget meals
   5. Budget progress bar (total cost vs budget)

   Depends on: supabase-config.js, auth.js
   Reads MEAL_DB from mealplan.js (if available) or uses its own
   ============================================================ */

/* ============================================================
   MEAL PRICE DATA
   (mirrors MEAL_DB costs; standalone so markets.html works
    without mealplan.js loaded)
   ============================================================ */
const PO_MEALS = [
  { id:'m1',  emoji:'🍳', name:'Egg & Malunggay Scramble',      type:'Breakfast', cost:45,  kcal:380, protein:24, carbs:18, fats:12,
    ingredients:[ {name:'Eggs',qty:'2 pcs',cost:14}, {name:'Malunggay',qty:'1 handful',cost:8}, {name:'Garlic',qty:'2 cloves',cost:4}, {name:'Cooking oil',qty:'1 tsp',cost:3}, {name:'Onion',qty:'¼ pc',cost:4}, {name:'Salt & pepper',qty:'pinch',cost:2} ] },
  { id:'m2',  emoji:'🥗', name:'Chicken & Veggie Rice Bowl',     type:'Lunch',     cost:95,  kcal:520, protein:38, carbs:52, fats:10,
    ingredients:[ {name:'Chicken breast',qty:'150g',cost:33}, {name:'Brown rice',qty:'1 cup',cost:17}, {name:'Broccoli',qty:'80g',cost:22}, {name:'Soy sauce',qty:'1 tbsp',cost:5}, {name:'Sesame oil',qty:'1 tsp',cost:9}, {name:'Garlic',qty:'2 cloves',cost:4} ] },
  { id:'m3',  emoji:'🍲', name:'Sinigang na Isda',               type:'Dinner',    cost:80,  kcal:280, protein:32, carbs:18, fats:5,
    ingredients:[ {name:'Bangus',qty:'200g',cost:32}, {name:'Kangkong',qty:'1 bundle',cost:10}, {name:'Tamarind mix',qty:'1 pack',cost:8}, {name:'Tomatoes',qty:'2 pcs',cost:12}, {name:'Onion',qty:'1 pc',cost:8}, {name:'Radish',qty:'½ pc',cost:6}, {name:'Fish sauce',qty:'1 tbsp',cost:4} ] },
  { id:'m4',  emoji:'🍌', name:'Banana & Peanut Butter',         type:'Snack',     cost:25,  kcal:210, protein:6,  carbs:30, fats:8,
    ingredients:[ {name:'Banana',qty:'1 pc',cost:8}, {name:'Peanut butter',qty:'1 tbsp',cost:17} ] },
  { id:'m5',  emoji:'🥣', name:'Oatmeal with Banana & Honey',    type:'Breakfast', cost:35,  kcal:320, protein:10, carbs:58, fats:6,
    ingredients:[ {name:'Rolled oats',qty:'½ cup',cost:12}, {name:'Banana',qty:'1 pc',cost:8}, {name:'Honey',qty:'1 tsp',cost:10}, {name:'Milk',qty:'1 cup',cost:5} ] },
  { id:'m6',  emoji:'🍜', name:'Arroz Caldo',                    type:'Breakfast', cost:55,  kcal:340, protein:18, carbs:48, fats:7,
    ingredients:[ {name:'Glutinous rice',qty:'½ cup',cost:12}, {name:'Chicken',qty:'100g',cost:22}, {name:'Ginger',qty:'2 slices',cost:4}, {name:'Garlic',qty:'4 cloves',cost:5}, {name:'Fish sauce',qty:'1 tbsp',cost:4}, {name:'Spring onion',qty:'1 stalk',cost:8} ] },
  { id:'m7',  emoji:'🥩', name:'Grilled Pork Liempo',            type:'Lunch',     cost:110, kcal:560, protein:42, carbs:10, fats:28,
    ingredients:[ {name:'Pork belly',qty:'200g',cost:52}, {name:'Calamansi',qty:'4 pcs',cost:12}, {name:'Soy sauce',qty:'2 tbsp',cost:8}, {name:'Garlic',qty:'4 cloves',cost:6}, {name:'Brown sugar',qty:'1 tbsp',cost:5}, {name:'Black pepper',qty:'pinch',cost:3} ] },
  { id:'m8',  emoji:'🍛', name:'Monggo Guisado',                 type:'Dinner',    cost:55,  kcal:380, protein:22, carbs:50, fats:6,
    ingredients:[ {name:'Mung beans',qty:'1 cup',cost:18}, {name:'Pork (optional)',qty:'80g',cost:20}, {name:'Ampalaya leaves',qty:'1 handful',cost:8}, {name:'Garlic',qty:'4 cloves',cost:5}, {name:'Tomato',qty:'1 pc',cost:4} ] },
  { id:'m9',  emoji:'🩵', name:'Tinolang Manok',                 type:'Lunch',     cost:75,  kcal:310, protein:28, carbs:20, fats:8,
    ingredients:[ {name:'Chicken',qty:'200g',cost:37}, {name:'Green papaya',qty:'½ pc',cost:12}, {name:'Malunggay',qty:'1 cup',cost:6}, {name:'Ginger',qty:'1 thumb',cost:5}, {name:'Garlic',qty:'2 cloves',cost:4}, {name:'Fish sauce',qty:'1 tbsp',cost:4} ] },
  { id:'m10', emoji:'🧁', name:'Camote Cue',                     type:'Snack',     cost:30,  kcal:260, protein:2,  carbs:54, fats:7,
    ingredients:[ {name:'Sweet potato',qty:'2 pcs',cost:16}, {name:'Brown sugar',qty:'3 tbsp',cost:8}, {name:'Cooking oil',qty:'½ cup',cost:6} ] },
  { id:'m11', emoji:'🥬', name:'Pinakbet',                       type:'Dinner',    cost:60,  kcal:220, protein:12, carbs:22, fats:8,
    ingredients:[ {name:'Ampalaya',qty:'1 pc',cost:10}, {name:'Eggplant',qty:'1 pc',cost:8}, {name:'Squash',qty:'100g',cost:7}, {name:'String beans',qty:'½ bundle',cost:8}, {name:'Okra',qty:'4 pcs',cost:6}, {name:'Bagoong alamang',qty:'1 tbsp',cost:8}, {name:'Pork',qty:'60g',cost:13} ] },
  { id:'m12', emoji:'🫙', name:'Ensaladang Talong',              type:'Snack',     cost:20,  kcal:120, protein:4,  carbs:12, fats:6,
    ingredients:[ {name:'Eggplant',qty:'2 pcs',cost:10}, {name:'Tomato',qty:'1 pc',cost:4}, {name:'Onion',qty:'½ pc',cost:3}, {name:'Salted egg',qty:'1 pc',cost:3} ] },
];

/* Cheaper substitute map: ingredient → cheaper local option + savings */
const PO_CHEAPER_SUBS = {
  'Chicken breast':  { sub:'Chicken legs/thighs', saving:15, note:'Same protein, ~₱15 cheaper per 150g' },
  'Broccoli':        { sub:'Pechay or Kangkong',  saving:18, note:'Local leafy greens — far cheaper & in season' },
  'Brown rice':      { sub:'Sinandomeng rice',    saving:8,  note:'Local variety available everywhere' },
  'Sesame oil':      { sub:'Regular cooking oil', saving:8,  note:'Skip for stir-fry; saves ₱8 per serving' },
  'Pork belly':      { sub:'Pork kasim (shoulder)',saving:12, note:'Leaner cut, similar flavor, lower cost' },
  'Spring onion':    { sub:'White onion sliced',  saving:6,  note:'Readily available, same aromatic effect' },
  'Peanut butter':   { sub:'Ground peanuts',      saving:10, note:'Buy raw peanuts & crush — half the cost' },
  'Honey':           { sub:'Brown sugar syrup',   saving:8,  note:'½ tsp brown sugar + few drops water' },
  'Mung beans':      { sub:'Monggo already cheap',saving:0,  note:'Already one of the most affordable proteins' },
};

/* ============================================================
   STATE
   ============================================================ */
let poDailyBudget  = 200;    /* default ₱200/day */
let poMealsPerDay  = 4;      /* default 4 slots */
let poSortMode     = 'cost';  /* 'cost' | 'kcal_per_peso' */
let poFilterOver   = false;   /* hide over-budget meals */
let poExpandedId   = null;

/* ============================================================
   INIT
   ============================================================ */
document.addEventListener('DOMContentLoaded', function () {
  buildPriceOptPanel();
});

/* ============================================================
   BUILD PANEL
   ============================================================ */
function buildPriceOptPanel() {
  const root = document.getElementById('po-panel-root');
  if (!root) return;

  root.innerHTML =
    '<div class="po-panel">' +

    /* Header */
    '<div class="po-header">' +
      '<div class="po-header-left">' +
        '<div class="po-header-icon">💸</div>' +
        '<div>' +
          '<div class="po-title">Price-Aware Meal Optimizer</div>' +
          '<div class="po-sub">Rank and filter meals by your daily budget · Module 05</div>' +
        '</div>' +
      '</div>' +
    '</div>' +

    /* Budget input */
    '<div class="po-budget-row">' +
      '<div class="po-budget-input-wrap">' +
        '<span class="po-currency-prefix">₱</span>' +
        '<input class="po-budget-input" type="number" id="po-budget-input" value="200" min="50" max="2000" step="10" />' +
      '</div>' +
      '<span class="po-budget-label">daily budget</span>' +
      '<div class="po-per-meal-chip" id="po-per-meal-chip">≈ <strong>₱50</strong> / meal</div>' +
      '<button class="po-apply-btn" id="po-apply-btn">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>' +
        'Apply Budget' +
      '</button>' +
    '</div>' +

    /* Summary bar */
    '<div class="po-summary-bar" id="po-summary-bar"></div>' +

    /* Sort & filter controls */
    '<div class="po-controls">' +
      '<span class="po-sort-label">Sort by:</span>' +
      '<button class="po-sort-btn active" data-sort="cost" id="po-sort-cost">₱ Price</button>' +
      '<button class="po-sort-btn" data-sort="kcal_per_peso" id="po-sort-value">⚡ Best Value</button>' +
      '<span class="po-count-badge" id="po-count-badge"><span id="po-count-num">12</span> meals</span>' +
      '<button class="po-filter-toggle" id="po-filter-toggle">Hide over budget</button>' +
    '</div>' +

    /* Meals list */
    '<div class="po-meals-list" id="po-meals-list"></div>' +

    '</div>';

  /* Bind budget input */
  const budgetInput = document.getElementById('po-budget-input');
  budgetInput.addEventListener('input', function () {
    poDailyBudget = parseInt(this.value) || 200;
    updatePerMealChip();
  });

  /* Apply button */
  document.getElementById('po-apply-btn').addEventListener('click', function () {
    poDailyBudget = parseInt(budgetInput.value) || 200;
    renderPriceList();
  });

  /* Sort buttons */
  document.querySelectorAll('.po-sort-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      poSortMode = btn.getAttribute('data-sort');
      document.querySelectorAll('.po-sort-btn').forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      renderPriceList();
    });
  });

  /* Filter toggle */
  document.getElementById('po-filter-toggle').addEventListener('click', function () {
    poFilterOver = !poFilterOver;
    this.classList.toggle('active', poFilterOver);
    this.textContent = poFilterOver ? 'Show all meals' : 'Hide over budget';
    applyFilter();
  });

  updatePerMealChip();
  renderPriceList();
}

/* ============================================================
   PER-MEAL CHIP UPDATE
   ============================================================ */
function updatePerMealChip() {
  const perMeal = Math.round(poDailyBudget / poMealsPerDay);
  const chip    = document.getElementById('po-per-meal-chip');
  if (chip) chip.innerHTML = '≈ <strong>₱' + perMeal + '</strong> / meal';
}

/* ============================================================
   RENDER MEAL LIST
   ============================================================ */
function renderPriceList() {
  const list   = document.getElementById('po-meals-list');
  if (!list) return;

  const perMeal = Math.round(poDailyBudget / poMealsPerDay);

  /* Sort */
  let sorted = PO_MEALS.slice();
  if (poSortMode === 'cost') {
    sorted.sort(function (a, b) { return a.cost - b.cost; });
  } else {
    /* Best value = kcal per peso (higher = better) */
    sorted.sort(function (a, b) {
      return (b.kcal / b.cost) - (a.kcal / a.cost);
    });
  }

  /* Summary stats */
  const affordable  = sorted.filter(function (m) { return m.cost <= perMeal; });
  const overBudget  = sorted.filter(function (m) { return m.cost  > perMeal; });
  const cheapestDay = computeCheapestDay(perMeal);

  renderSummaryBar(perMeal, cheapestDay);

  /* Count badge */
  const shown = poFilterOver ? affordable.length : sorted.length;
  const countEl = document.getElementById('po-count-num');
  if (countEl) countEl.textContent = shown;

  /* Build cards */
  list.innerHTML = '';
  sorted.forEach(function (meal, idx) {
    const isOver = meal.cost > perMeal;
    const card   = buildMealRow(meal, idx + 1, perMeal, isOver);
    list.appendChild(card);
  });

  applyFilter();
}

/* ============================================================
   BUILD SINGLE MEAL ROW
   ============================================================ */
function buildMealRow(meal, rank, perMeal, isOver) {
  const affordClass = meal.cost <= perMeal * 0.6 ? 'cheap'
                    : meal.cost <= perMeal       ? 'okay'
                    : meal.cost <= perMeal * 1.3 ? 'pricey'
                    : 'over';

  const affordLabel = { cheap:'Budget-Friendly', okay:'Affordable', pricey:'Slightly Over', over:'Over Budget' };
  const valueScore  = Math.round(meal.kcal / meal.cost * 10) / 10;

  const row = document.createElement('div');
  row.className   = 'po-meal-row' + (isOver ? ' over-budget' : '');
  row.setAttribute('data-id', meal.id);
  row.setAttribute('data-over', isOver ? '1' : '0');

  /* Ingredient cost breakdown rows */
  const maxIngCost = Math.max.apply(null, meal.ingredients.map(function(i){ return i.cost; }));
  const ingRows = meal.ingredients.map(function (ing) {
    const barPct = Math.round((ing.cost / maxIngCost) * 100);
    return '<div class="po-ing-cost-row">' +
      '<div class="po-ing-cost-name"><div class="po-ing-dot"></div>' + ing.name + ' <span style="color:#4d6e5a;">(' + ing.qty + ')</span></div>' +
      '<div class="po-cost-bar-wrap"><div class="po-cost-bar-bg"><div class="po-cost-bar-fill" style="width:' + barPct + '%"></div></div></div>' +
      '<div class="po-ing-cost-price">₱' + ing.cost + '</div>' +
    '</div>';
  }).join('');

  /* Substitute suggestion for over-budget meals */
  let subHTML = '';
  if (isOver) {
    const expensiveIng = meal.ingredients.slice().sort(function(a,b){return b.cost-a.cost;})[0];
    const sub = expensiveIng ? PO_CHEAPER_SUBS[expensiveIng.name] : null;
    if (sub && sub.saving > 0) {
      subHTML =
        '<div class="po-sub-suggestion">' +
          '<span class="po-sub-suggestion-icon">💡</span>' +
          '<div class="po-sub-suggestion-text">' +
            'Replace <strong>' + expensiveIng.name + '</strong> with <strong>' + sub.sub + '</strong> — ' + sub.note +
          '</div>' +
          '<div class="po-sub-saving">Save ₱' + sub.saving + '</div>' +
        '</div>';
    } else {
      subHTML =
        '<div class="po-sub-suggestion">' +
          '<span class="po-sub-suggestion-icon">📍</span>' +
          '<div class="po-sub-suggestion-text">Buy ingredients at <strong>Daan Bago Talipapa</strong> or the <strong>public market</strong> for lower prices.</div>' +
        '</div>';
    }
  }

  row.innerHTML =
    /* Main row */
    '<div class="po-meal-main">' +
      '<div class="po-meal-rank' + (rank <= 3 ? ' top3' : '') + '">' + (rank <= 3 ? '🥇🥈🥉'.split('').slice((rank-1)*2,(rank-1)*2+2).join('') : '#' + rank) + '</div>' +
      '<div class="po-meal-emoji">' + meal.emoji + '</div>' +
      '<div class="po-meal-info">' +
        '<div class="po-meal-name">' + meal.name + '</div>' +
        '<div class="po-meal-meta">' +
          '<span>' + meal.type + '</span>' +
          '<span>· ' + meal.kcal + ' kcal</span>' +
          '<span>· ⚡ ' + valueScore + ' kcal/₱</span>' +
        '</div>' +
      '</div>' +
      '<div class="po-meal-cost-wrap">' +
        '<div class="po-meal-cost">₱' + meal.cost + '</div>' +
        '<span class="po-afford-badge ' + affordClass + '">' + affordLabel[affordClass] + '</span>' +
      '</div>' +
      '<button class="po-expand-btn" aria-label="Expand">' +
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>' +
      '</button>' +
    '</div>' +

    /* Expandable detail */
    '<div class="po-meal-detail">' +
      '<div class="po-detail-inner">' +
        '<div style="font-size:11px;color:#4d6e5a;text-transform:uppercase;letter-spacing:0.7px;margin-bottom:8px;">Ingredient Cost Breakdown</div>' +
        '<div class="po-ing-cost-table">' + ingRows + '</div>' +
        subHTML +
      '</div>' +
    '</div>';

  /* Toggle expand */
  const expandBtn    = row.querySelector('.po-expand-btn');
  const detailEl     = row.querySelector('.po-meal-detail');
  const mainRow      = row.querySelector('.po-meal-main');

  function toggleExpand() {
    const isOpen = detailEl.classList.contains('open');
    /* Close any other open row */
    document.querySelectorAll('.po-meal-detail.open').forEach(function (d) { d.classList.remove('open'); });
    document.querySelectorAll('.po-expand-btn.open').forEach(function (b) { b.classList.remove('open'); });
    if (!isOpen) {
      detailEl.classList.add('open');
      expandBtn.classList.add('open');
    }
  }

  mainRow.addEventListener('click',    toggleExpand);
  expandBtn.addEventListener('click', function(e) { e.stopPropagation(); toggleExpand(); });

  return row;
}

/* ============================================================
   SUMMARY BAR
   ============================================================ */
function renderSummaryBar(perMeal, cheapestDay) {
  const bar = document.getElementById('po-summary-bar');
  if (!bar) return;

  const affordable = PO_MEALS.filter(function (m) { return m.cost <= perMeal; }).length;
  const pct        = Math.min(Math.round((cheapestDay / poDailyBudget) * 100), 120);
  const barColor   = pct <= 80 ? '#2ddc7a' : pct <= 100 ? '#fbbf24' : '#f87171';

  bar.innerHTML =
    '<div class="po-summary-item">' +
      '<div class="po-summary-label">Daily Budget</div>' +
      '<div class="po-summary-value yellow">₱' + poDailyBudget + '</div>' +
    '</div>' +
    '<div class="po-summary-divider"></div>' +
    '<div class="po-summary-item">' +
      '<div class="po-summary-label">Per Meal</div>' +
      '<div class="po-summary-value yellow">₱' + perMeal + '</div>' +
    '</div>' +
    '<div class="po-summary-divider"></div>' +
    '<div class="po-summary-item">' +
      '<div class="po-summary-label">Affordable Meals</div>' +
      '<div class="po-summary-value green">' + affordable + ' / ' + PO_MEALS.length + '</div>' +
    '</div>' +
    '<div class="po-summary-divider"></div>' +
    '<div class="po-summary-item">' +
      '<div class="po-summary-label">Cheapest Full Day</div>' +
      '<div class="po-summary-value ' + (cheapestDay <= poDailyBudget ? 'green' : 'red') + '">₱' + cheapestDay + '</div>' +
    '</div>' +
    '<div class="po-summary-divider"></div>' +
    '<div class="po-budget-progress">' +
      '<div class="po-budget-bar-labels"><span>Cheapest day cost</span><span>' + pct + '%</span></div>' +
      '<div class="po-budget-bar-bg">' +
        '<div class="po-budget-bar-fill" style="width:' + Math.min(pct,100) + '%;background:' + barColor + ';"></div>' +
      '</div>' +
    '</div>';
}

/* ============================================================
   COMPUTE CHEAPEST FULL DAY
   Pick cheapest from each type: Breakfast + Lunch + Dinner + Snack
   ============================================================ */
function computeCheapestDay(perMeal) {
  const types = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];
  let total = 0;
  types.forEach(function (type) {
    const mealsOfType = PO_MEALS.filter(function (m) { return m.type === type; });
    if (mealsOfType.length > 0) {
      const cheapest = mealsOfType.reduce(function (a, b) { return a.cost < b.cost ? a : b; });
      total += cheapest.cost;
    }
  });
  return total;
}

/* ============================================================
   APPLY FILTER (hide/show over-budget rows)
   ============================================================ */
function applyFilter() {
  document.querySelectorAll('.po-meal-row').forEach(function (row) {
    const isOver = row.getAttribute('data-over') === '1';
    row.classList.toggle('hidden-by-filter', poFilterOver && isOver);
  });
  const visible = document.querySelectorAll('.po-meal-row:not(.hidden-by-filter)').length;
  const countEl = document.getElementById('po-count-num');
  if (countEl) countEl.textContent = visible;
}
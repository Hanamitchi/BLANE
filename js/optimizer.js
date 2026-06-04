/* ============================================================
   BLANE — Dynamic Portion Optimizer (Module 03)

   Algorithm:
   1. Fetch user's daily calorie target (Mifflin-St Jeor + TDEE)
   2. Divide by meals in today's plan → per-meal calorie target
   3. Scale factor = target_meal_kcal / original_meal_kcal
      (clamped 0.5× – 2.0× to avoid extremes)
   4. Apply scale to every ingredient quantity
   5. Recalculate macros for optimized portions

   Depends on: supabase-config.js, auth.js
   ============================================================ */

/* ============================================================
   CONSTANTS
   ============================================================ */
const OPT_MIN_SCALE = 0.5;
const OPT_MAX_SCALE = 2.0;

/* Macro targets as % of calories */
const MACRO_TARGETS = {
  protein: 0.30,   /* 30 % → 4 kcal/g */
  carbs:   0.45,   /* 45 % → 4 kcal/g */
  fats:    0.25,   /* 25 % → 9 kcal/g */
};

/* Activity multipliers */
const OPT_ACTIVITY_MULT = {
  sedentary:    1.2,
  light:        1.375,
  moderate:     1.55,
  very_active:  1.725,
  extra_active: 1.9,
};

const OPT_GOAL_ADJUST = {
  lose_weight:      0.85,
  gain_muscle:      1.10,
  maintain:         1.00,
  improve_health:   1.00,
  boost_energy:     1.00,
  manage_condition: 1.00,
};

/* ============================================================
   STATE
   ============================================================ */
let optProfile   = null;
let optSession   = null;
let openOptId    = null;   /* currently open optimizer panel key */

/* ============================================================
   INIT — called from mealplan DOMContentLoaded
   ============================================================ */
async function initOptimizer(session) {
  optSession = session;

  /* Load profile */
  const { data: profile } = await _supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .maybeSingle();

  optProfile = profile || {};
}

/* ============================================================
   COMPUTE DAILY TARGETS
   ============================================================ */
function computeDailyTargets(profile) {
  const h   = parseFloat(profile.height_cm)   || 170;
  const w   = parseFloat(profile.weight_kg)    || 70;
  const age = parseInt(profile.age)            || 25;
  const sex = profile.sex || 'male';

  let bmr;
  if (sex === 'male') { bmr = 10 * w + 6.25 * h - 5 * age + 5; }
  else                { bmr = 10 * w + 6.25 * h - 5 * age - 161; }

  const mult    = OPT_ACTIVITY_MULT[profile.activity_level] || 1.55;
  const tdee    = bmr * mult;
  const adj     = OPT_GOAL_ADJUST[profile.goal] || 1.0;
  const calTarget = Math.round(tdee * adj);

  return {
    calories: calTarget,
    protein:  Math.round((calTarget * MACRO_TARGETS.protein) / 4),
    carbs:    Math.round((calTarget * MACRO_TARGETS.carbs)   / 4),
    fats:     Math.round((calTarget * MACRO_TARGETS.fats)    / 9),
  };
}

/* ============================================================
   OPTIMIZE A MEAL
   Input:  meal object (from MEAL_DB), totalMealsToday
   Output: { scaleFactor, optimizedKcal, ingredients, macros }
   ============================================================ */
function optimizeMeal(meal, totalMealsToday) {
  const daily  = computeDailyTargets(optProfile);

  /* Distribute calories evenly across meal slots
     (snacks get half weight of main meals) */
  const isSnack      = meal.type === 'Snack';
  const snackCount   = 0;    /* simplified — treat all meals equally */
  const perMealKcal  = Math.round(daily.calories / totalMealsToday);

  const originalKcal = meal.kcal;
  let   scaleFactor  = perMealKcal / originalKcal;

  /* Clamp to sane range */
  scaleFactor = Math.max(OPT_MIN_SCALE, Math.min(OPT_MAX_SCALE, scaleFactor));

  const optimizedKcal    = Math.round(originalKcal * scaleFactor);
  const optimizedProtein = Math.round(meal.protein * scaleFactor);
  const optimizedCarbs   = Math.round(meal.carbs   * scaleFactor);
  const optimizedFats    = Math.round(meal.fats    * scaleFactor);

  /* Per-meal macro targets (proportional share of daily) */
  const mealProteinTarget = Math.round(daily.protein / totalMealsToday);
  const mealCarbsTarget   = Math.round(daily.carbs   / totalMealsToday);
  const mealFatsTarget    = Math.round(daily.fats    / totalMealsToday);

  /* Scale each ingredient */
  const scaledIngredients = meal.ingredients.map(function (ing) {
    return scaleIngredient(ing, scaleFactor);
  });

  return {
    scaleFactor,
    perMealKcal,
    originalKcal,
    optimizedKcal,
    original:  { protein: meal.protein,        carbs: meal.carbs,        fats: meal.fats        },
    optimized: { protein: optimizedProtein,     carbs: optimizedCarbs,    fats: optimizedFats    },
    targets:   { protein: mealProteinTarget,    carbs: mealCarbsTarget,   fats: mealFatsTarget,
                 calories: perMealKcal },
    ingredients: scaledIngredients,
    daily,
  };
}

/* ============================================================
   SCALE A SINGLE INGREDIENT QUANTITY
   ============================================================ */
function scaleIngredient(ing, factor) {
  const original  = ing.qty;
  const optimized = scaleQtyString(original, factor);

  /* Macro contribution (approx per ingredient based on meal ratio) */
  return {
    name:      ing.name,
    status:    ing.status,
    original,
    optimized,
    factor,
    changed:   Math.abs(factor - 1) > 0.05,
    increased: factor > 1.05,
    decreased: factor < 0.95,
  };
}

/* ============================================================
   SCALE A QUANTITY STRING
   e.g. "150g" × 1.3 = "195g"
        "2 pcs" × 1.5 = "3 pcs"
        "1 cup" × 0.8 = "¾ cup"
        "to taste" → "to taste" (unchanged)
   ============================================================ */
function scaleQtyString(qtyStr, factor) {
  if (!qtyStr || qtyStr === 'to taste') return qtyStr;

  /* Extract number + unit */
  const match = qtyStr.match(/^([\d./½¼¾⅓⅔]+)\s*(.*)/);
  if (!match) return qtyStr;

  let num  = parseFraction(match[1]);
  const unit = match[2].trim();

  if (isNaN(num) || num === 0) return qtyStr;

  const scaled = num * factor;

  /* Format nicely */
  let formatted;
  if (unit === 'pcs' || unit === 'pc' || unit === 'cloves' || unit === 'slices' || unit === 'stalks') {
    /* Round to nearest 0.5 for countable items */
    const rounded = Math.round(scaled * 2) / 2;
    formatted = (rounded % 1 === 0.5 ? rounded.toFixed(1) : Math.round(rounded).toString());
  } else if (unit === 'cup' || unit === 'cups') {
    formatted = formatCup(scaled);
  } else if (unit === 'tbsp' || unit === 'tsp') {
    const rounded = Math.round(scaled * 4) / 4;
    formatted = rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1);
  } else {
    /* Grams, ml, kg — round to nearest 5 */
    const rounded = Math.round(scaled / 5) * 5 || Math.round(scaled);
    formatted = rounded.toString();
  }

  return formatted + (unit ? ' ' + unit : '');
}

function parseFraction(str) {
  const fracts = { '½': 0.5, '¼': 0.25, '¾': 0.75, '⅓': 0.333, '⅔': 0.667 };
  if (fracts[str]) return fracts[str];
  if (str.includes('/')) {
    const parts = str.split('/');
    return parseFloat(parts[0]) / parseFloat(parts[1]);
  }
  return parseFloat(str);
}

function formatCup(val) {
  if (val >= 0.875) return Math.round(val).toString();
  if (val >= 0.625) return '¾';
  if (val >= 0.375) return '½';
  if (val >= 0.175) return '¼';
  return val.toFixed(2);
}

/* ============================================================
   RENDER OPTIMIZER PANEL
   ============================================================ */
function renderOptimizerPanel(panelEl, meal, totalMealsToday) {
  if (!optProfile || !optProfile.height_cm) {
    panelEl.innerHTML =
      '<div class="opt-inner">' +
        '<p style="font-size:13px;color:#4d6e5a;text-align:center;padding:20px 0;">' +
          '⚠️ Complete your health profile first to enable portion optimization.' +
        '</p>' +
      '</div>';
    return;
  }

  const result    = optimizeMeal(meal, totalMealsToday);
  const scaleClass = result.scaleFactor > 1.05 ? 'over' : result.scaleFactor < 0.95 ? 'under' : '';
  const scaleLabel = result.scaleFactor > 1.05
    ? '↑ ' + (result.scaleFactor).toFixed(2) + '× Increase'
    : result.scaleFactor < 0.95
    ? '↓ ' + (result.scaleFactor).toFixed(2) + '× Decrease'
    : '→ ' + (result.scaleFactor).toFixed(2) + '× (Optimal)';

  /* Macro bar fill percentages vs target */
  const pBar = function (val, target) {
    return Math.min(Math.round((val / target) * 100), 120);
  };

  /* Build ingredient rows */
  const ingRows = result.ingredients.map(function (ing) {
    const changeClass = ing.increased ? 'more' : ing.decreased ? 'less' : 'same';
    const changeTxt   = ing.increased
      ? '+' + ((result.scaleFactor - 1) * 100).toFixed(0) + '%'
      : ing.decreased
      ? '-' + ((1 - result.scaleFactor) * 100).toFixed(0) + '%'
      : 'same';

    return '<div class="opt-ing-row">' +
      '<div class="opt-ing-name"><div class="opt-ing-dot"></div>' + ing.name + '</div>' +
      '<div class="opt-ing-original">' + ing.original + '</div>' +
      '<div class="opt-ing-optimized">' +
        '<div class="opt-ing-opt-val">' + ing.optimized + '</div>' +
        '<div class="opt-ing-opt-change ' + changeClass + '">' + changeTxt + '</div>' +
      '</div>' +
      '<div class="opt-ing-macro">' +
        '<div class="opt-ing-macro-line">P <b>~' + Math.round(meal.protein / meal.ingredients.length * result.scaleFactor) + 'g</b></div>' +
        '<div class="opt-ing-macro-line">C <b>~' + Math.round(meal.carbs   / meal.ingredients.length * result.scaleFactor) + 'g</b></div>' +
        '<div class="opt-ing-macro-line">F <b>~' + Math.round(meal.fats    / meal.ingredients.length * result.scaleFactor) + 'g</b></div>' +
      '</div>' +
    '</div>';
  }).join('');

  panelEl.innerHTML =
    '<div class="opt-inner">' +

    /* Header */
    '<div class="opt-header">' +
      '<div class="opt-header-left">' +
        '<div class="opt-icon">⚖️</div>' +
        '<div>' +
          '<div class="opt-title">Portion Optimizer — ' + meal.name + '</div>' +
          '<div class="opt-sub">Adjusted for your calorie &amp; macro targets</div>' +
        '</div>' +
      '</div>' +
      '<button class="opt-close-btn" onclick="closeOptimizer(this)">✕ Close</button>' +
    '</div>' +

    /* Target row */
    '<div class="opt-target-row">' +
      '<div class="opt-target-chip">' +
        '<div class="opt-target-chip-label">Daily Target</div>' +
        '<div class="opt-target-chip-value green">' + result.daily.calories.toLocaleString() + ' kcal</div>' +
      '</div>' +
      '<div class="opt-target-divider"></div>' +
      '<div class="opt-target-chip">' +
        '<div class="opt-target-chip-label">Per-Meal Target</div>' +
        '<div class="opt-target-chip-value yellow">' + result.perMealKcal + ' kcal</div>' +
      '</div>' +
      '<div class="opt-target-divider"></div>' +
      '<div class="opt-target-chip">' +
        '<div class="opt-target-chip-label">Original Meal</div>' +
        '<div class="opt-target-chip-value">' + result.originalKcal + ' kcal</div>' +
      '</div>' +
      '<div class="opt-target-divider"></div>' +
      '<div class="opt-target-chip">' +
        '<div class="opt-target-chip-label">Optimized Meal</div>' +
        '<div class="opt-target-chip-value green">' + result.optimizedKcal + ' kcal</div>' +
      '</div>' +
      '<span class="opt-scale-badge ' + scaleClass + '">' + scaleLabel + '</span>' +
    '</div>' +

    /* Macro compare */
    '<div class="opt-macro-compare">' +

      /* Protein */
      '<div class="opt-macro-col">' +
        '<div class="opt-macro-col-label"><span>🥩</span> Protein</div>' +
        '<div class="opt-macro-val-row">' +
          '<span class="opt-macro-original">' + result.original.protein + 'g</span>' +
          '<span class="opt-macro-optimized" style="color:#2ddc7a;">' + result.optimized.protein + '</span>' +
          '<span class="opt-macro-unit">g</span>' +
        '</div>' +
        '<div class="opt-macro-bar-bg"><div class="opt-macro-bar-fill" data-w="' + pBar(result.optimized.protein, result.targets.protein) + '%" style="width:0%;background:#2ddc7a;"></div></div>' +
        '<div class="opt-macro-target-label">Target: ' + result.targets.protein + 'g</div>' +
      '</div>' +

      /* Carbs */
      '<div class="opt-macro-col">' +
        '<div class="opt-macro-col-label"><span>🍚</span> Carbs</div>' +
        '<div class="opt-macro-val-row">' +
          '<span class="opt-macro-original">' + result.original.carbs + 'g</span>' +
          '<span class="opt-macro-optimized" style="color:#60a5fa;">' + result.optimized.carbs + '</span>' +
          '<span class="opt-macro-unit">g</span>' +
        '</div>' +
        '<div class="opt-macro-bar-bg"><div class="opt-macro-bar-fill" data-w="' + pBar(result.optimized.carbs, result.targets.carbs) + '%" style="width:0%;background:#60a5fa;"></div></div>' +
        '<div class="opt-macro-target-label">Target: ' + result.targets.carbs + 'g</div>' +
      '</div>' +

      /* Fats */
      '<div class="opt-macro-col">' +
        '<div class="opt-macro-col-label"><span>🥑</span> Fats</div>' +
        '<div class="opt-macro-val-row">' +
          '<span class="opt-macro-original">' + result.original.fats + 'g</span>' +
          '<span class="opt-macro-optimized" style="color:#fbbf24;">' + result.optimized.fats + '</span>' +
          '<span class="opt-macro-unit">g</span>' +
        '</div>' +
        '<div class="opt-macro-bar-bg"><div class="opt-macro-bar-fill" data-w="' + pBar(result.optimized.fats, result.targets.fats) + '%" style="width:0%;background:#fbbf24;"></div></div>' +
        '<div class="opt-macro-target-label">Target: ' + result.targets.fats + 'g</div>' +
      '</div>' +

    '</div>' +

    /* Ingredient table */
    '<div class="opt-section-title">Ingredient Portions — Original vs Optimized</div>' +
    '<div class="opt-table-header">' +
      '<span>Ingredient</span><span style="text-align:center;">Original</span>' +
      '<span style="text-align:center;">Optimized</span><span style="text-align:right;">Macros</span>' +
    '</div>' +
    ingRows +

    /* Apply row */
    '<div class="opt-apply-row">' +
      '<button class="opt-btn opt-btn-primary" onclick="applyOptimizedPortions(\'' + meal.id + '\')">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>' +
        'Apply to Meal Plan' +
      '</button>' +
      '<button class="opt-btn opt-btn-outline" onclick="closeOptimizer(this)">' +
        'Keep Original' +
      '</button>' +
      '<span class="opt-applied-badge" id="opt-applied-' + meal.id + '">' +
        '✓ Portions applied to today\'s plan' +
      '</span>' +
    '</div>' +

    '</div>';

  /* Animate macro bars after render */
  setTimeout(function () {
    panelEl.querySelectorAll('.opt-macro-bar-fill').forEach(function (bar) {
      bar.style.width = bar.getAttribute('data-w');
    });
  }, 80);
}

/* ============================================================
   OPEN / CLOSE OPTIMIZER
   ============================================================ */
function openOptimizer(mealId, totalMealsToday) {
  /* Close any other open optimizer first */
  if (openOptId && openOptId !== mealId) {
    const prev = document.getElementById('opt-panel-' + openOptId);
    if (prev) prev.classList.remove('open');
  }

  const panelEl = document.getElementById('opt-panel-' + mealId);
  if (!panelEl) return;

  const isOpen  = panelEl.classList.contains('open');

  if (isOpen) {
    panelEl.classList.remove('open');
    openOptId = null;
    return;
  }

  /* Find meal data */
  const meal = (typeof MEAL_DB !== 'undefined')
    ? MEAL_DB.find(function (m) { return m.id === mealId; })
    : null;

  if (!meal) return;

  renderOptimizerPanel(panelEl, meal, totalMealsToday || 3);
  panelEl.classList.add('open');
  openOptId = mealId;

  /* Scroll into view */
  setTimeout(function () {
    panelEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, 120);
}

function closeOptimizer(btn) {
  const panel = btn.closest('.opt-panel');
  if (panel) panel.classList.remove('open');
  openOptId = null;
}

/* ============================================================
   APPLY OPTIMIZED PORTIONS
   (stores in sessionStorage — persists for this session)
   ============================================================ */
function applyOptimizedPortions(mealId) {
  const meal = (typeof MEAL_DB !== 'undefined')
    ? MEAL_DB.find(function (m) { return m.id === mealId; })
    : null;

  if (!meal) return;

  const slots    = (typeof daySlots !== 'undefined') ? daySlots : {};
  const today    = new Date().getDay();
  const todaySlots = slots[today] || [];
  const total    = Math.max(todaySlots.length, 1);
  const result   = optimizeMeal(meal, total);

  /* Save optimized portions to sessionStorage */
  const saved = JSON.parse(sessionStorage.getItem('blane_optimized') || '{}');
  saved[mealId] = {
    scaleFactor: result.scaleFactor,
    ingredients: result.ingredients,
    optimizedKcal: result.optimizedKcal,
    appliedAt: new Date().toISOString(),
  };
  sessionStorage.setItem('blane_optimized', JSON.stringify(saved));

  /* Show applied badge */
  const badge = document.getElementById('opt-applied-' + mealId);
  if (badge) badge.classList.add('show');

  /* Highlight the meal card */
  const card = document.querySelector('[data-meal-id="' + mealId + '"]');
  if (card) {
    card.style.borderColor = '#2ddc7a';
    setTimeout(function () { card.style.borderColor = ''; }, 2000);
  }
}

/* ============================================================
   CHECK IF MEAL HAS BEEN OPTIMIZED
   ============================================================ */
function getMealOptimization(mealId) {
  const saved = JSON.parse(sessionStorage.getItem('blane_optimized') || '{}');
  return saved[mealId] || null;
}
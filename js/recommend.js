/* ============================================================
   BLANE — Recipe Recommendation Engine (Module 09)

   Scores all recipes against the user's profile:
     - Goal alignment     (0–40 pts)
     - Constraint safety  (−20 per dietary, −30 per allergy)
     - Calorie fit        (0–15 pts)
     - Dietary bonus      (+10 if zero violations)

   Picks top 3 and renders them as cards on the dashboard.

   Depends on: supabase-config.js, auth.js
   ============================================================ */

/* ============================================================
   RECIPE DATABASE (mirrors recipes.js — standalone copy)
   ============================================================ */
const REC_RECIPES = [
  {
    id: 'r1', emoji: '🍳', name: 'Egg & Malunggay Scramble', type: 'Breakfast', kcal: 380, cost: 45, protein: 24, carbs: 18, fats: 12,
    diet: ['vegetarian'], goal: ['maintain', 'gain_muscle'],
    ingredients: [{ name: 'Eggs' }, { name: 'Malunggay leaves' }, { name: 'Garlic' }, { name: 'Onion' }, { name: 'Cooking oil' }]
  },
  {
    id: 'r2', emoji: '🥣', name: 'Oatmeal with Banana & Honey', type: 'Breakfast', kcal: 320, cost: 35, protein: 10, carbs: 58, fats: 6,
    diet: ['vegetarian', 'dairy_free'], goal: ['lose_weight', 'boost_energy'],
    ingredients: [{ name: 'Rolled oats' }, { name: 'Banana' }, { name: 'Honey' }, { name: 'Milk' }]
  },
  {
    id: 'r3', emoji: '🍜', name: 'Arroz Caldo', type: 'Breakfast', kcal: 340, cost: 55, protein: 18, carbs: 48, fats: 7,
    diet: [], goal: ['improve_health', 'manage_condition'],
    ingredients: [{ name: 'Glutinous rice' }, { name: 'Chicken' }, { name: 'Ginger' }, { name: 'Garlic' }, { name: 'Fish sauce' }, { name: 'Spring onion' }]
  },
  {
    id: 'r4', emoji: '🥗', name: 'Chicken & Veggie Rice Bowl', type: 'Lunch', kcal: 520, cost: 95, protein: 38, carbs: 52, fats: 10,
    diet: ['gluten_free'], goal: ['gain_muscle', 'maintain'],
    ingredients: [{ name: 'Chicken breast' }, { name: 'Brown rice' }, { name: 'Broccoli' }, { name: 'Soy sauce' }, { name: 'Sesame oil' }, { name: 'Garlic' }]
  },
  {
    id: 'r5', emoji: '🩵', name: 'Tinolang Manok', type: 'Lunch', kcal: 310, cost: 75, protein: 28, carbs: 20, fats: 8,
    diet: ['gluten_free', 'dairy_free'], goal: ['improve_health', 'lose_weight', 'manage_condition'],
    ingredients: [{ name: 'Chicken' }, { name: 'Green papaya' }, { name: 'Malunggay' }, { name: 'Ginger' }, { name: 'Fish sauce' }]
  },
  {
    id: 'r6', emoji: '🥩', name: 'Grilled Pork Liempo', type: 'Lunch', kcal: 560, cost: 110, protein: 42, carbs: 10, fats: 28,
    diet: ['gluten_free', 'dairy_free'], goal: ['gain_muscle', 'maintain'],
    ingredients: [{ name: 'Pork belly' }, { name: 'Calamansi' }, { name: 'Soy sauce' }, { name: 'Garlic' }, { name: 'Brown sugar' }]
  },
  {
    id: 'r7', emoji: '🍲', name: 'Sinigang na Isda', type: 'Dinner', kcal: 280, cost: 80, protein: 32, carbs: 18, fats: 5,
    diet: ['gluten_free', 'dairy_free'], goal: ['lose_weight', 'improve_health', 'manage_condition'],
    ingredients: [{ name: 'Bangus' }, { name: 'Kangkong' }, { name: 'Tamarind mix' }, { name: 'Tomatoes' }, { name: 'Fish sauce' }, { name: 'Radish' }]
  },
  {
    id: 'r8', emoji: '🍛', name: 'Monggo Guisado', type: 'Dinner', kcal: 380, cost: 55, protein: 22, carbs: 50, fats: 6,
    diet: ['dairy_free'], goal: ['lose_weight', 'improve_health'],
    ingredients: [{ name: 'Mung beans' }, { name: 'Pork' }, { name: 'Ampalaya leaves' }, { name: 'Garlic' }, { name: 'Tomato' }, { name: 'Fish sauce' }]
  },
  {
    id: 'r9', emoji: '🍌', name: 'Banana & Peanut Butter', type: 'Snack', kcal: 210, cost: 25, protein: 6, carbs: 30, fats: 8,
    diet: ['vegetarian', 'gluten_free'], goal: ['boost_energy', 'gain_muscle'],
    ingredients: [{ name: 'Banana' }, { name: 'Peanut butter' }]
  },
  {
    id: 'r10', emoji: '🧁', name: 'Camote Cue', type: 'Snack', kcal: 260, cost: 30, protein: 2, carbs: 54, fats: 7,
    diet: ['vegan', 'gluten_free', 'dairy_free'], goal: ['boost_energy'],
    ingredients: [{ name: 'Sweet potato' }, { name: 'Brown sugar' }, { name: 'Cooking oil' }]
  },
  {
    id: 'r11', emoji: '🥬', name: 'Pinakbet', type: 'Dinner', kcal: 220, cost: 60, protein: 12, carbs: 22, fats: 8,
    diet: ['gluten_free', 'dairy_free'], goal: ['lose_weight', 'improve_health', 'manage_condition'],
    ingredients: [{ name: 'Ampalaya' }, { name: 'Eggplant' }, { name: 'Squash' }, { name: 'String beans' }, { name: 'Bagoong alamang' }, { name: 'Pork' }]
  },
  {
    id: 'r12', 
    emoji: '🫙', 
    name: 'Ensaladang Talong', 
    type: 'Snack', 
    kcal: 120, 
    cost: 20, 
    protein: 4, 
    carbs: 12, 
    fats: 6,
    diet: ['vegan', 'gluten_free', 'dairy_free'], goal: ['lose_weight', 'improve_health'],
    ingredients: [{ 
      name: 'Eggplant' }, { 
      name: 'Tomato' }, { 
      name: 'Onion' }, { 
      name: 'Salted egg' }, { 
      name: 'Fish sauce' }
    ]},
];

/* ============================================================
   CONSTRAINT INGREDIENT BLOCKS (mirrors constraints.js)
   Standalone so recommend.js works without constraints.js
   ============================================================ */
const REC_CONSTRAINT_BLOCKS = {
  nut_allergy:       ['peanut butter','ground peanuts'],
  shellfish_allergy: ['bagoong alamang','shrimp','bagoong'],
  egg_free:          ['eggs','salted egg'],
  soy_free:          ['soy sauce','tofu'],
  vegetarian:        ['chicken','pork','bangus','tilapia','fish sauce','beef'],
  vegan:             ['chicken','pork','bangus','tilapia','fish sauce','eggs','salted egg','milk','honey'],
  halal:             ['pork','pork belly','bagoong'],
  gluten_free:       ['soy sauce'],
  dairy_free:        ['milk','butter','cream','yogurt'],
  low_sodium:        ['fish sauce','soy sauce','bagoong alamang','salted egg'],
  low_sugar:         ['brown sugar','honey','sugar'],
  diabetes_t1:       ['brown sugar','honey','sugar'],
  diabetes_t2:       ['brown sugar','honey','sugar'],
  hypertension:      ['fish sauce','soy sauce','bagoong alamang','salted egg'],
  high_cholesterol:  ['pork belly','butter'],
  gerd:              ['calamansi','vinegar','chili','tomato'],
  gout:              ['pork belly','beef','bagoong'],
};

const REC_ALLERGY_KEYS = ['nut_allergy','shellfish_allergy','egg_free','soy_free'];

/* ============================================================
   GOAL → IDEAL MACRO RANGES
   ============================================================ */
const REC_GOAL_IDEALS = {
  lose_weight:      { maxKcal:500, minProtein:20, maxFats:18,  minCarbs:0  },
  gain_muscle:      { maxKcal:999, minProtein:30, maxFats:999, minCarbs:40 },
  maintain:         { maxKcal:650, minProtein:15, maxFats:999, minCarbs:0  },
  improve_health:   { maxKcal:999, minProtein:15, maxFats:20,  minCarbs:0  },
  boost_energy:     { maxKcal:999, minProtein:0,  maxFats:999, minCarbs:35 },
  manage_condition: { maxKcal:500, minProtein:15, maxFats:18,  minCarbs:0  },
};

/* ============================================================
   STATE
   ============================================================ */
let recProfile = null;
let recSession = null;

/* ============================================================
   INIT — called from dashboard DOMContentLoaded
   ============================================================ */
async function initRecommendations(session, profile) {
  recSession = session;
  recProfile = profile || {};

  const widget = document.getElementById('rec-widget-body');
  if (!widget) return;

  /* Show skeleton while computing */
  widget.innerHTML = buildSkeletonHTML();

  /* Short delay for perceived "thinking" */
  await new Promise(function (r) { setTimeout(r, 400); });

  if (!recProfile.goal && !recProfile.height_cm) {
    widget.innerHTML =
      '<div class="rec-no-profile">' +
        '<span class="rec-no-profile-icon">🍽️</span>' +
        '<p>Complete your <a href="onboarding.html">health profile</a> to receive personalised recipe recommendations.</p>' +
      '</div>';
    return;
  }

  const top3 = scoreAndRankRecipes(recProfile);
  renderRecommendations(widget, top3);
}

/* ============================================================
   SCORING ENGINE
   ============================================================ */
function scoreAndRankRecipes(profile) {
  const goal     = profile.goal || 'maintain';
  const dietary  = profile.dietary_restrictions || [];
  const medical  = profile.medical_conditions   || [];
  const allConstraints = [...dietary, ...medical];
  const ideals   = REC_GOAL_IDEALS[goal] || REC_GOAL_IDEALS.maintain;

  /* TDEE-based per-meal calorie target */
  const dailyTarget = computeDailyTarget(profile);
  const perMealKcal = Math.round(dailyTarget / 4);

  const scored = REC_RECIPES.map(function (recipe) {
    let score  = 0;
    const tags = [];

    /* ---- 1. Goal alignment (0–40 pts) ---- */
    let goalScore = 0;

    /* Goal list match */
    if (recipe.goal && recipe.goal.includes(goal)) {
      goalScore += 20;
      tags.push({ type: 'goal', text: 'Matches your ' + formatGoal(goal) + ' goal' });
    }

    /* Macro fit */
    if (recipe.protein >= ideals.minProtein) goalScore += 8;
    if (recipe.kcal    <= ideals.maxKcal)    goalScore += 6;
    if (recipe.fats    <= ideals.maxFats)    goalScore += 3;
    if (recipe.carbs   >= ideals.minCarbs)   goalScore += 3;

    score += Math.min(40, goalScore);

    /* ---- 2. Constraint violations (penalty) ---- */
    let violations = 0;
    let allergyHit = false;

    allConstraints.forEach(function (key) {
      const blocked = REC_CONSTRAINT_BLOCKS[key] || [];
      const isAllergy = REC_ALLERGY_KEYS.includes(key);

      recipe.ingredients.forEach(function (ing) {
        const ingLower = ing.name.toLowerCase();
        blocked.forEach(function (b) {
          if (ingLower.includes(b) || b.includes(ingLower.split(' ')[0])) {
            violations++;
            if (isAllergy) allergyHit = true;
          }
        });
      });
    });

    if (allergyHit) {
      score -= 30;
      tags.push({ type: 'warn', text: 'Contains allergen — review before eating' });
    } else if (violations > 0) {
      score -= violations * 20;
      tags.push({ type: 'warn', text: violations + ' dietary flag' + (violations > 1 ? 's' : '') });
    }

    /* ---- 3. Calorie fit (0–15 pts) ---- */
    const calDiff = Math.abs(recipe.kcal - perMealKcal);
    if      (calDiff <= 50)  { score += 15; tags.push({ type: 'cal', text: 'Near-perfect calorie fit (' + recipe.kcal + ' kcal)' }); }
    else if (calDiff <= 120) { score += 10; }
    else if (calDiff <= 200) { score += 5;  }

    /* ---- 4. Dietary compliance bonus ---- */
    if (violations === 0 && allConstraints.length > 0) {
      score += 10;
      tags.push({ type: 'safe', text: 'Fully compliant with your dietary restrictions' });
    }

    /* ---- 5. Generate one-line reason ---- */
    const reason = generateReason(recipe, goal, ideals, violations, perMealKcal);

    return {
      recipe,
      score:   Math.max(0, score),
      tags,
      reason,
      violations,
      allergyHit,
    };
  });

  /* Sort by score desc, shuffle ties */
  scored.sort(function (a, b) {
    if (b.score !== a.score) return b.score - a.score;
    return Math.random() - 0.5;
  });

  return scored.slice(0, 3);
}

/* ============================================================
   REASON GENERATOR
   ============================================================ */
function generateReason(recipe, goal, ideals, violations, perMealKcal) {
  if (violations > 0 && REC_ALLERGY_KEYS.some(function (k) {
    return (recProfile.dietary_restrictions || []).includes(k) ||
           (recProfile.medical_conditions   || []).includes(k);
  })) {
    return 'Flagged — contains an ingredient that may conflict with your allergy profile.';
  }

  if (goal === 'lose_weight') {
    if (recipe.kcal <= 350 && recipe.protein >= 20) {
      return 'High-protein at only ' + recipe.kcal + ' kcal — ideal for staying in a calorie deficit while preserving muscle.';
    }
    return 'At ' + recipe.kcal + ' kcal with ' + recipe.protein + 'g protein, this supports your weight loss goal with good satiety.';
  }

  if (goal === 'gain_muscle') {
    if (recipe.protein >= 30) {
      return recipe.protein + 'g protein directly fuels muscle protein synthesis — a top pick for your muscle gain goal.';
    }
    return 'Solid ' + recipe.protein + 'g protein and ' + recipe.carbs + 'g carbs for energy — supports your muscle-building plan.';
  }

  if (goal === 'improve_health') {
    return 'Nutrient-dense Filipino ingredients with ' + recipe.protein + 'g protein and only ' + recipe.fats + 'g fat — great for overall wellness.';
  }

  if (goal === 'boost_energy') {
    return recipe.carbs + 'g of complex carbohydrates gives you sustained energy throughout the day.';
  }

  if (goal === 'manage_condition') {
    return 'Low in fat (' + recipe.fats + 'g) and moderate calories (' + recipe.kcal + ' kcal) — suitable for condition management.';
  }

  /* Maintain / fallback */
  const diff = Math.abs(recipe.kcal - perMealKcal);
  if (diff <= 80) {
    return 'Nearly matches your per-meal calorie target of ' + perMealKcal + ' kcal — a well-balanced choice.';
  }
  return 'Balanced macros with ' + recipe.protein + 'g protein, ' + recipe.carbs + 'g carbs, and ' + recipe.fats + 'g fat — fits your maintenance plan.';
}

/* ============================================================
   RENDER TOP 3
   ============================================================ */
function renderRecommendations(container, top3) {
  const ranks   = ['🥇', '🥈', '🥉'];
  const colors  = ['#2ddc7a', '#60a5fa', '#a78bfa'];

  const cardsHTML = top3.map(function (item, i) {
    const recipe   = item.recipe;
    const pct      = Math.min(Math.round((item.score / 70) * 100), 100);
    const color    = item.allergyHit ? '#f87171' : item.violations > 0 ? '#fbbf24' : colors[i];
    const circumf  = 2 * Math.PI * 13;
    const arcFill  = (pct / 100) * circumf;

    return '<a href="recipes.html" class="rec-card" style="position:relative;">' +
      '<div class="rec-card-banner">' +
        recipe.emoji +
        '<span class="rec-card-rank">' + ranks[i] + '</span>' +
        '<span class="rec-card-type-tag">' + recipe.type + '</span>' +
      '</div>' +
      '<div class="rec-card-body">' +
        '<div class="rec-card-name">' + recipe.name + '</div>' +
        '<div class="rec-score-row">' +
          '<div class="rec-score-ring">' +
            '<svg viewBox="0 0 36 36" width="36" height="36">' +
              '<circle cx="18" cy="18" r="13" fill="none" stroke="#111f16" stroke-width="4"/>' +
              '<circle cx="18" cy="18" r="13" fill="none" stroke="' + color + '" stroke-width="4"' +
                ' stroke-dasharray="' + arcFill.toFixed(1) + ' ' + circumf.toFixed(1) + '"' +
                ' stroke-linecap="round" id="rec-arc-' + i + '"/>' +
            '</svg>' +
            '<div class="rec-score-center" style="color:' + color + ';">' + pct + '</div>' +
          '</div>' +
          '<div class="rec-score-info">' +
            '<div class="rec-score-label">Match Score</div>' +
            '<div class="rec-score-bar-bg">' +
              '<div class="rec-score-bar-fill" data-w="' + pct + '%" style="width:0%;background:' + color + ';"></div>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="rec-stats">' +
          '<span class="rec-stat-chip"><b>' + recipe.kcal  + '</b> kcal</span>' +
          '<span class="rec-stat-chip"><b>' + recipe.protein + 'g</b> P</span>' +
          '<span class="rec-stat-chip">₱<b>' + recipe.cost + '</b></span>' +
        '</div>' +
        '<div class="rec-reason">' + item.reason + '</div>' +
      '</div>' +
    '</a>';
  }).join('');

  container.innerHTML = '<div class="rec-cards-grid">' + cardsHTML + '</div>';

  /* Animate score bars */
  setTimeout(function () {
    container.querySelectorAll('.rec-score-bar-fill').forEach(function (bar) {
      bar.style.width = bar.getAttribute('data-w');
    });
  }, 80);
}

/* ============================================================
   SKELETON LOADER
   ============================================================ */
function buildSkeletonHTML() {
  const card = '<div class="rec-skeleton-card">' +
    '<div class="rec-skeleton-banner"></div>' +
    '<div class="rec-skeleton-body">' +
      '<div class="rec-skeleton-line" style="width:80%;"></div>' +
      '<div class="rec-skeleton-line" style="width:55%;"></div>' +
      '<div class="rec-skeleton-line" style="width:90%;margin-top:4px;"></div>' +
    '</div>' +
  '</div>';
  return '<div class="rec-loading">' + card + card + card + '</div>';
}

/* ============================================================
   HELPERS
   ============================================================ */
function computeDailyTarget(profile) {
  const h   = parseFloat(profile.height_cm) || 170;
  const w   = parseFloat(profile.weight_kg)  || 70;
  const age = parseInt(profile.age)          || 25;
  const sex = profile.sex || 'male';
  let   bmr = sex === 'male'
    ? 10 * w + 6.25 * h - 5 * age + 5
    : 10 * w + 6.25 * h - 5 * age - 161;
  const tdee = bmr * 1.55;
  const adj  = { lose_weight:0.85, gain_muscle:1.1, maintain:1.0,
                 improve_health:1.0, boost_energy:1.0, manage_condition:0.9 };
  return Math.round(tdee * (adj[profile.goal] || 1.0));
}

function formatGoal(goal) {
  const labels = {
    lose_weight:'weight loss', gain_muscle:'muscle gain', maintain:'maintenance',
    improve_health:'health improvement', boost_energy:'energy boost',
    manage_condition:'condition management',
  };
  return labels[goal] || goal.replace(/_/g, ' ');
}
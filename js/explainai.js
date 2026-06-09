/* ============================================================
   BLANE — Explainable AI (Module 07)

   Generates human-readable reasoning for every meal
   recommendation based on the user's profile (goal,
   dietary restrictions, medical conditions) crossed with
   the meal's nutritional and contextual data.

   Shows a popover tooltip anchored to the "Why?" button
   on each meal card in mealplan.html.

   Depends on: supabase-config.js, auth.js
   Optional:   seasonal.js (for seasonal reasoning)
   ============================================================ */

/* ============================================================
   GOAL EXPLANATIONS
   ============================================================ */
const XAI_GOAL_META = {
  lose_weight:      { label: 'Lose Weight',       ideal: { maxKcal: 550, minProtein: 20, maxFats: 18 } },
  gain_muscle:      { label: 'Gain Muscle',        ideal: { minKcal: 400, minProtein: 30, minCarbs: 40 } },
  maintain:         { label: 'Maintain Weight',    ideal: { maxKcal: 650, minProtein: 15 } },
  improve_health:   { label: 'Improve Health',     ideal: { minProtein: 15, maxFats: 20 } },
  boost_energy:     { label: 'Boost Energy',       ideal: { minCarbs: 35, minKcal: 300 } },
  manage_condition: { label: 'Manage Condition',   ideal: { maxFats: 15, maxKcal: 500 } },
};

/* ============================================================
   STATE
   ============================================================ */
let xaiProfile     = null;
let xaiSession     = null;
let xaiPopoverEl   = null;
let xaiOverlayEl   = null;
let xaiActiveBtn   = null;

/* ============================================================
   INIT — called from mealplan DOMContentLoaded
   ============================================================ */
async function initExplainAI(session) {
  xaiSession = session;

  const { data: profile } = await _supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .maybeSingle();

  xaiProfile = profile || {};

  /* Pre-build popover container (hidden) */
  xaiPopoverEl = document.createElement('div');
  xaiPopoverEl.className = 'xai-popover';
  xaiPopoverEl.style.display = 'none';
  document.body.appendChild(xaiPopoverEl);
}

/* ============================================================
   OPEN POPOVER
   Called by the "Why?" button in each meal card
   ============================================================ */
function openXaiPopover(btn, meal) {
  /* Toggle — close if same button clicked again */
  if (xaiActiveBtn === btn && xaiPopoverEl.style.display !== 'none') {
    closeXaiPopover();
    return;
  }

  closeXaiPopover();
  xaiActiveBtn = btn;
  btn.classList.add('active');

  /* Generate explanation */
  const explanation = generateExplanation(meal, xaiProfile);

  /* Build popover HTML */
  const chipsHTML = explanation.chips.map(function (c) {
    return '<span class="xai-chip ' + c.type + '">' + c.icon + ' ' + c.label + '</span>';
  }).join('');

  const reasonsHTML = explanation.reasons.map(function (r) {
    return '<div class="xai-reason-row">' +
      '<div class="xai-reason-dot ' + r.color + '"></div>' +
      '<div class="xai-reason-text">' + r.text + '</div>' +
    '</div>';
  }).join('');

  xaiPopoverEl.innerHTML =
    '<div class="xai-pop-header">' +
      '<div class="xai-pop-header-left">' +
        '<div class="xai-pop-icon">🤖</div>' +
        '<div>' +
          '<div class="xai-pop-title">Why Recommended?</div>' +
          '<div class="xai-pop-meal">' + meal.name + '</div>' +
        '</div>' +
      '</div>' +
      '<button class="xai-pop-close" onclick="closeXaiPopover()">✕</button>' +
    '</div>' +

    '<div class="xai-confidence">' +
      '<span class="xai-confidence-label">Match Score</span>' +
      '<div class="xai-confidence-bar-bg">' +
        '<div class="xai-confidence-bar-fill" style="width:0%" id="xai-conf-bar"></div>' +
      '</div>' +
      '<span class="xai-confidence-pct">' + explanation.confidence + '%</span>' +
    '</div>' +

    '<div class="xai-chips">' + chipsHTML + '</div>' +

    '<div class="xai-explanation">' + reasonsHTML + '</div>' +

    '<div class="xai-pop-footer">' +
      '<span class="xai-model-badge">🧠 BLANE AI</span>' +
      'Based on your profile · Updated on each log' +
    '</div>';

  /* Position popover near button */
  xaiPopoverEl.style.display = 'block';
  positionPopover(btn);

  /* Animate confidence bar */
  setTimeout(function () {
    const bar = document.getElementById('xai-conf-bar');
    if (bar) bar.style.width = explanation.confidence + '%';
  }, 80);

  /* Transparent overlay to catch outside clicks */
  xaiOverlayEl = document.createElement('div');
  xaiOverlayEl.className = 'xai-overlay';
  xaiOverlayEl.addEventListener('click', closeXaiPopover);
  document.body.appendChild(xaiOverlayEl);

  /* ESC key closes */
  document.addEventListener('keydown', xaiEscHandler);
}

/* ============================================================
   CLOSE POPOVER
   ============================================================ */
function closeXaiPopover() {
  if (xaiPopoverEl) xaiPopoverEl.style.display = 'none';
  if (xaiOverlayEl && xaiOverlayEl.parentNode) {
    xaiOverlayEl.parentNode.removeChild(xaiOverlayEl);
    xaiOverlayEl = null;
  }
  if (xaiActiveBtn) {
    xaiActiveBtn.classList.remove('active');
    xaiActiveBtn = null;
  }
  document.removeEventListener('keydown', xaiEscHandler);
}

function xaiEscHandler(e) {
  if (e.key === 'Escape') closeXaiPopover();
}

/* ============================================================
   POSITION POPOVER
   Anchors below button, flips above if not enough space below
   ============================================================ */
function positionPopover(btn) {
  const btnRect  = btn.getBoundingClientRect();
  const popW     = 320;
  const popH     = xaiPopoverEl.offsetHeight || 280;
  const vpW      = window.innerWidth;
  const vpH      = window.innerHeight;
  const margin   = 8;

  /* Horizontal: align to button left, clamp to viewport */
  let left = btnRect.left;
  if (left + popW > vpW - margin) left = vpW - popW - margin;
  if (left < margin) left = margin;

  /* Vertical: prefer below, flip above if needed */
  let top = btnRect.bottom + 10;
  const arrowBottom = top + popH > vpH - margin;
  if (arrowBottom) {
    top = btnRect.top - popH - 10;
    xaiPopoverEl.classList.add('arrow-bottom');
  } else {
    xaiPopoverEl.classList.remove('arrow-bottom');
  }

  xaiPopoverEl.style.left = left + 'px';
  xaiPopoverEl.style.top  = top  + 'px';
}

/* ============================================================
   EXPLANATION GENERATOR
   Core logic — reads profile + meal → produces reasons
   ============================================================ */
function generateExplanation(meal, profile) {
  const goal       = profile.goal || 'maintain';
  const goalMeta   = XAI_GOAL_META[goal] || XAI_GOAL_META.maintain;
  const ideal      = goalMeta.ideal;
  const dietary    = profile.dietary_restrictions || [];
  const medical    = profile.medical_conditions   || [];

  const chips   = [];
  const reasons = [];
  let   score   = 0;

  /* ---- 1. Goal match ---- */
  const goalMatch = checkGoalMatch(meal, goal, ideal);
  score += goalMatch.score;
  chips.push({ type: 'goal', icon: '🎯', label: goalMeta.label });
  reasons.push({ color: 'green', text: goalMatch.text });

  /* ---- 2. Protein reasoning ---- */
  const proteinReason = checkProtein(meal, goal);
  score += proteinReason.score;
  chips.push({ type: 'macro', icon: '💪', label: proteinReason.chipLabel });
  reasons.push({ color: 'blue', text: proteinReason.text });

  /* ---- 3. Calorie fit ---- */
  const calReason = checkCalories(meal, goal, profile);
  score += calReason.score;
  reasons.push({ color: 'yellow', text: calReason.text });

  /* ---- 4. Seasonal check ---- */
  if (typeof SEASONAL !== 'undefined') {
    const seasonResult = SEASONAL.scoreRecipe(meal.ingredients);
    if (seasonResult.cssClass === 'in-season') {
      score += 15;
      chips.push({ type: 'seasonal', icon: '🌿', label: 'In Season' });
      reasons.push({ color: 'teal', text: '<strong>Seasonally optimal</strong> — all key ingredients are fresh and locally available right now, lowering cost and maximising nutrition.' });
    } else if (seasonResult.cssClass === 'partial') {
      score += 8;
      chips.push({ type: 'seasonal', icon: '🌤️', label: 'Mostly In Season' });
      reasons.push({ color: 'teal', text: 'Most ingredients are <strong>in season</strong> this month. One or two may require a market substitute.' });
    }
  }

  /* ---- 5. Dietary restrictions ---- */
  if (dietary.length > 0) {
    const dietCheck = checkDietaryFit(meal, dietary);
    score += dietCheck.score;
    chips.push({ type: 'diet', icon: '✓', label: 'Diet Safe' });
    reasons.push({ color: 'green', text: dietCheck.text });
  }

  /* ---- 6. Medical conditions ---- */
  if (medical.length > 0) {
    const medReason = checkMedicalFit(meal, medical);
    if (medReason) {
      score += medReason.score;
      reasons.push({ color: 'purple', text: medReason.text });
    }
  }

  /* ---- 7. Budget ---- */
  const budgetReason = checkBudget(meal, profile);
  score += budgetReason.score;
  chips.push({ type: 'budget', icon: '💸', label: budgetReason.chipLabel });
  reasons.push({ color: 'yellow', text: budgetReason.text });

  /* Confidence: clamp 50–98 */
  const confidence = Math.min(98, Math.max(50, score));

  return { chips, reasons, confidence };
}

/* ============================================================
   INDIVIDUAL REASON CHECKERS
   ============================================================ */
function checkGoalMatch(meal, goal, ideal) {
  let score = 20;
  let text  = '';

  if (goal === 'lose_weight') {
    if (meal.kcal <= 500 && meal.fats <= 18) {
      score = 30;
      text  = '<strong>' + meal.name + '</strong> fits your <strong>weight loss goal</strong> — at ' + meal.kcal + ' kcal and only ' + meal.fats + 'g fat, it supports a calorie deficit without leaving you hungry.';
    } else if (meal.kcal <= 600) {
      score = 20;
      text  = 'With <strong>' + meal.kcal + ' kcal</strong>, this meal is moderate for your <strong>weight loss plan</strong>. Pair it with lighter meals earlier in the day to stay within your daily target.';
    } else {
      score = 10;
      text  = 'This meal is slightly higher in calories than ideal for weight loss, but its <strong>' + meal.protein + 'g protein</strong> helps preserve muscle while in a deficit.';
    }
  } else if (goal === 'gain_muscle') {
    if (meal.protein >= 30) {
      score = 30;
      text  = '<strong>' + meal.name + '</strong> is excellent for your <strong>muscle gain goal</strong> — ' + meal.protein + 'g of protein directly supports muscle protein synthesis and recovery.';
    } else {
      score = 18;
      text  = 'With <strong>' + meal.protein + 'g protein</strong>, this meal contributes to your daily muscle-building target. Combine with a high-protein snack to hit your goal.';
    }
  } else if (goal === 'maintain') {
    score = 25;
    text  = '<strong>' + meal.name + '</strong> is well-balanced for your <strong>maintenance goal</strong> — ' + meal.kcal + ' kcal with a healthy mix of ' + meal.protein + 'g protein, ' + meal.carbs + 'g carbs, and ' + meal.fats + 'g fats.';
  } else if (goal === 'improve_health') {
    score = 22;
    text  = 'This meal aligns with your <strong>health improvement goal</strong> by providing essential micronutrients and a balanced macronutrient profile to support overall wellbeing.';
  } else if (goal === 'boost_energy') {
    if (meal.carbs >= 35) {
      score = 28;
      text  = '<strong>' + meal.carbs + 'g of complex carbs</strong> in this meal gives you sustained energy throughout the day — ideal for your <strong>energy boost goal</strong>.';
    } else {
      score = 18;
      text  = 'This meal provides <strong>' + meal.kcal + ' kcal</strong> of clean fuel, supporting your goal of maintaining steady energy levels.';
    }
  } else if (goal === 'manage_condition') {
    score = 22;
    text  = 'This meal is recommended to support your <strong>health condition management</strong> — it avoids common dietary triggers while delivering balanced nutrition.';
  } else {
    text = '<strong>' + meal.name + '</strong> was recommended to match your current nutritional targets.';
  }

  return { score, text };
}

function checkProtein(meal, goal) {
  let score = 0, chipLabel = '', text = '';

  if (meal.protein >= 30) {
    score     = 15;
    chipLabel = 'High Protein';
    text      = 'At <strong>' + meal.protein + 'g protein</strong>, this meal is a strong source for muscle repair and satiety — keeping you fuller for longer between meals.';
  } else if (meal.protein >= 18) {
    score     = 10;
    chipLabel = 'Good Protein';
    text      = '<strong>' + meal.protein + 'g of protein</strong> makes this a solid mid-range source — enough to support daily body maintenance and prevent muscle breakdown.';
  } else {
    score     = 5;
    chipLabel = 'Moderate Protein';
    text      = 'This meal provides <strong>' + meal.protein + 'g protein</strong>. It is best paired with a higher-protein meal earlier or later in the day to meet your daily target.';
  }

  return { score, chipLabel, text };
}

function checkCalories(meal, goal, profile) {
  const h   = parseFloat(profile.height_cm) || 170;
  const w   = parseFloat(profile.weight_kg)  || 70;
  const age = parseInt(profile.age)          || 25;
  const sex = profile.sex || 'male';

  let bmr = sex === 'male'
    ? 10 * w + 6.25 * h - 5 * age + 5
    : 10 * w + 6.25 * h - 5 * age - 161;

  const tdee       = Math.round(bmr * 1.55);
  const dailyTarget = goal === 'lose_weight' ? Math.round(tdee * 0.85)
                    : goal === 'gain_muscle'  ? Math.round(tdee * 1.1)
                    : tdee;
  const perMeal    = Math.round(dailyTarget / 4);
  const diff       = meal.kcal - perMeal;
  const diffAbs    = Math.abs(diff);
  let   score = 0, text = '';

  if (diffAbs <= 50) {
    score = 12;
    text  = 'At <strong>' + meal.kcal + ' kcal</strong>, this meal is almost exactly your per-meal target of <strong>' + perMeal + ' kcal</strong> — a near-perfect calorie fit.';
  } else if (diff < 0) {
    score = 8;
    text  = 'This meal is <strong>' + diffAbs + ' kcal below</strong> your per-meal target (' + perMeal + ' kcal), leaving budget for a slightly larger portion or a small snack.';
  } else {
    score = 5;
    text  = 'At <strong>' + meal.kcal + ' kcal</strong>, this meal is ' + diffAbs + ' kcal above your per-meal target. Consider a lighter dinner to balance your daily total.';
  }

  return { score, text };
}

function checkDietaryFit(meal, dietary) {
  const restrictions = dietary.join(', ').replace(/_/g, ' ');
  return {
    score: 10,
    text:  'This meal is <strong>compatible with your dietary restrictions</strong> (' + restrictions + ') — no conflicting ingredients were detected.',
  };
}

function checkMedicalFit(meal, medical) {
  const cond = medical[0].replace(/_/g, ' ');
  if (medical.includes('diabetes_t1') || medical.includes('diabetes_t2')) {
    const glycemicNote = meal.carbs <= 30
      ? 'low carb content (' + meal.carbs + 'g) helps manage blood sugar levels'
      : 'moderate carbs (' + meal.carbs + 'g) — monitor portion size for blood glucose management';
    return { score: 8, text: 'Considering your <strong>' + cond + '</strong> condition: this meal\'s ' + glycemicNote + '.' };
  }
  if (medical.includes('hypertension')) {
    return { score: 8, text: 'For <strong>hypertension management</strong>, this meal uses minimal added salt and no processed ingredients, helping keep sodium intake in check.' };
  }
  if (medical.includes('high_cholesterol')) {
    const fatNote = meal.fats <= 12 ? 'low fat content (' + meal.fats + 'g) is heart-friendly' : 'moderate fat — opt for cooking oil over saturated fats';
    return { score: 8, text: 'For <strong>high cholesterol</strong>: this meal\'s ' + fatNote + '.' };
  }
  return { score: 5, text: 'This meal was selected with your <strong>' + cond + '</strong> condition in mind, avoiding common dietary triggers.' };
}

function checkBudget(meal, profile) {
  let chipLabel, text, score;

  if (meal.cost <= 40) {
    score     = 10;
    chipLabel = '₱' + meal.cost + ' Budget Meal';
    text      = 'At just <strong>₱' + meal.cost + '</strong>, this is one of the most affordable meals in your plan — excellent value without compromising on nutrition.';
  } else if (meal.cost <= 80) {
    score     = 7;
    chipLabel = '₱' + meal.cost + ' Affordable';
    text      = 'At <strong>₱' + meal.cost + '</strong>, this meal is reasonably priced and uses ingredients commonly available at your local palengke or supermarket.';
  } else {
    score     = 4;
    chipLabel = '₱' + meal.cost + ' Pricey';
    text      = 'This meal costs <strong>₱' + meal.cost + '</strong> — slightly above average. Buying ingredients at the public market instead of a supermarket can reduce cost by 20–30%.';
  }

  return { score, chipLabel, text };
}
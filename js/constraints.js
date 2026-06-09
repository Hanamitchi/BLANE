/* ============================================================
   BLANE — Constraint-Based Planning (Module 08)

   Loads dietary_restrictions + medical_conditions from
   the user's Supabase profile, then annotates every recipe
   on the recipes page with:
     - Soft warning badge on card (never hides the recipe)
     - Violation detail panel inside the recipe modal
     - Active constraints bar at top of recipes page

   Severity levels:
     allergy  → 🔴 hard (nut/shellfish/egg/soy allergy)
     dietary  → 🟡 soft (vegetarian, halal, gluten-free…)
     medical  → 🟠 medical (diabetes, hypertension…)

   Depends on: supabase-config.js, auth.js
   ============================================================ */

/* ============================================================
   CONSTRAINT DEFINITIONS
   Maps profile key → { label, severity, blockedIngredients }
   ============================================================ */
const CB_CONSTRAINTS = {

  /* ---- Allergies (hard) ---- */
  nut_allergy: {
    label:    'Nut Allergy',
    severity: 'allergy',
    icon:     '🥜',
    blocked:  ['peanut butter', 'ground peanuts', 'cashew', 'almond', 'peanuts'],
    reason:   'contains nut-based ingredient',
  },
  shellfish_allergy: {
    label:    'Shellfish Allergy',
    severity: 'allergy',
    icon:     '🦐',
    blocked:  ['bagoong alamang', 'shrimp', 'prawn', 'crab', 'squid', 'bagoong'],
    reason:   'contains shellfish or shellfish-derived ingredient',
  },
  egg_free: {
    label:    'Egg-Free',
    severity: 'allergy',
    icon:     '🥚',
    blocked:  ['eggs', 'egg', 'salted egg', 'egg yolk', 'egg white'],
    reason:   'contains egg',
  },
  soy_free: {
    label:    'Soy-Free',
    severity: 'allergy',
    icon:     '🫘',
    blocked:  ['soy sauce', 'tofu', 'soy milk', 'edamame', 'miso'],
    reason:   'contains soy-based ingredient',
  },

  /* ---- Dietary preferences (soft) ---- */
  vegetarian: {
    label:    'Vegetarian',
    severity: 'dietary',
    icon:     '🥦',
    blocked:  ['chicken', 'chicken breast', 'chicken thigh', 'pork', 'pork belly',
               'bangus', 'tilapia', 'fish sauce', 'bagoong alamang', 'beef',
               'chicken breast', 'grilled pork'],
    reason:   'contains meat or fish',
  },
  vegan: {
    label:    'Vegan',
    severity: 'dietary',
    icon:     '🌱',
    blocked:  ['chicken', 'chicken breast', 'pork', 'pork belly', 'bangus', 'tilapia',
               'fish sauce', 'bagoong alamang', 'eggs', 'salted egg', 'milk', 'honey'],
    reason:   'contains animal product',
  },
  halal: {
    label:    'Halal',
    severity: 'dietary',
    icon:     '☪️',
    blocked:  ['pork', 'pork belly', 'bagoong', 'bagoong alamang'],
    reason:   'contains non-halal ingredient',
  },
  gluten_free: {
    label:    'Gluten-Free',
    severity: 'dietary',
    icon:     '🌾',
    blocked:  ['soy sauce', 'wheat', 'bread', 'flour', 'pasta'],
    reason:   'may contain gluten',
  },
  dairy_free: {
    label:    'Dairy-Free',
    severity: 'dietary',
    icon:     '🥛',
    blocked:  ['milk', 'cheese', 'butter', 'cream', 'yogurt', 'kesong puti'],
    reason:   'contains dairy',
  },
  low_sodium: {
    label:    'Low Sodium',
    severity: 'dietary',
    icon:     '🧂',
    blocked:  ['fish sauce', 'soy sauce', 'bagoong alamang', 'salted egg', 'bagoong'],
    reason:   'high sodium ingredient',
  },
  low_sugar: {
    label:    'Low Sugar',
    severity: 'dietary',
    icon:     '🍬',
    blocked:  ['honey', 'brown sugar', 'sugar', 'condensed milk'],
    reason:   'high sugar ingredient',
  },
  kosher: {
    label:    'Kosher',
    severity: 'dietary',
    icon:     '✡️',
    blocked:  ['pork', 'pork belly', 'shellfish', 'bagoong alamang'],
    reason:   'not kosher ingredient',
  },

  /* ---- Medical conditions (medical) ---- */
  diabetes_t1: {
    label:    'Diabetes Type 1',
    severity: 'medical',
    icon:     '💉',
    warnHighCarb: true,
    carbThreshold: 45,
    blocked:  ['brown sugar', 'sugar', 'honey', 'condensed milk'],
    reason:   'high glycemic ingredient — monitor blood sugar',
  },
  diabetes_t2: {
    label:    'Diabetes Type 2',
    severity: 'medical',
    icon:     '🩸',
    warnHighCarb: true,
    carbThreshold: 45,
    blocked:  ['brown sugar', 'sugar', 'honey', 'condensed milk'],
    reason:   'high glycemic ingredient — monitor blood sugar',
  },
  hypertension: {
    label:    'Hypertension',
    severity: 'medical',
    icon:     '❤️',
    blocked:  ['fish sauce', 'soy sauce', 'bagoong alamang', 'salted egg', 'bagoong'],
    reason:   'high sodium — may raise blood pressure',
  },
  high_cholesterol: {
    label:    'High Cholesterol',
    severity: 'medical',
    icon:     '🫀',
    warnHighFat: true,
    fatThreshold: 20,
    blocked:  ['pork belly', 'butter', 'cream', 'coconut cream'],
    reason:   'high saturated fat — may raise cholesterol',
  },
  gerd: {
    label:    'GERD / Acid Reflux',
    severity: 'medical',
    icon:     '🔥',
    blocked:  ['calamansi', 'vinegar', 'chili', 'tomato', 'garlic'],
    reason:   'may trigger acid reflux',
  },
  kidney_disease: {
    label:    'Kidney Disease',
    severity: 'medical',
    icon:     '🫘',
    warnHighProtein: true,
    proteinThreshold: 30,
    blocked:  ['bagoong alamang', 'fish sauce', 'soy sauce'],
    reason:   'high phosphorus/sodium — avoid with kidney disease',
  },
  gout: {
    label:    'Gout',
    severity: 'medical',
    icon:     '🦵',
    blocked:  ['pork belly', 'beef', 'sardines', 'anchovies', 'bagoong'],
    reason:   'high purine content — may trigger gout',
  },
};

/* ============================================================
   STATE
   ============================================================ */
let cbProfile    = null;
let cbSession    = null;
let cbActive     = [];   /* active CB_CONSTRAINTS keys from profile */
let cbFilterOn   = true; /* toggle to show/hide warning filter */

/* ============================================================
   INIT — called from recipes DOMContentLoaded
   ============================================================ */
async function initConstraints(session) {
  cbSession = session;

  const { data: profile } = await _supabase
    .from('profiles')
    .select('dietary_restrictions, medical_conditions, goal')
    .eq('id', session.user.id)
    .maybeSingle();

  cbProfile = profile || {};

  /* Build active constraint list from profile */
  const dietary = cbProfile.dietary_restrictions || [];
  const medical  = cbProfile.medical_conditions  || [];

  cbActive = [...dietary, ...medical].filter(function (key) {
    return CB_CONSTRAINTS[key] !== undefined;
  });

  renderConstraintBar();
}

/* ============================================================
   RENDER ACTIVE CONSTRAINT BAR
   ============================================================ */
function renderConstraintBar() {
  const bar = document.getElementById('cb-active-bar');
  if (!bar) return;

  if (cbActive.length === 0) {
    bar.innerHTML =
      '<span class="cb-active-bar-label">🛡️ Constraints:</span>' +
      '<span class="cb-no-constraints">No dietary constraints set — ' +
        '<a href="profile.html" style="color:#2ddc7a;">add them in your profile</a>' +
      '</span>';
    return;
  }

  const chips = cbActive.map(function (key) {
    const c = CB_CONSTRAINTS[key];
    return '<span class="cb-active-chip ' + c.severity + '">' + c.icon + ' ' + c.label + '</span>';
  }).join('');

  bar.innerHTML =
    '<span class="cb-active-bar-label">🛡️ Active constraints: <span>' + cbActive.length + '</span></span>' +
    '<div class="cb-active-chips">' + chips + '</div>' +
    '<button class="cb-filter-active-btn" id="cb-toggle-btn" onclick="toggleConstraintFilter()">' +
      '⚠️ Warnings ON' +
    '</button>';
}

/* ============================================================
   TOGGLE CONSTRAINT FILTER
   ============================================================ */
function toggleConstraintFilter() {
  cbFilterOn = !cbFilterOn;
  const btn = document.getElementById('cb-toggle-btn');
  if (btn) {
    btn.textContent = cbFilterOn ? '⚠️ Warnings ON' : '○ Warnings OFF';
    btn.className   = 'cb-filter-active-btn' + (cbFilterOn ? '' : ' off');
  }
  /* Re-render grid with updated warnings */
  if (typeof renderGrid === 'function') renderGrid();
}

/* ============================================================
   CHECK RECIPE VIOLATIONS
   Returns array of violation objects
   ============================================================ */
function checkRecipeViolations(recipe) {
  if (!cbFilterOn || cbActive.length === 0) return [];

  const violations = [];

  cbActive.forEach(function (key) {
    const constraint = CB_CONSTRAINTS[key];
    if (!constraint) return;

    /* Check blocked ingredients */
    recipe.ingredients.forEach(function (ing) {
      const ingName = ing.name.toLowerCase();
      const isBlocked = constraint.blocked.some(function (blocked) {
        return ingName.includes(blocked.toLowerCase()) ||
               blocked.toLowerCase().includes(ingName.split(' ')[0]);
      });

      if (isBlocked) {
        /* Avoid duplicate violations for same ingredient + constraint */
        const exists = violations.some(function (v) {
          return v.ingredient === ing.name && v.constraintKey === key;
        });
        if (!exists) {
          violations.push({
            constraintKey: key,
            constraintLabel: constraint.label,
            severity:  constraint.severity,
            icon:      constraint.icon,
            ingredient: ing.name,
            reason:     constraint.reason,
          });
        }
      }
    });

    /* Macro threshold checks */
    if (constraint.warnHighCarb && recipe.carbs > constraint.carbThreshold) {
      violations.push({
        constraintKey:  key,
        constraintLabel: constraint.label,
        severity:  constraint.severity,
        icon:      constraint.icon,
        ingredient: 'Total Carbs (' + recipe.carbs + 'g)',
        reason:     'exceeds ' + constraint.carbThreshold + 'g carb threshold for ' + constraint.label,
      });
    }
    if (constraint.warnHighFat && recipe.fats > constraint.fatThreshold) {
      violations.push({
        constraintKey:  key,
        constraintLabel: constraint.label,
        severity:  constraint.severity,
        icon:      constraint.icon,
        ingredient: 'Total Fats (' + recipe.fats + 'g)',
        reason:     'exceeds ' + constraint.fatThreshold + 'g fat threshold for ' + constraint.label,
      });
    }
    if (constraint.warnHighProtein && recipe.protein > constraint.proteinThreshold) {
      violations.push({
        constraintKey:  key,
        constraintLabel: constraint.label,
        severity:  constraint.severity,
        icon:      constraint.icon,
        ingredient: 'Total Protein (' + recipe.protein + 'g)',
        reason:     'exceeds ' + constraint.proteinThreshold + 'g protein threshold for ' + constraint.label,
      });
    }
  });

  return violations;
}

/* ============================================================
   VIOLATION BADGE HTML (for recipe card)
   ============================================================ */
function getViolationBadgeHTML(violations) {
  if (violations.length === 0) {
    return '<span class="cb-violation-badge safe">✓ Constraint Safe</span>';
  }

  /* Show highest severity violation */
  const order    = { allergy: 0, medical: 1, dietary: 2 };
  const sorted   = violations.slice().sort(function (a, b) {
    return order[a.severity] - order[b.severity];
  });
  const top      = sorted[0];
  const moreCount = violations.length - 1;
  const moreText  = moreCount > 0 ? ' +' + moreCount : '';

  return '<span class="cb-violation-badge ' + top.severity + '">' +
    top.icon + ' ' + top.constraintLabel + moreText +
  '</span>';
}

/* ============================================================
   VIOLATION DETAIL HTML (for recipe modal)
   ============================================================ */
function getViolationDetailHTML(violations) {
  if (violations.length === 0) return '';

  /* Group by severity */
  const allergies = violations.filter(function (v) { return v.severity === 'allergy'; });
  const medicals  = violations.filter(function (v) { return v.severity === 'medical'; });
  const dietaries = violations.filter(function (v) { return v.severity === 'dietary'; });

  let html = '<div class="cb-modal-section">';

  /* Section title */
  html += '<div style="font-family:\'Syne\',sans-serif;font-size:13px;font-weight:700;color:#e8f5ee;margin-bottom:10px;display:flex;align-items:center;gap:6px;">' +
    '🛡️ Constraint Warnings' +
    '<span style="font-size:11px;background:rgba(248,113,113,0.1);color:#f87171;border:1px solid rgba(248,113,113,0.2);border-radius:100px;padding:2px 8px;font-family:\'DM Sans\',sans-serif;font-weight:600;">' +
      violations.length + ' flag' + (violations.length > 1 ? 's' : '') +
    '</span>' +
  '</div>';

  function buildGroup(items, sev, header) {
    if (items.length === 0) return '';
    const rows = items.map(function (v) {
      return '<div class="cb-violation-row">' +
        '<span style="font-size:14px;">' + v.icon + '</span>' +
        '<div class="cb-violation-row-ing">' + v.ingredient + '</div>' +
        '<div class="cb-violation-row-reason">' + v.reason + '</div>' +
        '<span class="cb-violation-severity ' + sev + '">' + sev.charAt(0).toUpperCase() + sev.slice(1) + '</span>' +
      '</div>';
    }).join('');

    return '<div class="cb-modal-header ' + sev + '">' +
        '<span class="cb-modal-header-icon">' + (sev === 'allergy' ? '🚨' : sev === 'medical' ? '⚕️' : '⚠️') + '</span>' +
        '<div class="cb-modal-header-text"><strong>' + header + '</strong></div>' +
      '</div>' +
      '<div class="cb-violation-list" style="margin-bottom:10px;">' + rows + '</div>';
  }

  html += buildGroup(allergies, 'allergy', 'Allergy Alert — these ingredients conflict with your allergy profile.');
  html += buildGroup(medicals,  'medical', 'Medical Advisory — review with your healthcare provider.');
  html += buildGroup(dietaries, 'dietary', 'Dietary Preference — this recipe contains restricted items.');

  html += '</div>';
  return html;
}
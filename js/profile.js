/* ============================================================
   BLANE — Profile Module
   Handles: load profile, 3 tabs, edit/save to Supabase,
            BMI card, calorie target, progress stats,
            password change
   Depends on: supabase-config.js, auth.js
   ============================================================ */

/* ============================================================
   CONSTANTS
   ============================================================ */
const GOAL_META = {
  lose_weight:      { icon: '🔥', label: 'Lose Weight'      },
  gain_muscle:      { icon: '💪', label: 'Gain Muscle'       },
  maintain:         { icon: '⚖️', label: 'Maintain'          },
  improve_health:   { icon: '❤️', label: 'Improve Health'    },
  boost_energy:     { icon: '⚡', label: 'Boost Energy'      },
  manage_condition: { icon: '🩺', label: 'Manage Condition'  },
};

const ALL_GOALS = Object.keys(GOAL_META);

const DIETARY_OPTS = [
  { value: 'vegetarian',       label: '🥦 Vegetarian'        },
  { value: 'vegan',            label: '🌱 Vegan'             },
  { value: 'halal',            label: '☪️ Halal'             },
  { value: 'kosher',           label: '✡️ Kosher'            },
  { value: 'gluten_free',      label: '🌾 Gluten-Free'       },
  { value: 'dairy_free',       label: '🥛 Dairy-Free'        },
  { value: 'nut_allergy',      label: '🥜 Nut Allergy'       },
  { value: 'shellfish_allergy',label: '🦐 Shellfish Allergy' },
  { value: 'egg_free',         label: '🥚 Egg-Free'          },
  { value: 'soy_free',         label: '🫘 Soy-Free'          },
  { value: 'low_sodium',       label: '🧂 Low Sodium'        },
  { value: 'low_sugar',        label: '🍬 Low Sugar'         },
];

const MEDICAL_OPTS = [
  { value: 'diabetes_t1',    label: '💉 Diabetes Type 1'  },
  { value: 'diabetes_t2',    label: '🩸 Diabetes Type 2'  },
  { value: 'hypertension',   label: '❤️ Hypertension'     },
  { value: 'high_cholesterol',label: '🫀 High Cholesterol' },
  { value: 'gerd',           label: '🔥 GERD / Acid Reflux'},
  { value: 'ibs',            label: '🫃 IBS / Gut Issues'  },
  { value: 'kidney_disease', label: '🫘 Kidney Disease'    },
  { value: 'thyroid',        label: '🦋 Thyroid Disorder'  },
  { value: 'anemia',         label: '🩺 Anemia'            },
  { value: 'pcos',           label: '🔵 PCOS'              },
  { value: 'gout',           label: '🦵 Gout'              },
  { value: 'celiac',         label: '🌾 Celiac Disease'    },
];

const ACTIVITY_LABELS = {
  sedentary:    'Sedentary',
  light:        'Lightly Active',
  moderate:     'Moderately Active',
  very_active:  'Very Active',
  extra_active: 'Extra Active',
};

/* Activity multipliers for TDEE */
const ACTIVITY_MULT = {
  sedentary:    1.2,
  light:        1.375,
  moderate:     1.55,
  very_active:  1.725,
  extra_active: 1.9,
};

/* State */
let userProfile  = null;
let userSession  = null;
let activeTab    = 'basic';
let editingBasic  = false;
let editingHealth = false;

/* ============================================================
   INIT
   ============================================================ */
document.addEventListener('DOMContentLoaded', async function () {
  userSession = await guardPage();
  if (!userSession) return;

  await loadProfile();

  /* Tab buttons */
  document.querySelectorAll('.pf-tab-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      switchTab(btn.getAttribute('data-tab'));
    });
  });

  /* Password toggle */
  document.getElementById('pf-change-pwd-btn').addEventListener('click', function () {
    document.getElementById('pf-password-form').classList.toggle('open');
    this.textContent = document.getElementById('pf-password-form').classList.contains('open')
      ? 'Cancel' : 'Change Password';
  });

  document.getElementById('pf-pwd-save-btn').addEventListener('click', handlePasswordChange);
});

/* ============================================================
   LOAD PROFILE
   ============================================================ */
async function loadProfile() {
  const { data, error } = await _supabase
    .from('profiles')
    .select('*')
    .eq('id', userSession.user.id)
    .maybeSingle();

  userProfile = data || {};

  renderHero();
  renderStats();
  renderBasicTab();
  renderHealthTab();
  renderAccountTab();
}

/* ============================================================
   HERO
   ============================================================ */
function renderHero() {
  const name    = userProfile.full_name || userSession.user.email.split('@')[0];
  const initial = name.charAt(0).toUpperCase();

  setEl('pf-avatar-initials', initial);
  setEl('pf-hero-name', name);

  /* Joined date from Supabase auth */
  const created  = new Date(userSession.user.created_at);
  const joinedStr = created.toLocaleDateString('en-PH', { month: 'long', year: 'numeric' });
  setEl('pf-joined-date', 'Joined ' + joinedStr);

  const goalMeta = GOAL_META[userProfile.goal];
  setEl('pf-goal-badge', goalMeta ? goalMeta.icon + ' ' + goalMeta.label : '—');
}

/* ============================================================
   STATS ROW
   ============================================================ */
function renderStats() {
  const h = parseFloat(userProfile.height_cm) || 0;
  const w = parseFloat(userProfile.weight_kg)  || 0;
  const age = parseInt(userProfile.age) || 25;
  const sex = userProfile.sex || 'male';

  /* BMI */
  if (h && w) {
    const bmi = w / ((h / 100) * (h / 100));
    const bmiFixed = bmi.toFixed(1);
    let cat = 'Normal'; let catColor = '#2ddc7a';
    if      (bmi < 18.5) { cat = 'Underweight'; catColor = '#60a5fa'; }
    else if (bmi < 25)   { cat = 'Normal';       catColor = '#2ddc7a'; }
    else if (bmi < 30)   { cat = 'Overweight';   catColor = '#fbbf24'; }
    else                 { cat = 'Obese';         catColor = '#f87171'; }

    setEl('pf-stat-bmi-val', bmiFixed);
    setEl('pf-stat-bmi-cat', cat);
    document.getElementById('pf-stat-bmi-val').style.color = catColor;

    const pctScale = Math.min(Math.max((bmi - 10) / 30, 0), 1) * 100;
    const marker = document.getElementById('pf-bmi-marker');
    if (marker) setTimeout(function () { marker.style.left = pctScale + '%'; }, 200);
  } else {
    setEl('pf-stat-bmi-val', '--');
    setEl('pf-stat-bmi-cat', 'Fill in profile');
  }

  /* Calorie target (Mifflin-St Jeor + TDEE) */
  if (h && w && age) {
    let bmr;
    if (sex === 'male') {
      bmr = 10 * w + 6.25 * h - 5 * age + 5;
    } else {
      bmr = 10 * w + 6.25 * h - 5 * age - 161;
    }
    const mult  = ACTIVITY_MULT[userProfile.activity_level] || 1.55;
    const tdee  = Math.round(bmr * mult);
    const goal  = userProfile.goal;
    let target  = tdee;
    if (goal === 'lose_weight')  target = Math.round(tdee * 0.85);
    if (goal === 'gain_muscle')  target = Math.round(tdee * 1.1);

    setEl('pf-stat-cal-val', target.toLocaleString());
    setEl('pf-stat-cal-sub', 'TDEE: ' + tdee.toLocaleString() + ' kcal/day');

    /* Bar shows target vs 3000 kcal ceiling */
    const pct = Math.min(Math.round((target / 3000) * 100), 100);
    const bar = document.getElementById('pf-cal-bar-fill');
    if (bar) setTimeout(function () { bar.style.width = pct + '%'; }, 200);
  } else {
    setEl('pf-stat-cal-val', '--');
    setEl('pf-stat-cal-sub', 'Complete your profile');
  }

  /* Progress — days since joining */
  const created   = new Date(userSession.user.created_at);
  const today     = new Date();
  const days      = Math.max(1, Math.floor((today - created) / (1000 * 60 * 60 * 24)));
  const weeks     = Math.floor(days / 7);
  setEl('pf-stat-days-val', days);
  setEl('pf-stat-days-sub', weeks > 0
    ? weeks + (weeks === 1 ? ' week' : ' weeks') + ' on BLANE'
    : 'Started today!');

  /* Progress bar maxes at 90 days */
  const progPct = Math.min(Math.round((days / 90) * 100), 100);
  const progBar = document.getElementById('pf-progress-bar-fill');
  if (progBar) setTimeout(function () { progBar.style.width = progPct + '%'; }, 200);
}

/* ============================================================
   TAB SWITCHER
   ============================================================ */
function switchTab(tab) {
  activeTab = tab;
  document.querySelectorAll('.pf-tab-btn').forEach(function (b) {
    b.classList.toggle('active', b.getAttribute('data-tab') === tab);
  });
  document.querySelectorAll('.pf-tab-panel').forEach(function (p) {
    p.classList.toggle('active', p.id === 'pf-panel-' + tab);
  });
}

/* ============================================================
   BASIC TAB
   ============================================================ */
function renderBasicTab() {
  const p = userProfile;
  setReadonlyField('pf-disp-name',     p.full_name     || '—');
  setReadonlyField('pf-disp-age',      p.age           ? p.age + ' years old' : '—');
  setReadonlyField('pf-disp-sex',      p.sex           ? p.sex.charAt(0).toUpperCase() + p.sex.slice(1) : '—');
  setReadonlyField('pf-disp-height',   p.height_cm     ? p.height_cm + ' cm' : '—');
  setReadonlyField('pf-disp-weight',   p.weight_kg     ? p.weight_kg + ' kg' : '—');
  setReadonlyField('pf-disp-activity', p.activity_level ? (ACTIVITY_LABELS[p.activity_level] || p.activity_level) : '—');
}

function setReadonlyField(id, val) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = val;
  el.className = 'pf-field-value' + (val === '—' ? ' muted' : '');
}

/* Toggle basic edit mode */
window.toggleBasicEdit = function () {
  editingBasic = !editingBasic;
  const readView  = document.getElementById('pf-basic-read');
  const editView  = document.getElementById('pf-basic-edit');
  const editBtn   = document.getElementById('pf-basic-edit-btn');

  if (editingBasic) {
    readView.style.display = 'none';
    editView.style.display = 'block';
    editBtn.className = 'pf-edit-btn editing';
    editBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg> Cancel';
    /* Pre-fill edit inputs */
    setVal('pf-edit-name',     userProfile.full_name     || '');
    setVal('pf-edit-age',      userProfile.age           || '');
    setVal('pf-edit-sex',      userProfile.sex           || '');
    setVal('pf-edit-height',   userProfile.height_cm     || '');
    setVal('pf-edit-weight',   userProfile.weight_kg     || '');
    setVal('pf-edit-activity', userProfile.activity_level || '');
  } else {
    readView.style.display = 'block';
    editView.style.display = 'none';
    editBtn.className = 'pf-edit-btn';
    editBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> Edit';
  }
};

window.saveBasicInfo = async function () {
  const name     = document.getElementById('pf-edit-name').value.trim();
  const age      = parseInt(document.getElementById('pf-edit-age').value);
  const sex      = document.getElementById('pf-edit-sex').value;
  const height   = parseFloat(document.getElementById('pf-edit-height').value);
  const weight   = parseFloat(document.getElementById('pf-edit-weight').value);
  const activity = document.getElementById('pf-edit-activity').value;

  if (!name)         { showToast('Please enter your name.', true); return; }
  if (!age || age<1) { showToast('Please enter a valid age.', true); return; }
  if (!height)       { showToast('Please enter your height.', true); return; }
  if (!weight)       { showToast('Please enter your weight.', true); return; }

  const btn = document.getElementById('pf-basic-save-btn');
  btn.textContent = 'Saving...';
  btn.disabled    = true;

  const { error } = await _supabase.from('profiles').upsert({
    id: userSession.user.id,
    full_name:      name,
    age:            age,
    sex:            sex,
    height_cm:      height,
    weight_kg:      weight,
    activity_level: activity,
    updated_at:     new Date().toISOString(),
  });

  btn.textContent = 'Save Changes';
  btn.disabled    = false;

  if (error) { showToast('Error: ' + error.message, true); return; }

  userProfile = { ...userProfile, full_name: name, age, sex, height_cm: height, weight_kg: weight, activity_level: activity };
  renderHero();
  renderStats();
  renderBasicTab();
  toggleBasicEdit();
  showToast('✓ Basic info saved successfully');
};

/* ============================================================
   HEALTH TAB
   ============================================================ */
function renderHealthTab() {
  renderGoalDisplay();
  renderTagDisplay('pf-dietary-display', DIETARY_OPTS, userProfile.dietary_restrictions || [], false);
  renderTagDisplay('pf-medical-display',  MEDICAL_OPTS,  userProfile.medical_conditions  || [], false);
}

function renderGoalDisplay(editable) {
  const wrap = document.getElementById('pf-goal-display');
  if (!wrap) return;
  wrap.innerHTML = '';
  ALL_GOALS.forEach(function (key) {
    const m    = GOAL_META[key];
    const sel  = userProfile.goal === key;
    const div  = document.createElement('div');
    div.className = 'pf-goal-option' + (sel ? ' selected' : '') + (editable ? '' : ' readonly');
    div.innerHTML = '<span class="pf-goal-icon">' + m.icon + '</span><span class="pf-goal-label">' + m.label + '</span>';
    if (editable) {
      div.addEventListener('click', function () {
        wrap.querySelectorAll('.pf-goal-option').forEach(function (o) { o.classList.remove('selected'); });
        div.classList.add('selected');
        userProfile.goal = key; /* temp local update */
      });
    }
    wrap.appendChild(div);
  });
}

function renderTagDisplay(containerId, opts, selected, editable) {
  const wrap = document.getElementById(containerId);
  if (!wrap) return;
  wrap.innerHTML = '';

  if (!editable && selected.length === 0) {
    wrap.innerHTML = '<span class="pf-empty-tag">None selected</span>';
    return;
  }

  opts.forEach(function (opt) {
    const isSel = selected.includes(opt.value);
    if (!editable && !isSel) return;
    const pill = document.createElement('div');
    pill.className = 'pf-tag-pill' + (isSel ? ' selected' : '') + (editable ? '' : ' readonly');
    pill.setAttribute('data-value', opt.value);
    pill.textContent = opt.label;
    if (editable) {
      pill.addEventListener('click', function () { pill.classList.toggle('selected'); });
    }
    wrap.appendChild(pill);
  });

  if (!editable && wrap.children.length === 0) {
    wrap.innerHTML = '<span class="pf-empty-tag">None selected</span>';
  }
}

window.toggleHealthEdit = function () {
  editingHealth = !editingHealth;
  const editBtn = document.getElementById('pf-health-edit-btn');
  const saveRow = document.getElementById('pf-health-save-row');

  if (editingHealth) {
    editBtn.className = 'pf-edit-btn editing';
    editBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg> Cancel';
    saveRow.style.display = 'flex';
    renderGoalDisplay(true);
    renderTagDisplay('pf-dietary-display', DIETARY_OPTS, userProfile.dietary_restrictions || [], true);
    renderTagDisplay('pf-medical-display',  MEDICAL_OPTS,  userProfile.medical_conditions  || [], true);
  } else {
    editBtn.className = 'pf-edit-btn';
    editBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> Edit';
    saveRow.style.display = 'none';
    renderHealthTab();
  }
};

window.saveHealthInfo = async function () {
  /* Collect selected goal */
  const goalEl = document.querySelector('#pf-goal-display .pf-goal-option.selected');
  const goal   = goalEl ? goalEl.querySelector('.pf-goal-label').textContent : null;
  const goalKey = goal ? ALL_GOALS.find(function (k) { return GOAL_META[k].label === goal; }) : null;

  /* Collect dietary tags */
  const dietary = [];
  document.querySelectorAll('#pf-dietary-display .pf-tag-pill.selected').forEach(function (p) {
    dietary.push(p.getAttribute('data-value'));
  });

  /* Collect medical tags */
  const medical = [];
  document.querySelectorAll('#pf-medical-display .pf-tag-pill.selected').forEach(function (p) {
    medical.push(p.getAttribute('data-value'));
  });

  const btn = document.getElementById('pf-health-save-btn');
  btn.textContent = 'Saving...';
  btn.disabled    = true;

  const { error } = await _supabase.from('profiles').upsert({
    id:                   userSession.user.id,
    goal:                 goalKey || userProfile.goal,
    dietary_restrictions: dietary,
    medical_conditions:   medical,
    updated_at:           new Date().toISOString(),
  });

  btn.textContent = 'Save Changes';
  btn.disabled    = false;

  if (error) { showToast('Error: ' + error.message, true); return; }

  userProfile = { ...userProfile, goal: goalKey || userProfile.goal, dietary_restrictions: dietary, medical_conditions: medical };
  renderHero();
  renderStats();
  toggleHealthEdit();
  showToast('✓ Health info saved successfully');
};

/* ============================================================
   ACCOUNT TAB
   ============================================================ */
function renderAccountTab() {
  setEl('pf-account-email', userSession.user.email);
  const created = new Date(userSession.user.created_at);
  setEl('pf-account-joined', created.toLocaleDateString('en-PH', { dateStyle: 'long' }));
  setEl('pf-account-uid', userSession.user.id.slice(0, 16) + '...');
}

async function handlePasswordChange() {
  const newPwd    = document.getElementById('pf-pwd-new').value;
  const confirmPwd = document.getElementById('pf-pwd-confirm').value;
  const btn       = document.getElementById('pf-pwd-save-btn');

  if (!newPwd || newPwd.length < 6) { showToast('Password must be at least 6 characters.', true); return; }
  if (newPwd !== confirmPwd)         { showToast('Passwords do not match.', true); return; }

  btn.textContent = 'Saving...';
  btn.disabled    = true;

  const { error } = await _supabase.auth.updateUser({ password: newPwd });

  btn.textContent = 'Update Password';
  btn.disabled    = false;

  if (error) { showToast('Error: ' + error.message, true); return; }

  document.getElementById('pf-pwd-new').value     = '';
  document.getElementById('pf-pwd-confirm').value = '';
  document.getElementById('pf-password-form').classList.remove('open');
  document.getElementById('pf-change-pwd-btn').textContent = 'Change Password';
  showToast('✓ Password updated successfully');
}

/* ============================================================
   HELPERS
   ============================================================ */
function setEl(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function setVal(id, val) {
  const el = document.getElementById(id);
  if (el) el.value = val;
}

function showToast(msg, isError) {
  const toast = document.getElementById('pf-toast');
  toast.textContent = msg;
  toast.className   = 'pf-toast' + (isError ? ' error' : '') + ' show';
  setTimeout(function () { toast.className = 'pf-toast' + (isError ? ' error' : ''); }, 3000);
}
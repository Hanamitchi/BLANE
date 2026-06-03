/* ============================================================
   BLANE — Real-Time Body Feedback Loop (Module 01)
   Handles:
     - Manual logging of weight, sleep, water, calories burned
     - Saving logs to Supabase health_logs table
     - Recalculating BMI, calorie & macro targets from new weight
     - 7-day drift detection with warning alerts
     - Live dashboard widget updates

   Depends on: supabase-config.js, auth.js
   ============================================================ */

/* ============================================================
   CONSTANTS
   ============================================================ */
const DRIFT_THRESHOLDS = {
  weight_gain_kg:     0.5,   /* >0.5 kg in a week → warning     */
  weight_loss_kg:     1.5,   /* >1.5 kg in a week → warning     */
  sleep_min_hours:    6,     /* <6 hrs → sleep deficit warning   */
  water_min_ml:       1800,  /* <1800 ml → low hydration warning */
  calories_low_pct:   0.75,  /* <75% of target burned → sedentary alert */
};

const ACTIVITY_MULT = {
  sedentary:    1.2,
  light:        1.375,
  moderate:     1.55,
  very_active:  1.725,
  extra_active: 1.9,
};

const GOAL_ADJUST = {
  lose_weight:    0.85,
  gain_muscle:    1.10,
  maintain:       1.00,
  improve_health: 1.00,
  boost_energy:   1.00,
  manage_condition: 1.00,
};

/* ============================================================
   STATE
   ============================================================ */
let fbProfile  = null;
let fbSession  = null;
let fbLogs     = [];     /* last 7 days of health logs */
let todayLogged = false;

/* ============================================================
   INIT — called from dashboard DOMContentLoaded after profile loads
   ============================================================ */
async function initFeedbackLoop(session, profile) {
  fbSession = session;
  fbProfile = profile;

  await loadRecentLogs();
  renderFeedbackWidget();
}

/* ============================================================
   LOAD LAST 7 DAYS OF LOGS
   ============================================================ */
async function loadRecentLogs() {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { data, error } = await _supabase
    .from('health_logs')
    .select('*')
    .eq('user_id', fbSession.user.id)
    .gte('logged_at', sevenDaysAgo.toISOString().split('T')[0])
    .order('logged_at', { ascending: false });

  if (!error && data) {
    fbLogs = data;
    /* Check if today already logged */
    const todayStr = new Date().toISOString().split('T')[0];
    todayLogged = fbLogs.some(function (l) { return l.logged_at === todayStr; });
  }
}

/* ============================================================
   RENDER WIDGET
   ============================================================ */
function renderFeedbackWidget() {
  const widget = document.getElementById('fb-widget');
  if (!widget) return;

  const todayLog  = fbLogs[0] && fbLogs[0].logged_at === new Date().toISOString().split('T')[0]
    ? fbLogs[0] : null;
  const yesterday = fbLogs.find(function (l) {
    const d = new Date(); d.setDate(d.getDate() - 1);
    return l.logged_at === d.toISOString().split('T')[0];
  });

  /* Last logged text */
  const lastLoggedEl = document.getElementById('fb-last-logged');
  if (lastLoggedEl) {
    if (todayLogged) {
      lastLoggedEl.textContent = '✓ Logged today';
      lastLoggedEl.className   = 'fb-last-logged today';
    } else if (fbLogs.length > 0) {
      lastLoggedEl.textContent = 'Last: ' + formatDate(fbLogs[0].logged_at);
      lastLoggedEl.className   = 'fb-last-logged';
    } else {
      lastLoggedEl.textContent = 'Not logged yet';
      lastLoggedEl.className   = 'fb-last-logged';
    }
  }

  /* Today status chips */
  renderStatusChips(todayLog);

  /* Pre-fill inputs with today's log if exists */
  if (todayLog) {
    setInput('fb-input-weight',   todayLog.weight_kg     || '');
    setInput('fb-input-sleep',    todayLog.sleep_hours   || '');
    setInput('fb-input-water',    todayLog.water_ml      ? Math.round(todayLog.water_ml / 300) : '');
    setInput('fb-input-calories', todayLog.calories_burned || '');
  }

  /* Prev value hints */
  if (yesterday) {
    setHint('fb-prev-weight',   yesterday.weight_kg     ? yesterday.weight_kg + ' kg' : null);
    setHint('fb-prev-sleep',    yesterday.sleep_hours   ? yesterday.sleep_hours + ' hrs' : null);
    setHint('fb-prev-calories', yesterday.calories_burned ? yesterday.calories_burned + ' kcal' : null);
  }

  /* Sparklines */
  renderSparklines();

  /* Drift alerts from existing data */
  if (fbLogs.length >= 2) {
    const alerts = detectDrift(fbLogs, fbProfile);
    renderDriftAlerts(alerts);
  }

  /* Bind log button */
  const logBtn = document.getElementById('fb-log-btn');
  if (logBtn) {
    logBtn.addEventListener('click', handleLogSubmit);
    logBtn.textContent = todayLogged ? 'Update Today\'s Log' : 'Log Today\'s Health';
  }
}

/* ============================================================
   STATUS CHIPS
   ============================================================ */
function renderStatusChips(todayLog) {
  const row = document.getElementById('fb-today-status');
  if (!row) return;
  row.innerHTML = '';

  const metrics = [
    { key: 'weight_kg',      label: 'Weight',   icon: '⚖️' },
    { key: 'sleep_hours',    label: 'Sleep',    icon: '😴' },
    { key: 'water_ml',       label: 'Water',    icon: '💧' },
    { key: 'calories_burned',label: 'Activity', icon: '🔥' },
  ];

  metrics.forEach(function (m) {
    const chip = document.createElement('div');
    const logged = todayLog && todayLog[m.key] != null;
    chip.className = 'fb-status-chip' + (logged ? ' logged' : ' pending');
    chip.textContent = (logged ? '✓ ' : '○ ') + m.label;
    row.appendChild(chip);
  });
}

/* ============================================================
   LOG SUBMIT
   ============================================================ */
async function handleLogSubmit() {
  const weightKg      = parseFloat(document.getElementById('fb-input-weight').value)   || null;
  const sleepHours    = parseFloat(document.getElementById('fb-input-sleep').value)     || null;
  const waterCups     = parseInt(document.getElementById('fb-input-water').value)       || null;
  const caloriesBurned = parseInt(document.getElementById('fb-input-calories').value)   || null;

  if (!weightKg && !sleepHours && !waterCups && !caloriesBurned) {
    showFbToast('Please fill in at least one metric.', true);
    return;
  }

  const btn      = document.getElementById('fb-log-btn');
  const todayStr = new Date().toISOString().split('T')[0];

  btn.disabled    = true;
  btn.textContent = 'Saving...';

  /* Upsert into health_logs (one row per user per day) */
  const { error } = await _supabase.from('health_logs').upsert({
    user_id:         fbSession.user.id,
    logged_at:       todayStr,
    weight_kg:       weightKg,
    sleep_hours:     sleepHours,
    water_ml:        waterCups ? waterCups * 300 : null,
    calories_burned: caloriesBurned,
    updated_at:      new Date().toISOString(),
  }, { onConflict: 'user_id,logged_at' });

  if (error) {
    showFbToast('Could not save: ' + error.message, true);
    btn.disabled    = false;
    btn.textContent = 'Update Today\'s Log';
    return;
  }

  /* If weight changed → update profiles.weight_kg too */
  if (weightKg && fbProfile && weightKg !== fbProfile.weight_kg) {
    await _supabase.from('profiles').upsert({
      id:         fbSession.user.id,
      weight_kg:  weightKg,
      updated_at: new Date().toISOString(),
    });
    fbProfile.weight_kg = weightKg;
  }

  /* Reload logs */
  await loadRecentLogs();

  /* Recalculate targets */
  const newTargets = recalculateTargets(fbProfile);

  /* Detect drift */
  const alerts = detectDrift(fbLogs, fbProfile);

  /* Update UI */
  renderDriftAlerts(alerts);
  renderRecalcBanner(newTargets);
  renderStatusChips(fbLogs[0]);
  renderSparklines();

  /* Re-run drift detection with fresh logs */
  if (typeof initDriftDetection === 'function') {
    initDriftDetection(fbSession, fbProfile, fbLogs);
  }
  todayLogged = true;

  /* Refresh dashboard BMI + calorie widgets */
  if (typeof initBmiWidget === 'function')  initBmiWidget(fbProfile);
  if (typeof renderStats  === 'function')   renderStats();          /* profile page */

  btn.disabled    = false;
  btn.textContent = 'Update Today\'s Log';

  const lastLoggedEl = document.getElementById('fb-last-logged');
  if (lastLoggedEl) {
    lastLoggedEl.textContent = '✓ Logged today';
    lastLoggedEl.className   = 'fb-last-logged today';
  }

  showFbToast('✓ Health data logged and targets updated');
}

/* ============================================================
   RECALCULATE TARGETS (Mifflin-St Jeor + TDEE)
   ============================================================ */
function recalculateTargets(profile) {
  const h   = parseFloat(profile.height_cm) || 170;
  const w   = parseFloat(profile.weight_kg)  || 70;
  const age = parseInt(profile.age)          || 25;
  const sex = profile.sex || 'male';

  let bmr;
  if (sex === 'male') {
    bmr = 10 * w + 6.25 * h - 5 * age + 5;
  } else {
    bmr = 10 * w + 6.25 * h - 5 * age - 161;
  }

  const mult     = ACTIVITY_MULT[profile.activity_level] || 1.55;
  const tdee     = Math.round(bmr * mult);
  const goalMult = GOAL_ADJUST[profile.goal]  || 1.0;
  const target   = Math.round(tdee * goalMult);

  /* Macro split */
  const protein = Math.round((target * 0.30) / 4);   /* 30% protein */
  const carbs   = Math.round((target * 0.45) / 4);   /* 45% carbs   */
  const fats    = Math.round((target * 0.25) / 9);   /* 25% fats    */

  /* BMI */
  const bmi = (w / ((h / 100) * (h / 100))).toFixed(1);

  /* Live-update dashboard calorie/macro elements */
  setEl('stat-cal-val',    target.toLocaleString());
  setEl('pf-stat-cal-val', target.toLocaleString());
  setEl('bmi-number',      bmi);
  setEl('pf-stat-bmi-val', bmi);

  return { tdee, target, protein, carbs, fats, bmi };
}

/* ============================================================
   DRIFT DETECTION
   ============================================================ */
function detectDrift(logs, profile) {
  const alerts = [];
  if (!logs || logs.length < 1) return alerts;

  const today     = logs[0];
  const pastLogs  = logs.slice(1);

  /* ---- Weight drift ---- */
  const weightLogs = pastLogs.filter(function (l) { return l.weight_kg; });
  if (today.weight_kg && weightLogs.length > 0) {
    const avgWeight = weightLogs.reduce(function (s, l) { return s + l.weight_kg; }, 0) / weightLogs.length;
    const diff      = today.weight_kg - avgWeight;

    if (diff > DRIFT_THRESHOLDS.weight_gain_kg) {
      alerts.push({
        type: 'warning',
        icon: '⚖️',
        title: 'Weight Increase Detected',
        text: 'Your weight is +' + diff.toFixed(1) + ' kg above your 7-day average (' + avgWeight.toFixed(1) + ' kg). Consider reviewing your calorie intake.',
      });
    } else if (diff < -DRIFT_THRESHOLDS.weight_loss_kg) {
      alerts.push({
        type: 'warning',
        icon: '⚖️',
        title: 'Rapid Weight Drop',
        text: 'Your weight dropped ' + Math.abs(diff).toFixed(1) + ' kg from your 7-day average. Ensure you\'re eating enough to meet your nutrition targets.',
      });
    } else {
      alerts.push({
        type: 'good',
        icon: '✓',
        title: 'Weight Stable',
        text: 'Your weight is within ' + Math.abs(diff).toFixed(1) + ' kg of your 7-day average. Keep it up!',
      });
    }
  }

  /* ---- Sleep drift ---- */
  if (today.sleep_hours != null) {
    if (today.sleep_hours < DRIFT_THRESHOLDS.sleep_min_hours) {
      alerts.push({
        type: 'danger',
        icon: '😴',
        title: 'Sleep Deficit',
        text: 'You slept ' + today.sleep_hours + ' hours — below the recommended 6–8 hours. Poor sleep affects metabolism and increases cravings.',
      });
    } else if (today.sleep_hours >= 7) {
      alerts.push({
        type: 'good',
        icon: '😴',
        title: 'Good Sleep Quality',
        text: today.sleep_hours + ' hours of sleep supports healthy hormone levels and better food choices throughout the day.',
      });
    }
  }

  /* ---- Water / hydration drift ---- */
  if (today.water_ml != null) {
    if (today.water_ml < DRIFT_THRESHOLDS.water_min_ml) {
      alerts.push({
        type: 'warning',
        icon: '💧',
        title: 'Low Hydration',
        text: 'You\'ve logged ' + (today.water_ml / 1000).toFixed(1) + ' L — below the 1.8 L minimum. Dehydration can suppress appetite signals and reduce energy.',
      });
    }
  }

  /* ---- Calories burned / activity drift ---- */
  if (today.calories_burned != null && fbProfile) {
    const tdee        = computeTDEE(fbProfile);
    const activityPct = today.calories_burned / tdee;

    if (activityPct < DRIFT_THRESHOLDS.calories_low_pct) {
      alerts.push({
        type: 'warning',
        icon: '🔥',
        title: 'Low Activity Today',
        text: 'You burned ' + today.calories_burned + ' kcal — ' + Math.round(activityPct * 100) + '% of your daily TDEE. Try adding a short walk or light exercise.',
      });
    } else {
      alerts.push({
        type: 'good',
        icon: '🔥',
        title: 'Active Day',
        text: 'Great effort — ' + today.calories_burned + ' kcal burned, which is ' + Math.round(activityPct * 100) + '% of your daily energy expenditure.',
      });
    }
  }

  return alerts;
}

/* ============================================================
   RENDER DRIFT ALERTS
   ============================================================ */
function renderDriftAlerts(alerts) {
  const panel = document.getElementById('fb-drift-panel');
  if (!panel) return;
  panel.innerHTML = '';

  alerts.forEach(function (alert) {
    const div = document.createElement('div');
    div.className = 'fb-drift-alert ' + alert.type;
    div.innerHTML =
      '<span class="fb-drift-icon">' + alert.icon + '</span>' +
      '<div class="fb-drift-text"><strong>' + alert.title + '</strong>' + alert.text + '</div>';
    panel.appendChild(div);
  });
}

/* ============================================================
   RENDER RECALC BANNER
   ============================================================ */
function renderRecalcBanner(targets) {
  const banner = document.getElementById('fb-recalc-banner');
  if (!banner) return;

  banner.innerHTML =
    '<span class="fb-recalc-icon">⚡</span>' +
    '<div class="fb-recalc-text">' +
      'Targets updated — Daily goal: <strong>' + targets.target.toLocaleString() + ' kcal</strong> &nbsp;·&nbsp; ' +
      '<strong>' + targets.protein + 'g</strong> protein &nbsp;·&nbsp; ' +
      '<strong>' + targets.carbs   + 'g</strong> carbs &nbsp;·&nbsp; ' +
      '<strong>' + targets.fats    + 'g</strong> fats' +
    '</div>';

  banner.classList.add('show');
  setTimeout(function () { banner.classList.remove('show'); }, 6000);
}

/* ============================================================
   SPARKLINES (7-day mini charts)
   ============================================================ */
function renderSparklines() {
  renderSparkline('fb-spark-weight',   fbLogs.map(function (l) { return l.weight_kg; }).reverse(),   '#2ddc7a');
  renderSparkline('fb-spark-sleep',    fbLogs.map(function (l) { return l.sleep_hours; }).reverse(),  '#60a5fa');
  renderSparkline('fb-spark-calories', fbLogs.map(function (l) { return l.calories_burned; }).reverse(), '#fbbf24');
}

function renderSparkline(id, values, color) {
  const svg = document.getElementById(id);
  if (!svg) return;

  const validVals = values.filter(function (v) { return v != null; });
  if (validVals.length < 2) {
    svg.innerHTML = '<text x="0" y="20" fill="#4d6e5a" font-size="9" font-family="DM Sans,sans-serif">Not enough data yet</text>';
    return;
  }

  const W    = 120;
  const H    = 32;
  const min  = Math.min.apply(null, validVals);
  const max  = Math.max.apply(null, validVals);
  const range = max - min || 1;
  const step = W / Math.max(values.length - 1, 1);

  let points = '';
  let dotHTML = '';
  let lastX = 0, lastY = 0;

  values.forEach(function (v, i) {
    if (v == null) return;
    const x = Math.round(i * step);
    const y = Math.round(H - ((v - min) / range) * (H - 4) - 2);
    points += x + ',' + y + ' ';
    lastX = x; lastY = y;
  });

  /* Last dot */
  dotHTML = '<circle cx="' + lastX + '" cy="' + lastY + '" r="3" fill="' + color + '"/>';

  svg.innerHTML =
    '<polyline points="' + points.trim() + '" fill="none" stroke="' + color + '" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.8"/>' +
    dotHTML;
}

/* ============================================================
   HELPERS
   ============================================================ */
function computeTDEE(profile) {
  const h   = parseFloat(profile.height_cm) || 170;
  const w   = parseFloat(profile.weight_kg)  || 70;
  const age = parseInt(profile.age)          || 25;
  const sex = profile.sex || 'male';
  let bmr;
  if (sex === 'male') { bmr = 10 * w + 6.25 * h - 5 * age + 5; }
  else                { bmr = 10 * w + 6.25 * h - 5 * age - 161; }
  return Math.round(bmr * (ACTIVITY_MULT[profile.activity_level] || 1.55));
}

function setEl(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function setInput(id, val) {
  const el = document.getElementById(id);
  if (el && val !== '' && val != null) el.value = val;
}

function setHint(id, val) {
  const el = document.getElementById(id);
  if (el) {
    if (val) { el.innerHTML = 'Yesterday: <span>' + val + '</span>'; }
    else     { el.textContent = ''; }
  }
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
}

function showFbToast(msg, isError) {
  /* Reuse profile toast if available, else create one */
  let toast = document.getElementById('pf-toast') || document.getElementById('fb-toast-el');
  if (!toast) {
    toast = document.createElement('div');
    toast.id        = 'fb-toast-el';
    toast.className = 'pf-toast';
    toast.style.cssText = 'position:fixed;bottom:28px;left:50%;transform:translateX(-50%) translateY(20px);background:#0d1a12;border:1px solid rgba(45,220,122,0.35);border-radius:12px;padding:12px 22px;font-size:14px;color:#2ddc7a;display:flex;align-items:center;gap:8px;z-index:999;opacity:0;transition:opacity 0.3s,transform 0.3s;pointer-events:none;white-space:nowrap;box-shadow:0 8px 28px rgba(0,0,0,0.5);';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.style.opacity   = '1';
  toast.style.transform = 'translateX(-50%) translateY(0)';
  if (isError) { toast.style.color = '#f87171'; toast.style.borderColor = 'rgba(248,113,113,0.35)'; }
  else         { toast.style.color = '#2ddc7a'; toast.style.borderColor = 'rgba(45,220,122,0.35)'; }
  setTimeout(function () {
    toast.style.opacity   = '0';
    toast.style.transform = 'translateX(-50%) translateY(20px)';
  }, 3500);
}
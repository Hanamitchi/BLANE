/* ============================================================
   BLANE — Health Drift Detection (Module 02)

   Analyzes 7-day health_logs to detect:
     - Weight trend (gaining / losing / stable)
     - Sleep pattern (improving / declining / irregular)
     - Hydration trend
     - BMI change over time
     - Overall health score (0–100)

   Algorithm: linear regression slope on 7 data points
   Depends on: supabase-config.js, auth.js, feedback.js (for logs)
   ============================================================ */

/* ============================================================
   SCORING WEIGHTS
   ============================================================ */
const DRIFT_WEIGHTS = {
  weight:    0.30,
  sleep:     0.25,
  hydration: 0.20,
  bmi:       0.25,
};

/* ============================================================
   INIT — called from dashboard after feedback loop loads
   ============================================================ */
async function initDriftDetection(session, profile, logs) {
  const section = document.getElementById('drift-section');
  if (!section) return;

  if (!logs || logs.length < 2) {
    renderDriftNoData(section);
    return;
  }

  const analysis = analyzeDrift(logs, profile);
  renderDriftSection(section, analysis, profile);
}

/* ============================================================
   DRIFT ANALYSIS ENGINE
   ============================================================ */
function analyzeDrift(logs, profile) {
  /* Sort ascending by date for regression */
  const sorted = logs.slice().sort(function (a, b) {
    return new Date(a.logged_at) - new Date(b.logged_at);
  });

  const weightVals  = sorted.map(function (l) { return l.weight_kg; });
  const sleepVals   = sorted.map(function (l) { return l.sleep_hours; });
  const waterVals   = sorted.map(function (l) { return l.water_ml; });

  /* BMI from weight */
  const h = parseFloat(profile.height_cm) || 170;
  const bmiVals = weightVals.map(function (w) {
    return w ? parseFloat((w / ((h / 100) * (h / 100))).toFixed(2)) : null;
  });

  return {
    weight:    analyzeMetric('weight',    weightVals,  profile),
    sleep:     analyzeMetric('sleep',     sleepVals,   profile),
    hydration: analyzeMetric('hydration', waterVals,   profile),
    bmi:       analyzeMetric('bmi',       bmiVals,     profile),
    rawLogs:   sorted,
  };
}

/* ============================================================
   ANALYZE SINGLE METRIC
   ============================================================ */
function analyzeMetric(key, values, profile) {
  const valid = values.filter(function (v) { return v != null; });
  if (valid.length === 0) return { score: null, trend: 'no_data', values: values };

  const latest  = valid[valid.length - 1];
  const avg     = valid.reduce(function (s, v) { return s + v; }, 0) / valid.length;
  const slope   = linearRegressionSlope(values);
  const stdDev  = standardDeviation(valid);
  const cvPct   = avg > 0 ? (stdDev / avg) * 100 : 0; /* coefficient of variation */

  let trend, score, riskLevel, contextText, trendBadge;

  /* ---- WEIGHT ---- */
  if (key === 'weight') {
    const goal = profile.goal || 'maintain';
    const weekChange = slope * valid.length;

    if (Math.abs(slope) < 0.05) {
      trend      = 'stable';
      trendBadge = 'stable';
    } else if (slope > 0) {
      trend      = 'gaining';
      trendBadge = goal === 'gain_muscle' ? 'up-good' : 'up-bad';
    } else {
      trend      = 'losing';
      trendBadge = goal === 'lose_weight' ? 'down-good' : 'down-bad';
    }

    /* Score: 100 if trend aligns with goal */
    if (goal === 'lose_weight')  score = slope < -0.02 ? 90 : slope > 0.1 ? 40 : 70;
    else if (goal === 'gain_muscle') score = slope >  0.02 ? 90 : slope < -0.1 ? 40 : 70;
    else                         score = Math.abs(slope) < 0.05 ? 92 : 65;

    riskLevel   = score >= 80 ? 'good' : score >= 60 ? 'warning' : 'danger';
    contextText = weekChange >= 0
      ? '+' + Math.abs(weekChange).toFixed(1) + ' kg trend this week'
      : '−' + Math.abs(weekChange).toFixed(1) + ' kg trend this week';
  }

  /* ---- SLEEP ---- */
  else if (key === 'sleep') {
    if (cvPct > 30) {
      trend      = 'irregular';
      trendBadge = 'irregular';
    } else if (slope > 0.1) {
      trend      = 'improving';
      trendBadge = 'up-good';
    } else if (slope < -0.1) {
      trend      = 'declining';
      trendBadge = 'down-bad';
    } else {
      trend      = 'stable';
      trendBadge = 'stable';
    }

    /* Score based on avg sleep duration */
    if      (avg >= 7 && avg <= 9)  score = 95;
    else if (avg >= 6 && avg < 7)   score = 72;
    else if (avg >= 5 && avg < 6)   score = 50;
    else                             score = 30;

    /* Irregular sleep penalty */
    if (cvPct > 30) score = Math.max(score - 20, 20);

    riskLevel   = score >= 80 ? 'good' : score >= 55 ? 'warning' : 'danger';
    contextText = 'Avg ' + avg.toFixed(1) + ' hrs · ' + (cvPct > 30 ? 'High variability' : 'Consistent');
  }

  /* ---- HYDRATION ---- */
  else if (key === 'hydration') {
    const avgL = avg / 1000;

    if (slope > 50) {
      trend      = 'improving';
      trendBadge = 'up-good';
    } else if (slope < -50) {
      trend      = 'declining';
      trendBadge = 'down-bad';
    } else {
      trend      = 'stable';
      trendBadge = 'stable';
    }

    if      (avg >= 2400) score = 95;
    else if (avg >= 1800) score = 75;
    else if (avg >= 1200) score = 50;
    else                   score = 30;

    riskLevel   = score >= 80 ? 'good' : score >= 55 ? 'warning' : 'danger';
    contextText = 'Avg ' + avgL.toFixed(1) + ' L/day';
  }

  /* ---- BMI ---- */
  else if (key === 'bmi') {
    const latestBmi = latest;
    const weekChange = slope * valid.length;

    if (Math.abs(slope) < 0.01) {
      trend      = 'stable';
      trendBadge = 'stable';
    } else if (slope > 0) {
      trend      = 'rising';
      trendBadge = latestBmi > 25 ? 'up-bad' : 'stable';
    } else {
      trend      = 'falling';
      trendBadge = latestBmi < 18.5 ? 'down-bad' : 'down-good';
    }

    /* Score: 100 if BMI in healthy range */
    if      (latestBmi >= 18.5 && latestBmi < 25) score = 95;
    else if (latestBmi >= 17   && latestBmi < 18.5) score = 68;
    else if (latestBmi >= 25   && latestBmi < 27)   score = 68;
    else if (latestBmi >= 27   && latestBmi < 30)   score = 50;
    else                                             score = 35;

    riskLevel   = score >= 80 ? 'good' : score >= 55 ? 'warning' : 'danger';
    contextText = 'Δ ' + (weekChange >= 0 ? '+' : '') + weekChange.toFixed(2) + ' this week';
  }

  return {
    key, values, valid, latest, avg,
    slope, trend, trendBadge, score,
    riskLevel, contextText,
  };
}

/* ============================================================
   OVERALL HEALTH SCORE
   ============================================================ */
function computeHealthScore(analysis) {
  let totalWeight = 0, weightedSum = 0;

  Object.keys(DRIFT_WEIGHTS).forEach(function (key) {
    const metric = analysis[key];
    if (metric && metric.score != null) {
      weightedSum  += metric.score * DRIFT_WEIGHTS[key];
      totalWeight  += DRIFT_WEIGHTS[key];
    }
  });

  if (totalWeight === 0) return null;
  return Math.round(weightedSum / totalWeight);
}

/* ============================================================
   RENDER DRIFT SECTION
   ============================================================ */
function renderDriftSection(section, analysis, profile) {
  const healthScore = computeHealthScore(analysis);
  const scoreColor  = getScoreColor(healthScore);
  const scoreStatus = getScoreStatus(healthScore);
  const scoreDesc   = getScoreDesc(healthScore);

  /* Score arc */
  const circumf = 2 * Math.PI * 28;
  const arcFill = healthScore != null ? ((healthScore / 100) * circumf) : 0;

  section.innerHTML =
    /* Header */
    '<div class="drift-header">' +
      '<div class="drift-header-left">' +
        '<div class="drift-icon-wrap">📈</div>' +
        '<div>' +
          '<div class="drift-title">Health Drift Detection</div>' +
          '<div class="drift-sub">7-day trend analysis · Auto-updated when you log health data</div>' +
        '</div>' +
      '</div>' +
      '<span class="drift-range-badge">Last 7 days</span>' +
    '</div>' +

    /* Overall health score */
    '<div class="drift-score-row">' +
      '<div class="drift-score-circle-wrap">' +
        '<svg viewBox="0 0 72 72" width="72" height="72">' +
          '<circle cx="36" cy="36" r="28" fill="none" stroke="#111f16" stroke-width="7"/>' +
          '<circle cx="36" cy="36" r="28" fill="none" stroke="' + scoreColor + '" stroke-width="7"' +
            ' stroke-dasharray="' + arcFill.toFixed(1) + ' ' + circumf.toFixed(1) + '"' +
            ' stroke-linecap="round" id="drift-score-arc"/>' +
        '</svg>' +
        '<div class="drift-score-center">' +
          '<div class="drift-score-num" style="color:' + scoreColor + ';">' +
            (healthScore != null ? healthScore : '--') +
          '</div>' +
          '<div class="drift-score-label-sm">/ 100</div>' +
        '</div>' +
      '</div>' +
      '<div class="drift-score-info">' +
        '<div class="drift-score-status" style="color:' + scoreColor + ';">' + scoreStatus + '</div>' +
        '<div class="drift-score-desc">' + scoreDesc + '</div>' +
      '</div>' +
      '<div class="drift-score-bar-wrap">' +
        '<div class="drift-score-bar-label">' +
          '<span>Health Score</span><span style="color:' + scoreColor + ';">' + (healthScore || '--') + '/100</span>' +
        '</div>' +
        '<div class="drift-score-bar-bg">' +
          '<div class="drift-score-bar-fill" id="drift-score-bar"' +
            ' style="width:0%;background:' + scoreColor + ';"></div>' +
        '</div>' +
      '</div>' +
    '</div>' +

    /* Metric cards */
    '<div class="drift-cards-grid" id="drift-cards-grid"></div>';

  /* Animate score bar */
  setTimeout(function () {
    const bar = document.getElementById('drift-score-bar');
    if (bar) bar.style.width = (healthScore || 0) + '%';
  }, 100);

  /* Render each metric card */
  const grid = document.getElementById('drift-cards-grid');
  if (grid) {
    renderDriftCard(grid, analysis.weight,    '⚖️', 'Weight',    'kg',  analysis.rawLogs.map(function(l){return l.weight_kg;}));
    renderDriftCard(grid, analysis.sleep,     '😴', 'Sleep',     'hrs', analysis.rawLogs.map(function(l){return l.sleep_hours;}));
    renderDriftCard(grid, analysis.hydration, '💧', 'Hydration', 'L',   analysis.rawLogs.map(function(l){return l.water_ml ? l.water_ml/1000 : null;}));
    renderDriftCard(grid, analysis.bmi,       '📊', 'BMI',       '',    analysis.bmi.values);
  }
}

/* ============================================================
   RENDER SINGLE METRIC CARD
   ============================================================ */
function renderDriftCard(container, metric, emoji, label, unit, chartValues) {
  const card = document.createElement('div');

  if (!metric || metric.score == null) {
    card.className = 'drift-card status-neutral';
    card.innerHTML =
      '<div class="drift-card-header">' +
        '<div class="drift-card-icon-label">' +
          '<span class="drift-card-emoji">' + emoji + '</span>' +
          '<span class="drift-card-name">' + label + '</span>' +
        '</div>' +
      '</div>' +
      '<div class="drift-card-value" style="color:#4d6e5a;">--</div>' +
      '<div class="drift-card-context">No data logged yet</div>' +
      '<span class="drift-risk-label neutral">No data</span>';
    container.appendChild(card);
    return;
  }

  const displayVal = unit === 'L'
    ? (metric.latest / 1000).toFixed(1)
    : unit === '' /* BMI */
    ? metric.latest.toFixed(1)
    : metric.latest != null ? metric.latest : '--';

  const trendArrow = getTrendArrow(metric.trend);
  const riskText   = getRiskText(metric.key, metric.trend, metric.riskLevel);

  card.className = 'drift-card status-' + metric.riskLevel;
  card.innerHTML =
    '<div class="drift-card-header">' +
      '<div class="drift-card-icon-label">' +
        '<span class="drift-card-emoji">' + emoji + '</span>' +
        '<span class="drift-card-name">' + label + '</span>' +
      '</div>' +
      '<span class="drift-trend-badge ' + metric.trendBadge + '">' + trendArrow + ' ' + capitalize(metric.trend) + '</span>' +
    '</div>' +
    '<div class="drift-card-value">' + displayVal + '<span class="drift-card-value-unit"> ' + unit + '</span></div>' +
    '<div class="drift-card-context">' + (metric.contextText || '') + '</div>' +
    '<div class="drift-chart-wrap">' +
      '<svg class="drift-mini-svg" id="drift-chart-' + metric.key + '" viewBox="0 0 100 40" preserveAspectRatio="none"></svg>' +
    '</div>' +
    '<span class="drift-risk-label ' + metric.riskLevel + '">' + riskText + '</span>';

  container.appendChild(card);

  /* Draw mini chart after DOM insert */
  setTimeout(function () {
    drawMiniChart('drift-chart-' + metric.key, chartValues, getChartColor(metric.riskLevel));
  }, 50);
}

/* ============================================================
   DRAW MINI SVG LINE CHART
   ============================================================ */
function drawMiniChart(svgId, values, color) {
  const svg    = document.getElementById(svgId);
  if (!svg) return;

  const valid  = values.filter(function (v) { return v != null; });
  if (valid.length < 2) {
    svg.innerHTML = '<text x="0" y="24" fill="#4d6e5a" font-size="7" font-family="DM Sans,sans-serif">Logging data…</text>';
    return;
  }

  const W   = 100;
  const H   = 40;
  const pad = 4;
  const min = Math.min.apply(null, valid);
  const max = Math.max.apply(null, valid);
  const rng = (max - min) || 1;

  /* Build points only for non-null values */
  const pts = [];
  const step = W / (values.length - 1);
  values.forEach(function (v, i) {
    if (v == null) return;
    pts.push({
      x: i * step,
      y: H - pad - ((v - min) / rng) * (H - pad * 2),
    });
  });

  const polyline = pts.map(function (p) { return p.x.toFixed(1) + ',' + p.y.toFixed(1); }).join(' ');

  /* Gradient fill area */
  const areaPath = 'M ' + pts.map(function (p) { return p.x.toFixed(1) + ' ' + p.y.toFixed(1); }).join(' L ') +
    ' L ' + pts[pts.length-1].x.toFixed(1) + ' ' + H +
    ' L ' + pts[0].x.toFixed(1) + ' ' + H + ' Z';

  /* Trend regression line */
  const slope  = linearRegressionSlope(valid);
  const avgVal = valid.reduce(function(s,v){return s+v;},0)/valid.length;
  const x0 = 0,   y0 = H - pad - ((avgVal - slope * valid.length / 2 - min) / rng) * (H - pad * 2);
  const x1 = W,   y1 = H - pad - ((avgVal + slope * valid.length / 2 - min) / rng) * (H - pad * 2);

  /* Last point dot */
  const last = pts[pts.length - 1];

  svg.innerHTML =
    '<defs>' +
      '<linearGradient id="grad-' + svgId + '" x1="0" y1="0" x2="0" y2="1">' +
        '<stop offset="0%" stop-color="' + color + '" stop-opacity="0.18"/>' +
        '<stop offset="100%" stop-color="' + color + '" stop-opacity="0"/>' +
      '</linearGradient>' +
    '</defs>' +
    /* Area fill */
    '<path d="' + areaPath + '" fill="url(#grad-' + svgId + ')"/>' +
    /* Regression trend line */
    '<line x1="' + x0 + '" y1="' + Math.max(pad, Math.min(H-pad, y0)).toFixed(1) + '"' +
         ' x2="' + x1 + '" y2="' + Math.max(pad, Math.min(H-pad, y1)).toFixed(1) + '"' +
         ' stroke="' + color + '" stroke-width="0.8" stroke-dasharray="3 2" opacity="0.5"/>' +
    /* Main line */
    '<polyline points="' + polyline + '"' +
      ' fill="none" stroke="' + color + '" stroke-width="1.8"' +
      ' stroke-linecap="round" stroke-linejoin="round"/>' +
    /* Last dot */
    '<circle cx="' + last.x.toFixed(1) + '" cy="' + last.y.toFixed(1) + '" r="3"' +
      ' fill="' + color + '" stroke="#060d0a" stroke-width="1.5"/>';
}

/* ============================================================
   NO DATA STATE
   ============================================================ */
function renderDriftNoData(section) {
  section.innerHTML =
    '<div class="drift-header">' +
      '<div class="drift-header-left">' +
        '<div class="drift-icon-wrap">📈</div>' +
        '<div>' +
          '<div class="drift-title">Health Drift Detection</div>' +
          '<div class="drift-sub">7-day trend analysis</div>' +
        '</div>' +
      '</div>' +
      '<span class="drift-range-badge">Last 7 days</span>' +
    '</div>' +
    '<div class="drift-no-data">' +
      '<span class="drift-no-data-icon">📋</span>' +
      '<p>No health data logged yet.<br>' +
        'Use the <strong>Body Feedback Loop</strong> widget above to start logging your daily metrics.<br>' +
        'Drift analysis will appear after <strong>2+ days</strong> of data.</p>' +
    '</div>';
}

/* ============================================================
   MATH HELPERS
   ============================================================ */
function linearRegressionSlope(values) {
  const valid = values.filter(function (v) { return v != null; });
  const n     = valid.length;
  if (n < 2) return 0;

  const indices = [];
  let vi = 0;
  values.forEach(function (v) { if (v != null) indices.push(vi++); });

  const xs    = valid.map(function (_, i) { return i; });
  const sumX  = xs.reduce(function (s, x) { return s + x; }, 0);
  const sumY  = valid.reduce(function (s, y) { return s + y; }, 0);
  const sumXY = xs.reduce(function (s, x, i) { return s + x * valid[i]; }, 0);
  const sumX2 = xs.reduce(function (s, x) { return s + x * x; }, 0);
  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return 0;
  return (n * sumXY - sumX * sumY) / denom;
}

function standardDeviation(values) {
  const n   = values.length;
  if (n < 2) return 0;
  const avg = values.reduce(function (s, v) { return s + v; }, 0) / n;
  const sq  = values.map(function (v) { return (v - avg) * (v - avg); });
  return Math.sqrt(sq.reduce(function (s, v) { return s + v; }, 0) / n);
}

/* ============================================================
   DISPLAY HELPERS
   ============================================================ */
function getScoreColor(score) {
  if (score == null) return '#4d6e5a';
  if (score >= 80)   return '#2ddc7a';
  if (score >= 55)   return '#fbbf24';
  return '#f87171';
}

function getScoreStatus(score) {
  if (score == null) return 'Insufficient Data';
  if (score >= 85)   return 'Excellent';
  if (score >= 70)   return 'Good';
  if (score >= 55)   return 'Fair';
  if (score >= 40)   return 'Needs Attention';
  return 'At Risk';
}

function getScoreDesc(score) {
  if (score == null) return 'Log more health data to generate your score.';
  if (score >= 85)   return 'Your health metrics are trending positively. Keep up the great habits!';
  if (score >= 70)   return 'Most metrics are on track. Minor improvements could boost your score.';
  if (score >= 55)   return 'Some metrics need attention. Review the drift cards below for details.';
  if (score >= 40)   return 'Several metrics are showing unfavorable trends. Consider adjusting your routine.';
  return 'Multiple risk signals detected. Review each metric and consult a health professional if needed.';
}

function getTrendArrow(trend) {
  const map = {
    gaining: '↑', losing: '↓', stable: '→', improving: '↑',
    declining: '↓', irregular: '~', rising: '↑', falling: '↓', no_data: '?',
  };
  return map[trend] || '→';
}

function getRiskText(key, trend, level) {
  const texts = {
    weight: {
      good: 'On Track',   warning: 'Monitor Closely', danger: 'Health Risk',
    },
    sleep: {
      good: 'Well Rested', warning: 'Sleep Deficit',   danger: 'Critical Deficit',
    },
    hydration: {
      good: 'Well Hydrated', warning: 'Low Hydration', danger: 'Dehydration Risk',
    },
    bmi: {
      good: 'Healthy Range', warning: 'Borderline',    danger: 'Outside Range',
    },
  };
  return (texts[key] && texts[key][level]) || 'N/A';
}

function getChartColor(level) {
  if (level === 'good')    return '#2ddc7a';
  if (level === 'warning') return '#fbbf24';
  if (level === 'danger')  return '#f87171';
  return '#4d6e5a';
}

function capitalize(str) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
}
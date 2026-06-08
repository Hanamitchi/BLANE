/* ============================================================
   BLANE — Seasonal Availability Engine (Module 06)

   Philippines seasons:
     Dry  (Tag Season): November – May   (months 11,12,1,2,3,4,5)
     Wet  (Rainy):      June – October   (months 6,7,8,9,10)

   Provides:
   - SEASONAL.getCurrentSeason()          → 'wet' | 'dry'
   - SEASONAL.getIngredientStatus(name)   → { status, season, alt }
   - SEASONAL.scoreRecipe(ingredients)    → { score, label, cssClass, inCount, outCount, yrCount }
   - SEASONAL.badgeHTML(score)            → badge HTML string
   - SEASONAL.ingTagHTML(name)            → tag HTML string
   - SEASONAL.altBannerHTML(name)         → alternative banner HTML string
   ============================================================ */

const SEASONAL = (function () {

  /* ============================================================
     PHILIPPINES SEASON CALENDAR
     dry  = November–May   (months 11,12,1,2,3,4,5)
     wet  = June–October   (months 6,7,8,9,10)
  ============================================================ */
  const DRY_MONTHS = [11, 12, 1, 2, 3, 4, 5];
  const WET_MONTHS = [6, 7, 8, 9, 10];

  function getCurrentMonth() { return new Date().getMonth() + 1; } /* 1-12 */

  function getCurrentSeason() {
    return DRY_MONTHS.includes(getCurrentMonth()) ? 'dry' : 'wet';
  }

  /* ============================================================
     INGREDIENT SEASONAL DATABASE
     season: 'dry' | 'wet' | 'both' (year-round)
     alt:    cheaper/more available seasonal alternative
  ============================================================ */
  const INGREDIENT_DB = {
    /* ---- Year-round ---- */
    'eggs':           { season: 'both', alt: null },
    'garlic':         { season: 'both', alt: null },
    'onion':          { season: 'both', alt: null },
    'ginger':         { season: 'both', alt: null },
    'cooking oil':    { season: 'both', alt: null },
    'salt':           { season: 'both', alt: null },
    'fish sauce':     { season: 'both', alt: null },
    'soy sauce':      { season: 'both', alt: null },
    'brown sugar':    { season: 'both', alt: null },
    'bagoong alamang':{ season: 'both', alt: null },
    'tamarind mix':   { season: 'both', alt: null },
    'vinegar':        { season: 'both', alt: null },
    'black pepper':   { season: 'both', alt: null },
    'calamansi':      { season: 'both', alt: null },
    'banana':         { season: 'both', alt: null },
    'papaya':         { season: 'both', alt: null },
    'green papaya':   { season: 'both', alt: null },
    'pineapple':      { season: 'both', alt: null },
    'malunggay':      { season: 'both', alt: null },
    'malunggay leaves':{ season: 'both', alt: null },
    'kangkong':       { season: 'both', alt: null },
    'eggplant':       { season: 'both', alt: null },
    'sweet potato':   { season: 'both', alt: null },
    'kamote':         { season: 'both', alt: null },
    'squash':         { season: 'both', alt: null },
    'ampalaya':       { season: 'both', alt: null },
    'ampalaya leaves':{ season: 'both', alt: null },
    'rice':           { season: 'both', alt: null },
    'brown rice':     { season: 'both', alt: null },
    'glutinous rice': { season: 'both', alt: null },
    'sinandomeng rice':{ season: 'both', alt: null },
    'rolled oats':    { season: 'both', alt: null },
    'peanut butter':  { season: 'both', alt: null },
    'honey':          { season: 'both', alt: null },
    'milk':           { season: 'both', alt: null },
    'chicken':        { season: 'both', alt: null },
    'chicken breast': { season: 'both', alt: null },
    'chicken thigh':  { season: 'both', alt: null },
    'pork':           { season: 'both', alt: null },
    'pork belly':     { season: 'both', alt: null },
    'mung beans':     { season: 'both', alt: null },
    'salted egg':     { season: 'both', alt: null },
    'sesame oil':     { season: 'both', alt: null },
    'tomato':         { season: 'both', alt: null },

    /* ---- Fish (year-round in PH, bangus peak dry season) ---- */
    'bangus':         { season: 'both', peakSeason: 'dry', alt: null },
    'tilapia':        { season: 'both', alt: null },

    /* ---- Dry season produce (Nov–May) ---- */
    'pechay':         { season: 'dry',  alt: 'Kangkong (wet season)' },
    'cabbage':        { season: 'dry',  alt: 'Pechay or Kangkong' },
    'lettuce':        { season: 'dry',  alt: 'Kangkong or Pechay' },
    'broccoli':       { season: 'dry',  alt: 'Kangkong or Pechay' },
    'cauliflower':    { season: 'dry',  alt: 'Cabbage or Pechay' },
    'carrot':         { season: 'dry',  alt: 'Squash (available year-round)' },
    'potato':         { season: 'dry',  alt: 'Kamote (year-round)' },
    'mango':          { season: 'dry',  alt: 'Banana or Papaya' },
    'watermelon':     { season: 'dry',  alt: 'Pineapple (year-round)' },
    'strawberry':     { season: 'dry',  alt: 'Mango (dry) or Banana' },
    'white onion':    { season: 'dry',  alt: null },
    'spring onion':   { season: 'dry',  alt: 'White onion sliced thinly' },
    'leeks':          { season: 'dry',  alt: 'Spring onion (dry season)' },
    'chinese cabbage':{ season: 'dry',  alt: 'Pechay or Kangkong' },

    /* ---- Wet season produce (Jun–Oct) ---- */
    'okra':           { season: 'wet',  alt: 'String beans (dry season)' },
    'sitaw':          { season: 'wet',  alt: 'Baguio beans (dry)' },
    'string beans':   { season: 'wet',  alt: 'Baguio beans (dry season)' },
    'patola':         { season: 'wet',  alt: 'Upo or Eggplant' },
    'upo':            { season: 'wet',  alt: 'Pechay or Squash' },
    'durian':         { season: 'wet',  alt: 'Jackfruit or Banana' },
    'lanzones':       { season: 'wet',  alt: 'Grapes or Rambutan (dry)' },
    'jackfruit':      { season: 'wet',  alt: 'Banana or Green papaya' },
    'rambutan':       { season: 'wet',  alt: 'Lychee or Grape' },
    'guava':          { season: 'wet',  alt: 'Papaya or Banana' },
    'corn':           { season: 'wet',  alt: 'Sweet potato (year-round)' },
    'chili':          { season: 'wet',  alt: null },
    'gabi':           { season: 'wet',  alt: 'Sweet potato (year-round)' },
  };

  /* ============================================================
     LOOKUP INGREDIENT STATUS
  ============================================================ */
  function getIngredientStatus(name) {
    const key    = name.toLowerCase().trim();
    const season = getCurrentSeason();

    /* Direct match */
    let entry = INGREDIENT_DB[key];

    /* Partial match (e.g. "Chicken breast" → "chicken breast") */
    if (!entry) {
      const found = Object.keys(INGREDIENT_DB).find(function (k) {
        return key.includes(k) || k.includes(key.split(' ')[0]);
      });
      if (found) entry = INGREDIENT_DB[found];
    }

    if (!entry) {
      /* Unknown ingredient — assume year-round */
      return { status: 'year_round', season: 'both', alt: null };
    }

    if (entry.season === 'both') {
      return { status: 'year_round', season: 'both', alt: entry.alt };
    }

    if (entry.season === season) {
      return { status: 'in_season', season: entry.season, alt: null };
    }

    /* Out of season */
    return { status: 'out_of_season', season: entry.season, alt: entry.alt };
  }

  /* ============================================================
     SCORE A RECIPE based on its ingredient list
     Returns: { score 0-100, label, cssClass, inCount, outCount, yrCount }
  ============================================================ */
  function scoreRecipe(ingredients) {
    if (!ingredients || ingredients.length === 0) {
      return { score: 100, label: 'Year-Round', cssClass: 'year-round', inCount: 0, outCount: 0, yrCount: 0 };
    }

    let inCount = 0, outCount = 0, yrCount = 0;

    ingredients.forEach(function (ing) {
      const name   = typeof ing === 'string' ? ing : ing.name;
      const result = getIngredientStatus(name);
      if      (result.status === 'in_season')    inCount++;
      else if (result.status === 'out_of_season') outCount++;
      else                                        yrCount++;
    });

    const total = ingredients.length;
    /* Score: in_season = full, year_round = 0.8, out_of_season = 0 */
    const raw   = ((inCount * 1.0) + (yrCount * 0.8)) / total;
    const score = Math.round(raw * 100);

    let label, cssClass;
    if      (outCount === 0 && inCount === 0) { label = 'Year-Round';    cssClass = 'year-round';    }
    else if (outCount === 0)                  { label = 'In Season';     cssClass = 'in-season';     }
    else if (outCount < total / 2)            { label = 'Mostly Season'; cssClass = 'partial';       }
    else                                      { label = 'Out of Season'; cssClass = 'out-of-season'; }

    return { score, label, cssClass, inCount, outCount, yrCount };
  }

  /* ============================================================
     HTML GENERATORS
  ============================================================ */
  function badgeHTML(scoreResult) {
    const icon = {
      'in-season':     '🌿',
      'partial':       '🌤️',
      'out-of-season': '🌧️',
      'year-round':    '📅',
    }[scoreResult.cssClass] || '📅';

    return '<span class="season-badge ' + scoreResult.cssClass + '">' +
      icon + ' ' + scoreResult.label +
    '</span>';
  }

  function ingTagHTML(ingredientName) {
    const result = getIngredientStatus(ingredientName);
    const labels = {
      in_season:    '🌿 In Season',
      out_of_season:'🌧️ Out of Season',
      year_round:   '📅 Year-Round',
    };
    const classes = {
      in_season:    'in-season',
      out_of_season:'out-of-season',
      year_round:   'year-round',
    };
    return '<span class="ing-season-tag ' + classes[result.status] + '">' +
      labels[result.status] +
    '</span>';
  }

  function altBannerHTML(ingredientName) {
    const result = getIngredientStatus(ingredientName);
    if (result.status !== 'out_of_season' || !result.alt) return '';

    const season = getCurrentSeason();
    const seasonLabel = season === 'wet' ? '🌧️ Wet Season' : '☀️ Dry Season';

    return '<div class="seasonal-alt-banner">' +
      '<span class="seasonal-alt-icon">💡</span>' +
      '<div class="seasonal-alt-text">' +
        '<strong>' + ingredientName + '</strong> is out of season during the ' + seasonLabel + '. ' +
        'Try <strong>' + result.alt + '</strong> as a fresher, more affordable alternative right now.' +
      '</div>' +
    '</div>';
  }

  function currentSeasonPillHTML() {
    const season = getCurrentSeason();
    const month  = new Date().toLocaleString('en-PH', { month: 'long' });
    const label  = season === 'wet'
      ? '🌧️ Wet Season — ' + month
      : '☀️ Dry Season — ' + month;
    return '<span class="current-season-pill ' + season + '">' + label + '</span>';
  }

  /* ============================================================
     PUBLIC API
  ============================================================ */
  return {
    getCurrentSeason,
    getCurrentMonth,
    getIngredientStatus,
    scoreRecipe,
    badgeHTML,
    ingTagHTML,
    altBannerHTML,
    currentSeasonPillHTML,
  };

})();
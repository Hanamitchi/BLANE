/* ============================================================
   BLANE — Recipes Module
   Handles: recipe grid, search, filter, detail modal
   Depends on: supabase-config.js, auth.js
   ============================================================ */

/* ============================================================
   RECIPE DATA (demo — replace with Supabase fetch later)
   ============================================================ */
const RECIPES = [
  {
    id: 'r1',
    emoji: '🍳',
    name: 'Egg & Malunggay Scramble',
    type: 'Breakfast',
    diet: ['vegetarian'],
    goal: ['maintain', 'gain_muscle'],
    difficulty: 'easy',
    cookTime: 15,
    servings: 1,
    kcal: 380,
    cost: 45,
    protein: 24,
    carbs: 18,
    fats: 12,
    ingredients: [
      { name: 'Eggs',           qty: '2 pcs',      status: 'avail' },
      { name: 'Malunggay leaves', qty: '1 handful', status: 'avail' },
      { name: 'Garlic',         qty: '2 cloves',   status: 'avail' },
      { name: 'Onion',          qty: '1/4 pc',     status: 'avail' },
      { name: 'Cooking oil',    qty: '1 tsp',      status: 'avail' },
      { name: 'Salt & pepper',  qty: 'to taste',   status: 'avail' },
    ],
    steps: [
      { title: 'Prep the aromatics', desc: 'Mince the garlic and dice the onion into small pieces. Strip the malunggay leaves from their stems and set aside.', timer: null },
      { title: 'Sauté garlic & onion', desc: 'Heat oil in a pan over medium heat. Sauté garlic and onion for 1–2 minutes until fragrant and translucent.', timer: 120 },
      { title: 'Add malunggay', desc: 'Toss in the malunggay leaves and stir-fry for about 30 seconds until slightly wilted.', timer: 30 },
      { title: 'Scramble the eggs', desc: 'Crack the eggs directly into the pan. Season with salt and pepper. Gently fold everything together over medium-low heat until eggs are just set — avoid overcooking.', timer: 90 },
      { title: 'Serve', desc: 'Plate immediately and serve hot with steamed rice or whole-grain toast.', timer: null },
    ],
  },
  {
    id: 'r2',
    emoji: '🥣',
    name: 'Oatmeal with Banana & Honey',
    type: 'Breakfast',
    diet: ['vegetarian', 'dairy_free'],
    goal: ['lose_weight', 'boost_energy'],
    difficulty: 'easy',
    cookTime: 10,
    servings: 1,
    kcal: 320,
    cost: 35,
    protein: 10,
    carbs: 58,
    fats: 6,
    ingredients: [
      { name: 'Rolled oats',   qty: '1/2 cup',  status: 'avail' },
      { name: 'Ripe banana',   qty: '1 pc',     status: 'avail' },
      { name: 'Honey',         qty: '1 tsp',    status: 'avail' },
      { name: 'Water or milk', qty: '1 cup',    status: 'avail' },
      { name: 'Cinnamon',      qty: 'a pinch',  status: 'avail' },
    ],
    steps: [
      { title: 'Boil liquid', desc: 'Bring water or milk to a boil in a small saucepan over medium heat.', timer: 120 },
      { title: 'Cook oats', desc: 'Add the rolled oats and reduce heat to low. Stir occasionally and cook for 5 minutes until thickened to your liking.', timer: 300 },
      { title: 'Slice banana', desc: 'While oats cook, slice the banana into rounds.', timer: null },
      { title: 'Assemble', desc: 'Pour cooked oatmeal into a bowl. Top with banana slices, drizzle honey, and sprinkle cinnamon. Serve warm.', timer: null },
    ],
  },
  {
    id: 'r3',
    emoji: '🍜',
    name: 'Arroz Caldo',
    type: 'Breakfast',
    diet: [],
    goal: ['improve_health', 'manage_condition'],
    difficulty: 'medium',
    cookTime: 35,
    servings: 2,
    kcal: 340,
    cost: 55,
    protein: 18,
    carbs: 48,
    fats: 7,
    ingredients: [
      { name: 'Glutinous rice', qty: '1/2 cup',   status: 'avail' },
      { name: 'Chicken thigh', qty: '150g',       status: 'avail' },
      { name: 'Ginger',        qty: '3 slices',   status: 'avail' },
      { name: 'Garlic',        qty: '4 cloves',   status: 'avail' },
      { name: 'Fish sauce',    qty: '1 tbsp',     status: 'avail' },
      { name: 'Chicken broth', qty: '3 cups',     status: 'avail' },
      { name: 'Spring onion',  qty: '2 stalks',   status: 'warn'  },
      { name: 'Calamansi',     qty: '2 pcs',      status: 'avail' },
    ],
    steps: [
      { title: 'Sauté aromatics', desc: 'In a deep pot, heat oil over medium heat. Sauté garlic, ginger, and onion until fragrant, about 2 minutes.', timer: 120 },
      { title: 'Brown the chicken', desc: 'Add the chicken pieces and cook for 3–4 minutes per side until lightly browned. Season with fish sauce.', timer: 240 },
      { title: 'Add rice & broth', desc: 'Pour in the chicken broth and add the washed glutinous rice. Bring to a boil.', timer: 180 },
      { title: 'Simmer', desc: 'Reduce heat to low. Cover and simmer for 20–25 minutes, stirring occasionally, until the rice is very soft and the porridge has thickened.', timer: 1500 },
      { title: 'Serve', desc: 'Ladle into bowls and top with sliced spring onion and fried garlic. Serve with calamansi on the side.', timer: null },
    ],
  },
  {
    id: 'r4',
    emoji: '🥗',
    name: 'Chicken & Veggie Rice Bowl',
    type: 'Lunch',
    diet: ['gluten_free'],
    goal: ['gain_muscle', 'maintain'],
    difficulty: 'medium',
    cookTime: 25,
    servings: 1,
    kcal: 520,
    cost: 95,
    protein: 38,
    carbs: 52,
    fats: 10,
    ingredients: [
      { name: 'Chicken breast', qty: '150g',     status: 'avail' },
      { name: 'Brown rice',     qty: '1 cup',    status: 'avail' },
      { name: 'Broccoli',       qty: '80g',      status: 'warn'  },
      { name: 'Carrots',        qty: '1/2 pc',   status: 'avail' },
      { name: 'Soy sauce',      qty: '1 tbsp',   status: 'avail' },
      { name: 'Sesame oil',     qty: '1 tsp',    status: 'avail' },
      { name: 'Garlic',         qty: '2 cloves', status: 'avail' },
    ],
    steps: [
      { title: 'Cook rice', desc: 'Cook brown rice according to package instructions. This usually takes 25–30 minutes — start this first.', timer: 1800 },
      { title: 'Prep & marinate chicken', desc: 'Slice chicken breast into strips. Mix with soy sauce, minced garlic, and sesame oil. Let marinate for at least 5 minutes.', timer: 300 },
      { title: 'Cook vegetables', desc: 'Steam or stir-fry broccoli and julienned carrots for 4–5 minutes until tender-crisp. Season lightly with salt.', timer: 300 },
      { title: 'Cook chicken', desc: 'Heat a pan over medium-high heat. Cook marinated chicken strips for 5–6 minutes, turning once, until cooked through with a light char.', timer: 360 },
      { title: 'Assemble bowl', desc: 'Scoop rice into a bowl. Arrange chicken and vegetables on top. Drizzle any remaining pan juices over everything and serve.', timer: null },
    ],
  },
  {
    id: 'r5',
    emoji: '🩵',
    name: 'Tinolang Manok',
    type: 'Lunch',
    diet: ['gluten_free', 'dairy_free'],
    goal: ['improve_health', 'lose_weight', 'manage_condition'],
    difficulty: 'easy',
    cookTime: 40,
    servings: 3,
    kcal: 310,
    cost: 75,
    protein: 28,
    carbs: 20,
    fats: 8,
    ingredients: [
      { name: 'Chicken pieces', qty: '400g',      status: 'avail' },
      { name: 'Green papaya',   qty: '1/2 pc',    status: 'avail' },
      { name: 'Malunggay',      qty: '1 cup',     status: 'avail' },
      { name: 'Ginger',         qty: '1 thumb',   status: 'avail' },
      { name: 'Garlic & onion', qty: 'to taste',  status: 'avail' },
      { name: 'Fish sauce',     qty: '2 tbsp',    status: 'avail' },
      { name: 'Water',          qty: '4 cups',    status: 'avail' },
    ],
    steps: [
      { title: 'Sauté base', desc: 'In a pot, heat oil and sauté ginger first until fragrant, then add garlic and onion. Cook for 2 minutes.', timer: 120 },
      { title: 'Brown chicken', desc: 'Add the chicken pieces and cook for 3–4 minutes until lightly sealed on all sides. Season with fish sauce.', timer: 240 },
      { title: 'Add water & boil', desc: 'Pour in water, bring to a boil, then reduce heat. Skim any foam that rises to the surface.', timer: 300 },
      { title: 'Simmer with papaya', desc: 'Add the peeled and cubed green papaya. Simmer for 15–20 minutes until the papaya is tender and the chicken is cooked through.', timer: 1200 },
      { title: 'Add malunggay', desc: 'Turn off the heat and stir in the malunggay leaves. The residual heat will wilt them perfectly. Serve hot with steamed rice.', timer: null },
    ],
  },
  {
    id: 'r6',
    emoji: '🥩',
    name: 'Grilled Pork Liempo',
    type: 'Lunch',
    diet: ['gluten_free', 'dairy_free'],
    goal: ['gain_muscle', 'maintain'],
    difficulty: 'medium',
    cookTime: 45,
    servings: 2,
    kcal: 560,
    cost: 110,
    protein: 42,
    carbs: 10,
    fats: 28,
    ingredients: [
      { name: 'Pork belly',    qty: '300g',     status: 'avail' },
      { name: 'Calamansi',     qty: '6 pcs',    status: 'avail' },
      { name: 'Garlic',        qty: '5 cloves', status: 'avail' },
      { name: 'Soy sauce',     qty: '3 tbsp',   status: 'avail' },
      { name: 'Brown sugar',   qty: '1 tbsp',   status: 'avail' },
      { name: 'Black pepper',  qty: 'to taste', status: 'avail' },
    ],
    steps: [
      { title: 'Make marinade', desc: 'Combine calamansi juice, soy sauce, minced garlic, brown sugar, and black pepper in a bowl. Mix well until sugar dissolves.', timer: null },
      { title: 'Marinate', desc: 'Score the pork belly slabs and submerge in the marinade. Cover and refrigerate for at least 30 minutes — or overnight for best results.', timer: 1800 },
      { title: 'Prepare grill', desc: 'Heat your grill or grilling pan to medium-high heat. Brush lightly with oil.', timer: 300 },
      { title: 'Grill', desc: 'Grill pork belly for 5–6 minutes per side, basting with leftover marinade each time you flip. Cook until nicely charred and cooked through.', timer: 720 },
      { title: 'Rest & serve', desc: 'Let the meat rest for 3 minutes before slicing. Serve with steamed rice, atchara, and sawsawan (vinegar dip).', timer: 180 },
    ],
  },
  {
    id: 'r7',
    emoji: '🍲',
    name: 'Sinigang na Isda',
    type: 'Dinner',
    diet: ['gluten_free', 'dairy_free'],
    goal: ['lose_weight', 'improve_health', 'manage_condition'],
    difficulty: 'easy',
    cookTime: 35,
    servings: 3,
    kcal: 280,
    cost: 80,
    protein: 32,
    carbs: 18,
    fats: 5,
    ingredients: [
      { name: 'Bangus / Tilapia', qty: '400g',    status: 'avail' },
      { name: 'Kangkong',         qty: '1 bundle', status: 'avail' },
      { name: 'Tamarind mix',     qty: '1 pack',   status: 'avail' },
      { name: 'Tomatoes',         qty: '2 pcs',    status: 'avail' },
      { name: 'Onion',            qty: '1 pc',     status: 'avail' },
      { name: 'Eggplant',         qty: '1 pc',     status: 'warn'  },
      { name: 'Radish',           qty: '1/2 pc',   status: 'avail' },
      { name: 'Fish sauce',       qty: '2 tbsp',   status: 'avail' },
    ],
    steps: [
      { title: 'Boil broth base', desc: 'In a pot, bring 4 cups of water to a boil with the tomatoes and onion. Simmer for 5 minutes to build flavor.', timer: 300 },
      { title: 'Add tamarind', desc: 'Stir in the tamarind mix (sinigang sa sampalok powder). Taste and adjust sourness to your preference.', timer: null },
      { title: 'Add hard vegetables', desc: 'Add the sliced radish and eggplant. Simmer for 5–7 minutes until just tender.', timer: 420 },
      { title: 'Add fish', desc: 'Gently add the fish pieces. Simmer for 6–8 minutes — do not stir aggressively to keep the fish intact. Season with fish sauce.', timer: 480 },
      { title: 'Add kangkong', desc: 'Turn off heat and add the kangkong leaves. Cover for 1 minute to wilt. Serve hot with steamed rice.', timer: 60 },
    ],
  },
  {
    id: 'r8',
    emoji: '🍛',
    name: 'Monggo Guisado',
    type: 'Dinner',
    diet: ['dairy_free'],
    goal: ['lose_weight', 'improve_health'],
    difficulty: 'easy',
    cookTime: 50,
    servings: 3,
    kcal: 380,
    cost: 55,
    protein: 22,
    carbs: 50,
    fats: 6,
    ingredients: [
      { name: 'Mung beans',      qty: '1 cup',     status: 'avail' },
      { name: 'Pork (optional)', qty: '80g',       status: 'avail' },
      { name: 'Ampalaya leaves', qty: '1 handful', status: 'warn'  },
      { name: 'Garlic',          qty: '4 cloves',  status: 'avail' },
      { name: 'Onion',           qty: '1 pc',      status: 'avail' },
      { name: 'Tomato',          qty: '1 pc',      status: 'avail' },
      { name: 'Fish sauce',      qty: '2 tbsp',    status: 'avail' },
    ],
    steps: [
      { title: 'Soak & pre-boil beans', desc: 'Rinse mung beans and boil in water for 20 minutes until soft. Drain and set aside.', timer: 1200 },
      { title: 'Sauté', desc: 'In a pot, sauté garlic, onion, and tomato until softened. Add pork (if using) and cook for 3–4 minutes.', timer: 240 },
      { title: 'Combine', desc: 'Add the pre-boiled mung beans and enough water to achieve a soupy consistency. Bring to a simmer.', timer: 300 },
      { title: 'Season', desc: 'Season with fish sauce. Simmer for 10 more minutes, stirring occasionally, until flavors meld.', timer: 600 },
      { title: 'Add greens', desc: 'Turn off heat. Stir in ampalaya leaves (or malunggay as substitute). Cover for 1 minute before serving.', timer: 60 },
    ],
  },
  {
    id: 'r9',
    emoji: '🍌',
    name: 'Banana & Peanut Butter Snack',
    type: 'Snack',
    diet: ['vegetarian', 'gluten_free'],
    goal: ['boost_energy', 'gain_muscle'],
    difficulty: 'easy',
    cookTime: 5,
    servings: 1,
    kcal: 210,
    cost: 25,
    protein: 6,
    carbs: 30,
    fats: 8,
    ingredients: [
      { name: 'Ripe banana',   qty: '1 pc',   status: 'avail' },
      { name: 'Peanut butter', qty: '1 tbsp', status: 'avail' },
    ],
    steps: [
      { title: 'Slice banana', desc: 'Peel and slice the banana into even rounds, or leave whole if preferred.', timer: null },
      { title: 'Plate & serve', desc: 'Arrange banana on a small plate. Add a tablespoon of peanut butter on the side for dipping, or spread directly on each slice. Enjoy immediately.', timer: null },
    ],
  },
  {
    id: 'r10',
    emoji: '🧁',
    name: 'Camote Cue',
    type: 'Snack',
    diet: ['vegan', 'gluten_free', 'dairy_free'],
    goal: ['boost_energy'],
    difficulty: 'medium',
    cookTime: 20,
    servings: 2,
    kcal: 260,
    cost: 30,
    protein: 2,
    carbs: 54,
    fats: 7,
    ingredients: [
      { name: 'Sweet potato', qty: '2 medium', status: 'avail' },
      { name: 'Brown sugar',  qty: '4 tbsp',  status: 'avail' },
      { name: 'Cooking oil',  qty: '2 cups',  status: 'avail' },
    ],
    steps: [
      { title: 'Prep camote', desc: 'Peel the sweet potatoes and cut into thick rounds (about 1.5 cm thick).', timer: null },
      { title: 'Heat oil', desc: 'Heat oil in a deep pan over medium heat. You need enough oil to at least partially submerge the camote slices.', timer: 120 },
      { title: 'Fry first', desc: 'Add the camote slices and fry for 6–8 minutes until cooked through and lightly golden.', timer: 480 },
      { title: 'Add sugar', desc: 'Sprinkle brown sugar over the frying camote. Let it caramelize without stirring for 2–3 minutes until the coating turns golden and sticky.', timer: 180 },
      { title: 'Drain & skewer', desc: 'Remove carefully with a slotted spoon. Drain on paper towels. Skewer on bamboo sticks and serve while hot and caramelized.', timer: null },
    ],
  },
  {
    id: 'r11',
    emoji: '🥬',
    name: 'Pinakbet',
    type: 'Dinner',
    diet: ['gluten_free', 'dairy_free'],
    goal: ['lose_weight', 'improve_health', 'manage_condition'],
    difficulty: 'medium',
    cookTime: 30,
    servings: 3,
    kcal: 220,
    cost: 60,
    protein: 12,
    carbs: 22,
    fats: 8,
    ingredients: [
      { name: 'Ampalaya',       qty: '1 pc',      status: 'avail' },
      { name: 'Eggplant',       qty: '1 pc',      status: 'avail' },
      { name: 'Squash',         qty: '150g',      status: 'avail' },
      { name: 'String beans',   qty: '1 bundle',  status: 'avail' },
      { name: 'Okra',           qty: '6 pcs',     status: 'warn'  },
      { name: 'Bagoong alamang',qty: '2 tbsp',    status: 'avail' },
      { name: 'Pork (optional)',qty: '80g',       status: 'avail' },
      { name: 'Garlic & onion', qty: 'to taste',  status: 'avail' },
    ],
    steps: [
      { title: 'Prep vegetables', desc: 'Cut all vegetables into bite-sized pieces. Slice ampalaya and remove seeds. Cut eggplant, squash, and beans into uniform pieces.', timer: null },
      { title: 'Render pork fat', desc: 'In a pan, cook pork pieces over medium heat until fat is rendered and meat is lightly browned. Remove excess fat, leaving about 1 tbsp.', timer: 240 },
      { title: 'Sauté aromatics', desc: 'In the same pan with pork fat, sauté garlic and onion. Add bagoong alamang and cook for 1 minute to bloom the flavor.', timer: 120 },
      { title: 'Layer vegetables', desc: 'Add squash and string beans first as they take longer. Cover and cook for 5 minutes. Then add eggplant, ampalaya, and okra.', timer: 300 },
      { title: 'Steam & serve', desc: 'Do not add water — the vegetables will release their own moisture. Cover and cook for 8–10 more minutes until tender. Serve with rice.', timer: 600 },
    ],
  },
  {
    id: 'r12',
    emoji: '🫙',
    name: 'Ensaladang Talong',
    type: 'Snack',
    diet: ['vegan', 'gluten_free', 'dairy_free'],
    goal: ['lose_weight', 'improve_health'],
    difficulty: 'easy',
    cookTime: 15,
    servings: 2,
    kcal: 120,
    cost: 20,
    protein: 4,
    carbs: 12,
    fats: 6,
    ingredients: [
      { name: 'Eggplant',       qty: '2 pcs',   status: 'avail' },
      { name: 'Tomato',         qty: '1 pc',    status: 'avail' },
      { name: 'Onion',          qty: '1/2 pc',  status: 'avail' },
      { name: 'Salted egg',     qty: '1 pc',    status: 'avail' },
      { name: 'Vinegar',        qty: '1 tbsp',  status: 'avail' },
      { name: 'Fish sauce',     qty: '1 tsp',   status: 'avail' },
    ],
    steps: [
      { title: 'Grill eggplant', desc: 'Grill whole eggplants directly over an open flame or a grill pan, turning occasionally, until the skin is charred all over and the inside is soft.', timer: 600 },
      { title: 'Peel & mash', desc: 'Let the eggplant cool slightly, then peel off the charred skin. Place the flesh on a plate and lightly mash with a fork.', timer: null },
      { title: 'Prepare toppings', desc: 'Dice tomato and onion. Slice the salted egg into wedges.', timer: null },
      { title: 'Dress & serve', desc: 'Arrange eggplant on a plate. Top with tomato, onion, and salted egg slices. Drizzle with vinegar and fish sauce. Serve as a side or light snack.', timer: null },
    ],
  },
];

/* ============================================================
   STATE
   ============================================================ */
let activeTypeFilter = 'All';
let activeDietFilter = 'All';
let searchQuery      = '';
let openRecipeId     = null;

/* ============================================================
   INIT
   ============================================================ */
document.addEventListener('DOMContentLoaded', async function () {
  const session = await guardPage();
  if (!session) return;

  buildFilterBar();
  renderGrid();

  /* Search */
  document.getElementById('rp-search').addEventListener('input', function () {
    searchQuery = this.value.trim().toLowerCase();
    renderGrid();
  });

  /* Modal close */
  document.getElementById('recipe-modal-overlay').addEventListener('click', function (e) {
    if (e.target === this) closeModal();
  });
  document.getElementById('recipe-modal-close').addEventListener('click', closeModal);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeModal();
  });
});

/* ============================================================
   FILTER BAR
   ============================================================ */
const TYPE_FILTERS = ['All', 'Breakfast', 'Lunch', 'Dinner', 'Snack'];
const DIET_FILTERS = ['All diets', 'Vegetarian', 'Vegan', 'Gluten-Free', 'Dairy-Free'];

function buildFilterBar() {
  const bar = document.getElementById('rp-filter-row');
  bar.innerHTML = '';

  /* Type filters */
  TYPE_FILTERS.forEach(function (f) {
    const btn = document.createElement('button');
    btn.className = 'rp-filter-btn' + (f === activeTypeFilter ? ' active' : '');
    btn.textContent = f;
    btn.addEventListener('click', function () {
      activeTypeFilter = f;
      buildFilterBar();
      renderGrid();
    });
    bar.appendChild(btn);
  });

  /* Divider */
  const div = document.createElement('div');
  div.className = 'rp-filter-divider';
  bar.appendChild(div);

  /* Diet filters */
  DIET_FILTERS.forEach(function (f) {
    const key = f === 'All diets' ? 'All' : f.toLowerCase().replace('-', '_').replace(' ', '_');
    const btn = document.createElement('button');
    btn.className = 'rp-filter-btn' + (f === activeDietFilter || (f === 'All diets' && activeDietFilter === 'All') ? ' active' : '');
    btn.textContent = f;
    btn.addEventListener('click', function () {
      activeDietFilter = f === 'All diets' ? 'All' : key;
      buildFilterBar();
      renderGrid();
    });
    bar.appendChild(btn);
  });
}

/* ============================================================
   FILTER LOGIC
   ============================================================ */
function getFiltered() {
  return RECIPES.filter(function (r) {
    const matchType = activeTypeFilter === 'All' || r.type === activeTypeFilter;
    const matchDiet = activeDietFilter === 'All' || r.diet.includes(activeDietFilter);
    const matchSearch = !searchQuery ||
      r.name.toLowerCase().includes(searchQuery) ||
      r.type.toLowerCase().includes(searchQuery) ||
      r.ingredients.some(function (i) { return i.name.toLowerCase().includes(searchQuery); });
    return matchType && matchDiet && matchSearch;
  });
}

/* ============================================================
   RENDER GRID
   ============================================================ */
function renderGrid() {
  const grid    = document.getElementById('rp-grid');
  const countEl = document.getElementById('rp-result-count');
  const filtered = getFiltered();
  grid.innerHTML = '';

  if (countEl) countEl.textContent = filtered.length;

  if (filtered.length === 0) {
    grid.innerHTML =
      '<div class="rp-empty-state">' +
        '<span class="rp-empty-icon">🔍</span>' +
        '<p class="rp-empty-text">No recipes match your search or filters.<br>Try adjusting the filters above.</p>' +
      '</div>';
    return;
  }

  filtered.forEach(function (recipe) {
    grid.appendChild(buildCard(recipe));
  });
}

/* ============================================================
   BUILD RECIPE CARD
   ============================================================ */
function buildCard(recipe) {
  const card = document.createElement('div');
  card.className = 'recipe-card';

  card.innerHTML =
    '<div class="recipe-card-banner">' +
      recipe.emoji +
      '<span class="recipe-card-type-tag">' + recipe.type + '</span>' +
      '<span class="recipe-card-diff-tag ' + recipe.difficulty + '">' +
        recipe.difficulty.charAt(0).toUpperCase() + recipe.difficulty.slice(1) +
      '</span>' +
    '</div>' +
    '<div class="recipe-card-body">' +
      '<div class="recipe-card-name">' + recipe.name + '</div>' +
      '<div class="recipe-card-meta">' +
        '<span>⏱ ' + recipe.cookTime + ' min</span>' +
        '<span>🍽️ ' + recipe.servings + (recipe.servings === 1 ? ' serving' : ' servings') + '</span>' +
      '</div>' +
      '<div class="recipe-card-macros">' +
        '<div class="rc-macro-chip"><b>' + recipe.protein + 'g</b> P</div>' +
        '<div class="rc-macro-chip"><b>' + recipe.carbs   + 'g</b> C</div>' +
        '<div class="rc-macro-chip"><b>' + recipe.fats    + 'g</b> F</div>' +
      '</div>' +
      '<div class="recipe-card-footer">' +
        '<div class="recipe-kcal">' + recipe.kcal + '<small> kcal</small></div>' +
        '<div class="recipe-cost">₱' + recipe.cost + '</div>' +
        '<div class="recipe-card-view-btn">View recipe →</div>' +
      '</div>' +
    '</div>';

  card.addEventListener('click', function () { openModal(recipe.id); });
  return card;
}

/* ============================================================
   MODAL — OPEN
   ============================================================ */
function openModal(id) {
  const recipe  = RECIPES.find(function (r) { return r.id === id; });
  if (!recipe) return;
  openRecipeId = id;

  const overlay = document.getElementById('recipe-modal-overlay');
  const body    = document.getElementById('recipe-modal-body');

  /* Macro bar max for scaling */
  const macroMax = Math.max(recipe.protein, recipe.carbs, recipe.fats);

  /* Build ingredients HTML */
  const ingsHTML = recipe.ingredients.map(function (ing) {
    return '<div class="modal-ingredient-row">' +
      '<div class="modal-ing-dot"></div>' +
      '<span class="modal-ing-name">' + ing.name + '</span>' +
      '<span class="modal-ing-qty">' + ing.qty + '</span>' +
      '<span class="modal-ing-status ' + ing.status + '">' +
        (ing.status === 'avail' ? '✓' : '⚠') +
      '</span>' +
    '</div>';
  }).join('');

  /* Build steps HTML */
  const stepsHTML = recipe.steps.map(function (step, i) {
    const timerEl = step.timer
      ? '<div class="modal-step-timer">⏱ ' + formatTimer(step.timer) + '</div>'
      : '';
    return '<div class="modal-step">' +
      '<div class="modal-step-num">' + (i + 1) + '</div>' +
      '<div class="modal-step-content">' +
        '<div class="modal-step-title">' + step.title + '</div>' +
        '<div class="modal-step-desc">'  + step.desc  + '</div>' +
        timerEl +
      '</div>' +
    '</div>';
  }).join('');

  /* Difficulty color */
  const diffColor = { easy: '#2ddc7a', medium: '#fbbf24', hard: '#f87171' };
  const dc = diffColor[recipe.difficulty] || '#2ddc7a';

  body.innerHTML =
    /* Banner */
    '<button class="recipe-modal-close" id="recipe-modal-close">✕</button>' +
    '<div class="modal-banner">' + recipe.emoji + '</div>' +

    '<div class="modal-body">' +
      '<div class="modal-recipe-title">' + recipe.name + '</div>' +

      '<div class="modal-meta-row">' +
        '<div class="modal-meta-chip">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>' +
          recipe.cookTime + ' min' +
        '</div>' +
        '<div class="modal-meta-chip">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>' +
          recipe.servings + (recipe.servings === 1 ? ' serving' : ' servings') +
        '</div>' +
        '<div class="modal-meta-chip">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>' +
          '<span style="color:' + dc + ';font-weight:600;">' +
            recipe.difficulty.charAt(0).toUpperCase() + recipe.difficulty.slice(1) +
          '</span>' +
        '</div>' +
        '<div class="modal-meta-chip" style="color:#2ddc7a;">' + recipe.type + '</div>' +
      '</div>' +

      /* Stats */
      '<div class="modal-stats-row">' +
        '<div class="modal-stat">' +
          '<span class="modal-stat-value">' + recipe.kcal + '</span>' +
          '<span class="modal-stat-label">Calories</span>' +
        '</div>' +
        '<div class="modal-stat">' +
          '<span class="modal-stat-value yellow">₱' + recipe.cost + '</span>' +
          '<span class="modal-stat-label">Est. Cost</span>' +
        '</div>' +
        '<div class="modal-stat">' +
          '<span class="modal-stat-value">' + recipe.protein + 'g</span>' +
          '<span class="modal-stat-label">Protein</span>' +
        '</div>' +
        '<div class="modal-stat">' +
          '<span class="modal-stat-value blue">' + recipe.carbs + 'g</span>' +
          '<span class="modal-stat-label">Carbs</span>' +
        '</div>' +
      '</div>' +

      /* Macro breakdown bars */
      '<div class="modal-section-title">Macros</div>' +
      '<div class="modal-macro-bars">' +
        buildMacroBar('Protein', recipe.protein, macroMax, '#2ddc7a') +
        buildMacroBar('Carbs',   recipe.carbs,   macroMax, '#60a5fa') +
        buildMacroBar('Fats',    recipe.fats,    macroMax, '#fbbf24') +
      '</div>' +

      /* Ingredients */
      '<div class="modal-section-title" style="margin-top:22px;">Ingredients</div>' +
      '<div class="modal-ingredients">' + ingsHTML + '</div>' +

      /* Steps */
      '<div class="modal-section-title">How to Cook</div>' +
      '<div class="modal-steps">' + stepsHTML + '</div>' +

      /* Actions */
      '<div class="modal-actions">' +
        '<button class="rp-btn rp-btn-outline" onclick="closeModal()">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>' +
          'Back' +
        '</button>' +
        '<button class="rp-btn rp-btn-primary" onclick="addToMealPlan(\'' + recipe.id + '\')">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>' +
          'Add to Meal Plan' +
        '</button>' +
      '</div>' +
    '</div>';

  /* Re-bind close button since body was rebuilt */
  document.getElementById('recipe-modal-close').addEventListener('click', closeModal);

  overlay.classList.add('active');
  document.body.style.overflow = 'hidden';

  /* Animate macro bars after render */
  setTimeout(function () {
    body.querySelectorAll('.modal-macro-bar-fill').forEach(function (bar) {
      bar.style.width = bar.getAttribute('data-w');
    });
  }, 80);
}

/* ============================================================
   MODAL — CLOSE
   ============================================================ */
function closeModal() {
  document.getElementById('recipe-modal-overlay').classList.remove('active');
  document.body.style.overflow = '';
  openRecipeId = null;
}

/* ============================================================
   ADD TO MEAL PLAN
   ============================================================ */
function addToMealPlan(id) {
  /* TODO: integrate with mealplan.js state via Supabase */
  closeModal();
  window.location.href = 'mealplan.html';
}

/* ============================================================
   HELPERS
   ============================================================ */
function buildMacroBar(label, value, max, color) {
  const pct = Math.round((value / max) * 100);
  return '<div class="modal-macro-bar-row">' +
    '<span class="modal-macro-bar-label">' + label + '</span>' +
    '<div class="modal-macro-bar-bg">' +
      '<div class="modal-macro-bar-fill" style="width:0;background:' + color + ';" data-w="' + pct + '%"></div>' +
    '</div>' +
    '<span class="modal-macro-bar-val">' + value + 'g</span>' +
  '</div>';
}

function formatTimer(seconds) {
  if (seconds < 60) return seconds + 's';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m + 'min' + (s ? ' ' + s + 's' : '');
}
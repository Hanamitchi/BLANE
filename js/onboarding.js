/* ============================================================
   BLANE — onboarding Module
   Collects user profile and saves to Supabase `profiles` table.
   Depends on: supabase-config.js, auth.js
   ============================================================ */

const TOTAL_STEPS = 4;
let   currentStep = 1;

const STEPS = [
  { label: 'Basic Info'           },
  { label: 'Health Goals'         },
  { label: 'Dietary Restrictions' },
  { label: 'Medical Conditions'   },
];

/* ============================================================
   INIT
   ============================================================ */
document.addEventListener('DOMContentLoaded', async function () {

  const session = await guardOnboarding();
  if (!session) return;

  /* Pre-fill name from auth metadata */
  const meta = session.user.user_metadata;
  if (meta && meta.full_name) {
    const f = document.getElementById('ob-name');
    if (f && !f.value) f.value = meta.full_name;
  }

  renderStep(currentStep);

  /* Goal card toggle */
  document.querySelectorAll('.goal-card').forEach(function (card) {
    card.addEventListener('click', function () {
      document.querySelectorAll('.goal-card').forEach(function (c) { c.classList.remove('selected'); });
      card.classList.add('selected');
    });
  });

  /* Tag pill toggle */
  document.querySelectorAll('.tag-pill').forEach(function (pill) {
    pill.addEventListener('click', function () { pill.classList.toggle('selected'); });
  });

  document.getElementById('btn-back').addEventListener('click', goBack);
  document.getElementById('btn-next').addEventListener('click', goNext);
});


/* ============================================================
   NAVIGATION
   ============================================================ */
function renderStep(step) {
  document.querySelectorAll('.onboard-step').forEach(function (el) { el.classList.remove('active'); });
  document.getElementById('step-' + step).classList.add('active');

  const pct = Math.round(((step - 1) / TOTAL_STEPS) * 100);
  document.getElementById('progress-fill').style.width = pct + '%';
  document.getElementById('progress-text').textContent = 'Step ' + step + ' of ' + TOTAL_STEPS;

  document.getElementById('step-label-num').textContent  = step;
  document.getElementById('step-label-name').textContent = STEPS[step - 1].label;

  document.getElementById('btn-back').style.visibility = step === 1 ? 'hidden' : 'visible';
  document.getElementById('btn-next').textContent = step === TOTAL_STEPS ? 'Finish & Save' : 'Continue';

  clearStepError();
}

function goBack()  { if (currentStep > 1) { currentStep--; renderStep(currentStep); } }
function goNext()  { if (validateStep(currentStep)) { if (currentStep < TOTAL_STEPS) { currentStep++; renderStep(currentStep); } else { submitProfile(); } } }


/* ============================================================
   VALIDATION
   ============================================================ */
function validateStep(step) {
  clearStepError();
  if (step === 1) {
    if (!document.getElementById('ob-name').value.trim())   return stepError('Please enter your full name.');
    if (!document.getElementById('ob-age').value)           return stepError('Please enter your age.');
    if (!document.getElementById('ob-sex').value)           return stepError('Please select your biological sex.');
    if (!document.getElementById('ob-height').value)        return stepError('Please enter your height.');
    if (!document.getElementById('ob-weight').value)        return stepError('Please enter your weight.');
  }
  if (step === 2) {
    if (!document.querySelector('.goal-card.selected'))     return stepError('Please select a health goal.');
  }
  return true;
}

function stepError(msg) {
  const el = document.getElementById('step-error');
  el.textContent = msg; el.style.display = 'block'; return false;
}

function clearStepError() {
  const el = document.getElementById('step-error');
  if (el) el.style.display = 'none';
}


/* ============================================================
   COLLECT DATA
   ============================================================ */
function collectData() {
  const dietary = [];
  document.querySelectorAll('#step-3 .tag-pill.selected').forEach(function (p) { dietary.push(p.getAttribute('data-value')); });
  const dietaryOther = document.getElementById('ob-dietary-other').value.trim();
  if (dietaryOther) dietary.push(dietaryOther);

  const medical = [];
  document.querySelectorAll('#step-4 .tag-pill.selected').forEach(function (p) { medical.push(p.getAttribute('data-value')); });
  const medicalOther = document.getElementById('ob-medical-other').value.trim();
  if (medicalOther) medical.push(medicalOther);

  const goalEl = document.querySelector('.goal-card.selected');

  return {
    full_name:            document.getElementById('ob-name').value.trim(),
    age:                  parseInt(document.getElementById('ob-age').value),
    sex:                  document.getElementById('ob-sex').value,
    height_cm:            parseFloat(document.getElementById('ob-height').value),
    weight_kg:            parseFloat(document.getElementById('ob-weight').value),
    goal:                 goalEl ? goalEl.getAttribute('data-goal') : null,
    dietary_restrictions: dietary,
    medical_conditions:   medical,
  };
}


/* ============================================================
   SUBMIT TO SUPABASE
   ============================================================ */
async function submitProfile() {
  document.getElementById('saving-overlay').classList.add('active');

  const { data: { session } } = await _supabase.auth.getSession();
  if (!session) { window.location.href = 'index.html'; return; }

  const pd = collectData();

  const { error } = await _supabase.from('profiles').upsert({
    id:                   session.user.id,
    full_name:            pd.full_name,
    age:                  pd.age,
    sex:                  pd.sex,
    height_cm:            pd.height_cm,
    weight_kg:            pd.weight_kg,
    goal:                 pd.goal,
    dietary_restrictions: pd.dietary_restrictions,
    medical_conditions:   pd.medical_conditions,
    updated_at:           new Date().toISOString(),
  });

  document.getElementById('saving-overlay').classList.remove('active');

  if (error) { stepError('Could not save: ' + error.message); return; }

  window.location.href = REDIRECT_AFTER_ONBOARD;
}
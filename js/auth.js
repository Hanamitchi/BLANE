/* ============================================================
   BLANE — Auth Module (Supabase)
   Depends on: supabase-config.js (loaded before this file)

   ROUTING RULES (simple, no profile query needed):
   ┌──────────────────────────────────────────────────┐
   │  LOGIN    (returning user)  →  dashboard.html    │
   │  REGISTER (new user)        →  onboarding.html   │
   │  Not logged in              →  index.html        │
   └──────────────────────────────────────────────────┘
   ============================================================ */

/* ---- Init Supabase client ---- */
const { createClient } = supabase;
const _supabase = createClient(SUPABASE_URL, SUPABASE_ANON);


/* ============================================================
   FORM HELPERS
   ============================================================ */
function showFormError(formId, message) {
  const form  = document.getElementById(formId);
  let   errEl = form.querySelector('.form-error');
  if (!errEl) {
    errEl = document.createElement('p');
    errEl.className = 'form-error';
    form.prepend(errEl);
  }
  errEl.textContent   = message;
  errEl.style.display = 'block';
}

function clearFormError(formId) {
  const errEl = document.querySelector('#' + formId + ' .form-error');
  if (errEl) errEl.style.display = 'none';
}

function setButtonLoading(btn, loading, defaultText) {
  btn.disabled    = loading;
  btn.textContent = loading ? 'Please wait...' : defaultText;
}


/* ============================================================
   LOGIN — always goes to dashboard.html
   Returning users never touch onboarding again.
   ============================================================ */
async function handleLoginSubmit() {
  const email    = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const btn      = document.querySelector('#form-login .form-submit');

  clearFormError('form-login');

  if (!email || !password) {
    showFormError('form-login', 'Please fill in all fields.');
    return;
  }

  setButtonLoading(btn, true, 'Sign in');

  const { data, error } = await _supabase.auth.signInWithPassword({ email, password });

  setButtonLoading(btn, false, 'Sign in');

  if (error) {
    showFormError('form-login', error.message);
    return;
  }

  /* Old user login — always straight to dashboard, no profile check */
  window.location.href = REDIRECT_AFTER_LOGIN;
}


/* ============================================================
   REGISTER — always goes to onboarding.html
   New users always need to fill in their profile first.
   ============================================================ */
async function handleRegisterSubmit() {
  const name     = document.getElementById('reg-name').value.trim();
  const email    = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-password').value;
  const confirm  = document.getElementById('reg-confirm').value;
  const btn      = document.querySelector('#form-register .form-submit');

  clearFormError('form-register');

  if (!name || !email || !password || !confirm) {
    showFormError('form-register', 'Please fill in all fields.');
    return;
  }
  if (password !== confirm) {
    showFormError('form-register', 'Passwords do not match.');
    return;
  }
  if (password.length < 6) {
    showFormError('form-register', 'Password must be at least 6 characters.');
    return;
  }

  setButtonLoading(btn, true, 'Create account');

  const { data, error } = await _supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: name } },
  });

  setButtonLoading(btn, false, 'Create account');

  if (error) {
    showFormError('form-register', error.message);
    return;
  }

  /* Email already registered */
  if (data.user && data.user.identities && data.user.identities.length === 0) {
    showFormError('form-register', 'An account with this email already exists.');
    return;
  }

  if (data.session) {
    /* Email confirmation OFF — new user goes to onboarding */
    window.location.href = REDIRECT_AFTER_REGISTER;
  } else {
    /* Email confirmation ON — show verify message */
    document.getElementById('form-register').innerHTML =
      '<div class="auth-success">' +
        '<div class="auth-success-icon">&#x2709;&#xFE0F;</div>' +
        '<h3>Check your email</h3>' +
        '<p>We sent a confirmation link to <strong>' + email + '</strong>.<br>' +
           'Click it to activate your account, then sign in.</p>' +
        '<button class="btn btn-outline" onclick="document.getElementById(\'tab-login\').click()">' +
          'Back to Sign in' +
        '</button>' +
      '</div>';
  }
}


/* ============================================================
   LOGOUT
   ============================================================ */
async function handleLogout() {
  await _supabase.auth.signOut();
  window.location.href = 'index.html';
}


/* ============================================================
   SESSION GUARD — for protected pages (dashboard, mealplan…)
   Only checks if user is logged in.
   Not logged in → index.html
   Logged in     → stay, return session
   ============================================================ */
async function guardPage() {
  const { data: { session } } = await _supabase.auth.getSession();
  if (!session) {
    window.location.href = 'index.html';
    return null;
  }
  return session;
}


/* ============================================================
   onboarding GUARD — for onboarding.html only
   Not logged in → index.html
   Logged in     → stay, return session
   (Returning users can still visit to edit their profile)
   ============================================================ */
async function guardOnboarding() {
  const { data: { session } } = await _supabase.auth.getSession();
  if (!session) {
    window.location.href = 'index.html';
    return null;
  }
  return session;
}


/* ============================================================
   INDEX GUARD — call on index.html
   Logged-in users skip the landing page entirely.
   Always sends to dashboard — no profile check.
   ============================================================ */
async function redirectIfLoggedIn() {
  const { data: { session } } = await _supabase.auth.getSession();
  if (!session) return;
  window.location.href = REDIRECT_AFTER_LOGIN;
}
/* ============================================================
   BLANE — Auth Module (Supabase)
   Handles: Login, Register, Logout, Session guard
   Depends on: supabase-config.js (loaded before this file)
   ============================================================ */

/* ---------- Init Supabase client ---------- */
const { createClient } = supabase;
const _supabase = createClient(SUPABASE_URL, SUPABASE_ANON);


/* ============================================================
   HELPERS
   ============================================================ */

function showFormError(formId, message) {
  const form    = document.getElementById(formId);
  let   errEl   = form.querySelector('.form-error');
  if (!errEl) {
    errEl = document.createElement('p');
    errEl.className = 'form-error';
    form.prepend(errEl);
  }
  errEl.textContent = message;
  errEl.style.display = 'block';
}

function clearFormError(formId) {
  const errEl = document.querySelector('#' + formId + ' .form-error');
  if (errEl) errEl.style.display = 'none';
}

function setButtonLoading(btn, loading, defaultText) {
  btn.disabled     = loading;
  btn.textContent  = loading ? 'Please wait…' : defaultText;
}


/* ============================================================
   LOGIN
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

  const { data, error } = await _supabase.auth.signInWithPassword({
    email,
    password,
  });

  setButtonLoading(btn, false, 'Sign in');

  if (error) {
    showFormError('form-login', error.message);
    return;
  }

  /* Success — check if profile exists; if not, send to home */
  const { data: profile } = await _supabase
    .from('profiles')
    .select('id')
    .eq('id', data.user.id)
    .maybeSingle();

  window.location.href = profile ? REDIRECT_AFTER_LOGIN : 'home.html';
}


/* ============================================================
   REGISTER
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
    options: {
      data: { full_name: name },          /* stored in user_metadata */
    },
  });

  setButtonLoading(btn, false, 'Create account');

  if (error) {
    showFormError('form-register', error.message);
    return;
  }

  /* Supabase may require email confirmation — handle both cases */
  if (data.user && data.user.identities && data.user.identities.length === 0) {
    /* Email already registered */
    showFormError('form-register', 'An account with this email already exists.');
    return;
  }

  if (data.session) {
    /* Email confirmation is OFF — user is logged in immediately */
    window.location.href = REDIRECT_AFTER_REGISTER;
  } else {
    /* Email confirmation is ON — show message instead of redirecting */
    const form = document.getElementById('form-register');
    form.innerHTML = `
      <div class="auth-success">
        <div class="auth-success-icon">✉️</div>
        <h3>Check your email</h3>
        <p>We sent a confirmation link to <strong>${email}</strong>.<br>
           Click it to activate your account, then sign in.</p>
        <button class="btn btn-outline" onclick="document.getElementById('tab-login').click()">
          Back to Sign in
        </button>
      </div>
    `;
  }
}


/* ============================================================
   LOGOUT  (call this from dashboard/other pages)
   ============================================================ */
async function handleLogout() {
  await _supabase.auth.signOut();
  window.location.href = 'index.html';
}


/* ============================================================
   SESSION GUARD
   Use on protected pages (dashboard.html, etc.)
   Call: guardPage() at the top of the page script.
   Redirects to index.html if no active session.
   ============================================================ */
async function guardPage() {
  const { data: { session } } = await _supabase.auth.getSession();
  if (!session) {
    window.location.href = 'index.html';
  }
  return session;
}


/* ============================================================
   REDIRECT LOGGED-IN USERS AWAY FROM INDEX
   Call: redirectIfLoggedIn() on index.html
   So logged-in users don't see the landing page.
   ============================================================ */
async function redirectIfLoggedIn() {
  const { data: { session } } = await _supabase.auth.getSession();
  if (session) {
    window.location.href = REDIRECT_AFTER_LOGIN;
  }
}
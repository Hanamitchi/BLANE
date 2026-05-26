/*  1. NAVBAR — scroll effect & hamburger */
  const navbar    = document.getElementById('navbar');
  const hamburger = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobile-menu');

  window.addEventListener('scroll', function () {
    if (window.scrollY > 40) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  });

  hamburger.addEventListener('click', function () {
    hamburger.classList.toggle('active');
    mobileMenu.classList.toggle('open');
  });

  /* Close mobile menu on link click */
  mobileMenu.querySelectorAll('a').forEach(function (link) {
    link.addEventListener('click', function () {
      hamburger.classList.remove('active');
      mobileMenu.classList.remove('open');
    });
  });


  /*  2. MODAL — login / register */
  const modalOverlay  = document.getElementById('modal-overlay');
  const modalCloseBtn = document.getElementById('modal-close');
  const tabLogin      = document.getElementById('tab-login');
  const tabRegister   = document.getElementById('tab-register');
  const formLogin     = document.getElementById('form-login');
  const formRegister  = document.getElementById('form-register');

  /* Open modal helpers */
  function openModal(tab) {
    modalOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
    switchTab(tab);
  }

  /* Close modal */
  function closeModal() {
    modalOverlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  /* Switch between Login / Register tabs */
  function switchTab(tab) {
    if (tab === 'login') {
      tabLogin.classList.add('active');
      tabRegister.classList.remove('active');
      formLogin.style.display    = 'block';
      formRegister.style.display = 'none';
    } else {
      tabRegister.classList.add('active');
      tabLogin.classList.remove('active');
      formRegister.style.display = 'block';
      formLogin.style.display    = 'none';
    }
  }

  /* Bind open triggers — login */
  document.querySelectorAll('[data-modal="login"]').forEach(function (el) {
    el.addEventListener('click', function (e) {
      e.preventDefault();
      openModal('login');
    });
  });

  /* Bind open triggers — register */
  document.querySelectorAll('[data-modal="register"]').forEach(function (el) {
    el.addEventListener('click', function (e) {
      e.preventDefault();
      openModal('register');
    });
  });

  /* Tab toggle */
  tabLogin.addEventListener('click', function () { switchTab('login'); });
  tabRegister.addEventListener('click', function () { switchTab('register'); });

  /* Close */
  modalCloseBtn.addEventListener('click', closeModal);
  modalOverlay.addEventListener('click', function (e) {
    if (e.target === modalOverlay) closeModal();
  });

  /* ESC key closes modal */
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeModal();
  });

  /* ----------------------------------------------------------
     SUPABASE — replace the two values below with your own
  ---------------------------------------------------------- */
  const SUPABASE_URL  = 'https://jszolfwdnqxhppphzvhj.supabase.co';   // e.g. https://xxxx.supabase.co
  const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impzem9sZndkbnF4aHBwcGh6dmhqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4MDc3MTEsImV4cCI6MjA5NTM4MzcxMX0.RrL-Ou-MJ66wErLmxH76GM-TgZLk0SZ4CIJEsTHQIu4';

  const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON);

  /* ---- helper: show inline message inside a form ---- */
  function showFormMsg(form, message, isError) {
    let msgEl = form.querySelector('.form-msg');
    if (!msgEl) {
      msgEl = document.createElement('p');
      msgEl.className = 'form-msg';
      form.querySelector('.form-submit').insertAdjacentElement('afterend', msgEl);
    }
    msgEl.textContent = message;
    msgEl.style.cssText = [
      'font-size:13px',
      'text-align:center',
      'margin-top:10px',
      'padding:8px 12px',
      'border-radius:8px',
      isError
        ? 'color:#ff6b6b;background:rgba(255,107,107,0.1);border:1px solid rgba(255,107,107,0.25)'
        : 'color:#2ddc7a;background:rgba(45,220,122,0.1);border:1px solid rgba(45,220,122,0.25)'
    ].join(';');
  }

  /* ---- REGISTER ---- */
  formRegister.addEventListener('submit', async function (e) {
    e.preventDefault();

    const name     = document.getElementById('reg-name').value.trim();
    const email    = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;
    const confirm  = document.getElementById('reg-confirm').value;
    const btn      = formRegister.querySelector('.form-submit');

    /* client-side validation */
    if (password !== confirm) {
      showFormMsg(formRegister, 'Passwords do not match.', true);
      return;
    }
    if (password.length < 6) {
      showFormMsg(formRegister, 'Password must be at least 6 characters.', true);
      return;
    }

    btn.textContent = 'Creating account…';
    btn.disabled    = true;

    const { error } = await _supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } }
    });

    btn.textContent = 'Create account';
    btn.disabled    = false;

    if (error) {
      showFormMsg(formRegister, error.message, true);
      return;
    }

    /* Success — clear the register form then switch to login tab */
    formRegister.reset();
    switchTab('login');
    showFormMsg(
      formLogin,
      '✓ Account created! Check your email to confirm, then sign in.',
      false
    );
  });

  /* ---- LOGIN ---- */
  formLogin.addEventListener('submit', async function (e) {
    e.preventDefault();

    const email    = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const btn      = formLogin.querySelector('.form-submit');

    btn.textContent = 'Signing in…';
    btn.disabled    = true;

    const { error } = await _supabase.auth.signInWithPassword({ email, password });

    btn.textContent = 'Sign in';
    btn.disabled    = false;

    if (error) {
      showFormMsg(formLogin, error.message, true);
      return;
    }

    /* Redirect to the app after successful login */
    window.location.href = 'home.html';
  });

  /* ---- switch-to-register link inside login form ---- */
  const switchToRegister = document.getElementById('switch-to-register');
  if (switchToRegister) {
    switchToRegister.addEventListener('click', function (e) {
      e.preventDefault();
      switchTab('register');
    });
  }


  /* ----------------------------------------------------------
     3. SCROLL REVEAL — animate elements on scroll
  ---------------------------------------------------------- */
  const revealEls = document.querySelectorAll('.reveal');

  function checkReveal() {
    const windowH = window.innerHeight;
    revealEls.forEach(function (el) {
      const rect = el.getBoundingClientRect();
      if (rect.top < windowH - 60) {
        el.classList.add('visible');
      }
    });
  }

  window.addEventListener('scroll', checkReveal, { passive: true });
  checkReveal(); /* run once on load */


  /* ----------------------------------------------------------
     4. MACRO BARS — animate progress bars on load
  ---------------------------------------------------------- */
  const macroBars = document.querySelectorAll('.macro-bar-fill');
  setTimeout(function () {
    macroBars.forEach(function (bar) {
      const target = bar.getAttribute('data-width');
      bar.style.width = target;
    });
  }, 600);


  /* ----------------------------------------------------------
     5. SMOOTH SCROLL — anchor links
  ---------------------------------------------------------- */
  document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener('click', function (e) {
      const targetId = this.getAttribute('href');
      if (targetId === '#') return;
      const target = document.querySelector(targetId);
      if (target) {
        e.preventDefault();
        const offset = 80;
        const top = target.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top: top, behavior: 'smooth' });
      }
    });
  });
  

/* eto yung sa footer modal */
  function openFeedbackModal() {
  document.getElementById("feedbackModal").style.display = "block";
}

function closeFeedbackModal() {
  document.getElementById("feedbackModal").style.display = "none";
}

function openQuestionModal() {
  document.getElementById("questionModal").style.display = "block";
}

function closeQuestionModal() {
  document.getElementById("questionModal").style.display = "none";
}

// close when clicking outside modal
window.onclick = function(event) {
  const feedback = document.getElementById("feedbackModal");
  const question = document.getElementById("questionModal");

  if (event.target === feedback) feedback.style.display = "none";
  if (event.target === question) question.style.display = "none";
};

/* eto yung sa privacy and terms sa regisration modal */
function openTermsModal(event) {
  event.preventDefault();
  document.getElementById("termsModal").style.display = "block";
}

function closeTermsModal() {
  document.getElementById("termsModal").style.display = "none";
}

function openPrivacyModal(event) {
  event.preventDefault();
  document.getElementById("privacyModal").style.display = "block";
}

function closePrivacyModal() {
  document.getElementById("privacyModal").style.display = "none";
}

// close when clicking outside modal
window.onclick = function(event) {
  const terms = document.getElementById("termsModal");
  const privacy = document.getElementById("privacyModal");

  if (event.target === terms) terms.style.display = "none";
  if (event.target === privacy) privacy.style.display = "none";
};
/* ============================================================
   BLANE — Main UI Script (index.html only)
   Handles: navbar, modal UI, scroll reveal, macro bars,
            smooth scroll, footer modals, terms/privacy modals.
   Auth (login/register) is handled entirely by auth.js.
   ============================================================ */

document.addEventListener('DOMContentLoaded', function () {

  /* ----------------------------------------------------------
     1. NAVBAR — scroll effect & hamburger
  ---------------------------------------------------------- */
  const navbar     = document.getElementById('navbar');
  const hamburger  = document.getElementById('hamburger');
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

  mobileMenu.querySelectorAll('a').forEach(function (link) {
    link.addEventListener('click', function () {
      hamburger.classList.remove('active');
      mobileMenu.classList.remove('open');
    });
  });


  /* ----------------------------------------------------------
     2. MODAL — login / register UI
     NOTE: actual submit logic is in auth.js (handleLoginSubmit,
           handleRegisterSubmit). This block handles open/close
           and tab switching only.
  ---------------------------------------------------------- */
  const modalOverlay  = document.getElementById('modal-overlay');
  const modalCloseBtn = document.getElementById('modal-close');
  const tabLogin      = document.getElementById('tab-login');
  const tabRegister   = document.getElementById('tab-register');
  const formLogin     = document.getElementById('form-login');
  const formRegister  = document.getElementById('form-register');

  function openModal(tab) {
    modalOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
    switchTab(tab);
  }

  function closeModal() {
    modalOverlay.classList.remove('active');
    document.body.style.overflow = '';
  }

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

  document.querySelectorAll('[data-modal="login"]').forEach(function (el) {
    el.addEventListener('click', function (e) { e.preventDefault(); openModal('login'); });
  });

  document.querySelectorAll('[data-modal="register"]').forEach(function (el) {
    el.addEventListener('click', function (e) { e.preventDefault(); openModal('register'); });
  });

  tabLogin.addEventListener('click',    function () { switchTab('login'); });
  tabRegister.addEventListener('click', function () { switchTab('register'); });

  modalCloseBtn.addEventListener('click', closeModal);
  modalOverlay.addEventListener('click', function (e) {
    if (e.target === modalOverlay) closeModal();
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeModal();
  });

  /* Wire form submits to auth.js handlers */
  formLogin.addEventListener('submit', function (e) {
    e.preventDefault();
    handleLoginSubmit();      /* defined in auth.js — goes to dashboard.html */
  });

  formRegister.addEventListener('submit', function (e) {
    e.preventDefault();
    handleRegisterSubmit();   /* defined in auth.js — goes to onboarding.html */
  });

  /* Switch-to-register link */
  const switchToReg = document.getElementById('switch-to-register');
  if (switchToReg) {
    switchToReg.addEventListener('click', function (e) {
      e.preventDefault();
      switchTab('register');
    });
  }

  /* Redirect logged-in users away from landing page */
  redirectIfLoggedIn();   /* defined in auth.js */


  /* ----------------------------------------------------------
     3. SCROLL REVEAL
  ---------------------------------------------------------- */
  const revealEls = document.querySelectorAll('.reveal');

  function checkReveal() {
    const windowH = window.innerHeight;
    revealEls.forEach(function (el) {
      const rect = el.getBoundingClientRect();
      if (rect.top < windowH - 60) el.classList.add('visible');
    });
  }

  window.addEventListener('scroll', checkReveal, { passive: true });
  checkReveal();


  /* ----------------------------------------------------------
     4. MACRO BARS — animate on load
  ---------------------------------------------------------- */
  setTimeout(function () {
    document.querySelectorAll('.macro-bar-fill').forEach(function (bar) {
      bar.style.width = bar.getAttribute('data-width');
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
        const top = target.getBoundingClientRect().top + window.scrollY - 80;
        window.scrollTo({ top: top, behavior: 'smooth' });
      }
    });
  });


  /* ----------------------------------------------------------
     6. FOOTER MODALS
  ---------------------------------------------------------- */
  window.openFeedbackModal = function () {
    const el = document.getElementById('feedbackModal');
    if (el) el.style.display = 'block';
  };
  window.closeFeedbackModal = function () {
    const el = document.getElementById('feedbackModal');
    if (el) el.style.display = 'none';
  };

  window.openQuestionModal = function () {
    const el = document.getElementById('questionModal');
    if (el) el.style.display = 'block';
  };
  window.closeQuestionModal = function () {
    const el = document.getElementById('questionModal');
    if (el) el.style.display = 'none';
  };


  /* ----------------------------------------------------------
     7. TERMS & PRIVACY MODALS
  ---------------------------------------------------------- */
  window.openTermsModal = function (event) {
    if (event) event.preventDefault();
    const el = document.getElementById('termsModal');
    if (el) el.style.display = 'block';
  };
  window.closeTermsModal = function () {
    const el = document.getElementById('termsModal');
    if (el) el.style.display = 'none';
  };

  window.openPrivacyModal = function (event) {
    if (event) event.preventDefault();
    const el = document.getElementById('privacyModal');
    if (el) el.style.display = 'block';
  };
  window.closePrivacyModal = function () {
    const el = document.getElementById('privacyModal');
    if (el) el.style.display = 'none';
  };

  /* Close any modal when clicking outside */
  window.addEventListener('click', function (event) {
    ['feedbackModal','questionModal','termsModal','privacyModal'].forEach(function (id) {
      const el = document.getElementById(id);
      if (el && event.target === el) el.style.display = 'none';
    });
  });

}); /* end DOMContentLoaded */
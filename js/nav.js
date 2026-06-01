/* ============================================================
   BLANE — Shared Navigation JS
   Handles: hamburger toggle, avatar dropdown, greeting name.
   The navbar HTML lives in each page — this file just
   wires up the interactions and fills in user data.
   Depends on: supabase-config.js, auth.js
   ============================================================ */

document.addEventListener('DOMContentLoaded', async function () {

  /* ---- Load user name from Supabase ---- */
  try {
    const { data: { session } } = await _supabase.auth.getSession();
    if (session) {
      const { data: profile } = await _supabase
        .from('profiles')
        .select('full_name')
        .eq('id', session.user.id)
        .maybeSingle();

      const rawName   = (profile && profile.full_name) || session.user.email.split('@')[0];
      const firstName = rawName.split(' ')[0];
      const initial   = firstName.charAt(0).toUpperCase();

      /* Greeting */
      const greetEl = document.getElementById('nav-greeting-name');
      if (greetEl) greetEl.textContent = firstName;

      /* Avatar initial */
      const avatarEl = document.getElementById('nav-avatar-initial');
      if (avatarEl) avatarEl.textContent = initial;

      /* Dropdown name + email */
      const dropName  = document.getElementById('nav-drop-name');
      const dropEmail = document.getElementById('nav-drop-email');
      if (dropName)  dropName.textContent  = rawName;
      if (dropEmail) dropEmail.textContent = session.user.email;
    }
  } catch (e) { /* silent — nav still works without profile data */ }


  /* ---- Avatar dropdown ---- */
  const avatarBtn = document.getElementById('nav-avatar-btn');
  const dropdown  = document.getElementById('nav-dropdown');
  if (avatarBtn && dropdown) {
    avatarBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      dropdown.classList.toggle('open');
    });
    document.addEventListener('click', function () {
      dropdown.classList.remove('open');
    });
    dropdown.addEventListener('click', function (e) {
      e.stopPropagation();
    });
  }


  /* ---- Hamburger / mobile drawer ---- */
  const hamburger = document.getElementById('nav-hamburger');
  const mobileNav = document.getElementById('nav-mobile');
  if (hamburger && mobileNav) {
    hamburger.addEventListener('click', function () {
      mobileNav.classList.toggle('open');
    });
    mobileNav.querySelectorAll('a, button').forEach(function (el) {
      el.addEventListener('click', function () {
        mobileNav.classList.remove('open');
      });
    });
  }

});
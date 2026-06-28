/* ============================================================
   BLANE — Explainable AI (Module 07, Gemini 2.5 Flash Lite)

   When the user clicks "Why?" on a meal card, this calls the
   Supabase Edge Function `explain-meal`, which:
     - looks up cached explanations first
     - otherwise calls Gemini 2.5 Flash Lite with the user's
       real profile + DOST-FNRI nutrient data
     - streams the response back as Server-Sent Events

   This file only renders the popover and the streamed text
   with a typing effect. No local rule-based reasoning remains.

   Depends on: supabase-config.js, auth.js
   ============================================================ */

/* ============================================================
   STATE
   ============================================================ */
let xaiProfile   = null;
let xaiSession   = null;
let xaiPopoverEl = null;
let xaiOverlayEl = null;
let xaiActiveBtn = null;
let xaiAbortCtrl = null;

/* Edge Function URL is derived from SUPABASE_URL in supabase-config.js */
function getExplainMealUrl() {
  return SUPABASE_URL.replace('.supabase.co', '.functions.supabase.co') + '/explain-meal';
}

/* ============================================================
   INIT — called from mealplan DOMContentLoaded
   ============================================================ */
async function initExplainAI(session) {
  xaiSession = session;

  const { data: profile } = await _supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .maybeSingle();

  xaiProfile = profile || {};

  xaiPopoverEl = document.createElement('div');
  xaiPopoverEl.className = 'xai-popover';
  xaiPopoverEl.style.display = 'none';
  document.body.appendChild(xaiPopoverEl);
}

/* ============================================================
   OPEN POPOVER — triggers the Gemini call
   ============================================================ */
async function openXaiPopover(btn, meal) {
  if (xaiActiveBtn === btn && xaiPopoverEl.style.display !== 'none') {
    closeXaiPopover();
    return;
  }

  closeXaiPopover();
  xaiActiveBtn = btn;
  btn.classList.add('active');

  /* Render shell with loading state immediately */
  xaiPopoverEl.innerHTML = buildShellHTML(meal, true);
  xaiPopoverEl.style.display = 'block';
  positionPopover(btn);

  document.body.appendChild(
    (xaiOverlayEl = document.createElement('div'))
  );
  xaiOverlayEl.className = 'xai-overlay';
  xaiOverlayEl.addEventListener('click', closeXaiPopover);
  document.addEventListener('keydown', xaiEscHandler);

  await streamExplanation(meal);
}

/* ============================================================
   CLOSE POPOVER
   ============================================================ */
function closeXaiPopover() {
  if (xaiAbortCtrl) { xaiAbortCtrl.abort(); xaiAbortCtrl = null; }
  if (xaiPopoverEl) xaiPopoverEl.style.display = 'none';
  if (xaiOverlayEl && xaiOverlayEl.parentNode) {
    xaiOverlayEl.parentNode.removeChild(xaiOverlayEl);
    xaiOverlayEl = null;
  }
  if (xaiActiveBtn) {
    xaiActiveBtn.classList.remove('active');
    xaiActiveBtn = null;
  }
  document.removeEventListener('keydown', xaiEscHandler);
}

function xaiEscHandler(e) {
  if (e.key === 'Escape') closeXaiPopover();
}

/* ============================================================
   POPOVER SHELL (header + body container, reused for loading
   and streaming states)
   ============================================================ */
function buildShellHTML(meal, loading) {
  return (
    '<div class="xai-pop-header">' +
      '<div class="xai-pop-header-left">' +
        '<div class="xai-pop-icon">✨</div>' +
        '<div>' +
          '<div class="xai-pop-title">Why Recommended?</div>' +
          '<div class="xai-pop-meal">' + escHtml(meal.name) + '</div>' +
        '</div>' +
      '</div>' +
      '<button class="xai-pop-close" onclick="closeXaiPopover()">✕</button>' +
    '</div>' +
    '<div id="xai-verdict-slot"></div>' +
    '<div class="xai-explanation" id="xai-stream-target">' +
      (loading
        ? '<div class="xai-thinking">' +
            '<span class="xai-dot"></span><span class="xai-dot"></span><span class="xai-dot"></span>' +
            ' Asking BLANE AI…' +
          '</div>'
        : '') +
    '</div>' +
    '<div class="xai-pop-footer">' +
      '<span class="xai-model-badge">✨ Gemini 2.5 Flash Lite</span>' +
      'Grounded in DOST-FNRI data &amp; your profile' +
    '</div>'
  );
}

/* ============================================================
   STREAM EXPLANATION FROM EDGE FUNCTION
   ============================================================ */
async function streamExplanation(meal) {
  const target = document.getElementById('xai-stream-target');
  xaiAbortCtrl = new AbortController();

  try {
    const { data: { session } } = await _supabase.auth.getSession();
    if (!session) throw new Error('Not signed in');

    const res = await fetch(getExplainMealUrl(), {
      method: 'POST',
      signal: xaiAbortCtrl.signal,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + session.access_token,
      },
      body: JSON.stringify({
        mealId:  meal.id,
        meal:    meal,
        profile: xaiProfile,
      }),
    });

    if (!res.ok || !res.body) {
      throw new Error('AI service returned an error.');
    }

    /* Clear the "Asking BLANE AI..." indicator on first chunk */
    let firstChunk = true;
    const reader  = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const jsonStr = line.slice(6).trim();
        if (!jsonStr) continue;

        let parsed;
        try { parsed = JSON.parse(jsonStr); } catch (_e) { continue; }

        if (parsed.error) {
          target.innerHTML = '<div class="xai-error">⚠️ ' + escHtml(parsed.error) + '</div>';
          return;
        }

        if (parsed.verdict) {
          renderVerdictBadge(parsed.verdict, parsed.verdict_label, parsed.flagged_condition);
        }

        if (parsed.text) {
          if (firstChunk) {
            target.innerHTML = '<span class="xai-stream-text"></span><span class="xai-cursor"></span>';
            firstChunk = false;
          }
          appendStreamedText(target, parsed.text);
        }

        if (parsed.done) {
          const cursor = target.querySelector('.xai-cursor');
          if (cursor) cursor.remove();
        }
      }
    }

    if (firstChunk) {
      /* No text ever arrived */
      target.innerHTML = '<div class="xai-error">BLANE AI could not generate an explanation right now. Please try again.</div>';
    }

  } catch (err) {
    if (err.name === 'AbortError') return; /* popover was closed mid-stream */
    console.error('Explain AI error:', err);
    target.innerHTML = '<div class="xai-error">⚠️ Could not reach BLANE AI. Check your connection and try again.</div>';
  }
}

/* Append text smoothly to the streaming span */
function appendStreamedText(target, text) {
  const span = target.querySelector('.xai-stream-text');
  if (span) span.textContent += text;

  /* Reposition popover in case content grew past viewport */
  if (xaiActiveBtn) positionPopover(xaiActiveBtn);
}

/* ============================================================
   VERDICT BADGE — Safe / Caution / Avoid
   ============================================================ */
function renderVerdictBadge(verdict, label, flaggedCondition) {
  const slot = document.getElementById('xai-verdict-slot');
  if (!slot) return;

  const icons = { safe: '✅', caution: '⚠️', avoid: '🚫' };
  const icon  = icons[verdict] || '✅';

  let flagHTML = '';
  if (verdict === 'avoid' && flaggedCondition) {
    flagHTML = '<div class="xai-flagged-note">' + escHtml(flaggedCondition) + '</div>';
  }

  slot.innerHTML =
    '<div class="xai-verdict-badge xai-verdict-' + verdict + '">' +
      '<span class="xai-verdict-icon">' + icon + '</span>' +
      '<span class="xai-verdict-label">' + escHtml(label) + '</span>' +
    '</div>' +
    flagHTML;

  if (xaiActiveBtn) positionPopover(xaiActiveBtn);
}

/* ============================================================
   POSITION POPOVER
   ============================================================ */
function positionPopover(btn) {
  const btnRect = btn.getBoundingClientRect();
  const popW    = 320;
  const popH    = xaiPopoverEl.offsetHeight || 220;
  const vpW     = window.innerWidth;
  const vpH     = window.innerHeight;
  const margin  = 8;

  let left = btnRect.left;
  if (left + popW > vpW - margin) left = vpW - popW - margin;
  if (left < margin) left = margin;

  let top = btnRect.bottom + 10;
  if (top + popH > vpH - margin) {
    top = Math.max(margin, btnRect.top - popH - 10);
    xaiPopoverEl.classList.add('arrow-bottom');
  } else {
    xaiPopoverEl.classList.remove('arrow-bottom');
  }

  xaiPopoverEl.style.left = left + 'px';
  xaiPopoverEl.style.top  = top  + 'px';
}

/* ============================================================
   HELPERS
   ============================================================ */
function escHtml(str) {
  return String(str).replace(/[&<>"']/g, function (c) {
    return { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c];
  });
}
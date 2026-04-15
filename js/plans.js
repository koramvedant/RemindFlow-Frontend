// js/plans.js
// CHANGES: Reads countryCode from localStorage (set during onboarding/settings).
//          Displays correct currency pricing per region.
//          Stores plan + countryCode to localStorage for payment.js to use.

import { getLocale } from './localeConfig.js';

document.addEventListener('DOMContentLoaded', () => {
  const buttons = document.querySelectorAll('.choose-btn');
  if (!buttons.length) { console.warn('No plan buttons found'); return; }

  /* ── Read active locale ─────────────────────────── */
  const countryCode = localStorage.getItem('countryCode') || 'IN';
  const lc          = getLocale(countryCode);

  /* ── Render prices ───────────────────────────────── */
  const starterEl = document.getElementById('starterPrice');
  const growthEl  = document.getElementById('growthPrice');
  const proEl     = document.getElementById('proPrice');

  if (starterEl) starterEl.textContent = lc.plans.starter.display;
  if (growthEl)  growthEl.textContent  = lc.plans.growth.display;
  if (proEl)     proEl.textContent     = lc.plans.pro.display;

  /* ── Subtitle messaging ─────────────────────────── */
  const expired     = window.__PLAN_EXPIRED__;
  const planEnd     = window.__USER_PLAN__?.plan_end;
  const subtitle    = document.querySelector('#planSubtitle');

  if (expired && subtitle) {
    subtitle.textContent    = 'Your plan has expired. Renew now to restore access.';
    subtitle.style.color    = '#f87171';
    subtitle.style.fontWeight = '600';
  } else if (subtitle && planEnd) {
    const date = new Date(planEnd).toLocaleDateString();
    subtitle.textContent = `Your current plan expires on ${date}. Renewing now will stack and activate after expiry.`;
  }

  /* ── Plan selection ──────────────────────────────── */
  buttons.forEach(btn => {
    const plan = btn.dataset.plan;

    if (plan === 'connector') {
      btn.disabled = true;
      btn.style.opacity = '0.5';
      btn.style.cursor  = 'not-allowed';
      return;
    }

    btn.addEventListener('click', e => {
      e.preventDefault();
      if (!plan) { console.error('Plan type missing on button'); return; }

      // Store plan + currency for payment.js
      localStorage.setItem('selectedPlan',     plan);
      localStorage.setItem('selectedCurrency', lc.currency);
      localStorage.setItem('planAmount',       lc.plans[plan]?.amount || 0);

      window.location.href = '/payment.html';
    });
  });
});
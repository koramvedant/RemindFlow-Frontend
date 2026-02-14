console.log('✅ plans.js loaded');

document.addEventListener('DOMContentLoaded', () => {
  const buttons = document.querySelectorAll('.choose-btn');

  if (!buttons.length) {
    console.warn('No plan buttons found');
    return;
  }

  const expired = window.__PLAN_EXPIRED__;
  const currentPlan = window.__USER_PLAN__?.plan_code;
  const planEnd = window.__USER_PLAN__?.plan_end;

  const subtitle = document.querySelector('.subtitle');

  /* -------------------------
     Update Subtitle Messaging
  ------------------------- */

  if (expired) {
    if (subtitle) {
      subtitle.textContent =
        'Your plan has expired. Renew now to restore access.';
      subtitle.style.color = '#b00020';
      subtitle.style.fontWeight = '600';
    }
  } else {
    if (subtitle && planEnd) {
      const date = new Date(planEnd).toLocaleDateString();
      subtitle.textContent =
        `Your current plan expires on ${date}. Renewing now will stack and activate after expiry.`;
    }
  }

  /* -------------------------
     Plan Selection
  ------------------------- */

  buttons.forEach((btn) => {
    const plan = btn.dataset.plan;

    btn.addEventListener('click', (e) => {
      e.preventDefault();

      if (!plan) {
        console.error('Plan type missing on button');
        return;
      }

      // Store renewal plan
      localStorage.setItem('selectedPlan', plan);

      // Always redirect to payment
      window.location.href = '/payment.html';
    });
  });
});

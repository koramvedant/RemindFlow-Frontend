// /public/js/plans.js

console.log('✅ plans.js loaded');

document.addEventListener('DOMContentLoaded', () => {
  const buttons = document.querySelectorAll('.choose-btn');

  if (!buttons.length) {
    console.warn('No plan buttons found');
    return;
  }

  buttons.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();

      const plan = btn.dataset.plan;

      if (!plan) {
        console.error('Plan type missing on button');
        return;
      }

      // Store selected plan for payment page
      localStorage.setItem('selectedPlan', plan);

      // Redirect directly to payment page
      window.location.href = '/payment.html';
    });
  });
});

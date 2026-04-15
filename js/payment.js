// js/payment.js
// CHANGES: Reads currency from localStorage (set by plans.js).
//          Passes correct currency to backend order creation.

import { API_BASE } from './api.js';
import { getLocale } from './localeConfig.js';

/* ── DOM ─────────────────────────────────────────────── */
const payBtn        = document.getElementById('payBtn');
const amountDisplay = document.getElementById('amountDisplay');
const planDisplay   = document.getElementById('planDisplay');
const currencyDisplay = document.getElementById('currencyDisplay');

/* ── Read locale ─────────────────────────────────────── */
const countryCode = localStorage.getItem('countryCode') || 'IN';
const lc          = getLocale(countryCode);

/* ── Plan config ─────────────────────────────────────── */
const PLAN_NAMES = {
  starter:   'Starter',
  growth:    'Growth',
  pro:       'Pro',
  connector: 'Connector',
};

const planCode = localStorage.getItem('selectedPlan');
const currency = localStorage.getItem('selectedCurrency') || lc.currency;

if (!planCode || !lc.plans[planCode]) {
  alert('Please select a plan first.');
  window.location.replace('/plans.html');
  throw new Error('Invalid or missing plan selection');
}

const plan    = lc.plans[planCode];
const planName = PLAN_NAMES[planCode] || planCode;

/* ── Render plan info ────────────────────────────────── */
if (amountDisplay) amountDisplay.textContent  = plan.display;
if (planDisplay)   planDisplay.textContent    = planName;
if (currencyDisplay) currencyDisplay.textContent = currency;

/* ── Auth helper ─────────────────────────────────────── */
function getToken() {
  return localStorage.getItem('accessToken') ||
    document.cookie.match(/(^|;)\s*accessToken=([^;]+)/)?.[2] || null;
}

/* ── Toast ───────────────────────────────────────────── */
function showToast(message, duration = 2200) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 300); }, duration);
}

/* ── Pay handler ─────────────────────────────────────── */
payBtn?.addEventListener('click', async () => {
  try {
    const token = getToken();
    if (!token) {
      showToast('Session expired. Please login again.');
      localStorage.clear();
      window.location.replace('/login.html');
      return;
    }

    /* Create order — pass currency so backend charges correctly */
    const res = await fetch(`${API_BASE}/api/payments/create-order`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body:    JSON.stringify({
        plan_code: planCode,
        currency,                    // ← send user's currency to backend
        country_code: countryCode,
      }),
    });

    const order = await res.json();
    if (!res.ok) throw new Error(order.message || 'Order creation failed');

    /* Razorpay checkout */
    const options = {
      key:         window.RAZORPAY_KEY_ID,
      amount:      order.amount,
      currency:    order.currency || currency,
      name:        'RemindFlow',
      description: `${planName} Subscription`,
      order_id:    order.order_id || order.id,

      handler: () => {
        showToast('Payment successful! Redirecting...');
        localStorage.removeItem('selectedPlan');
        localStorage.removeItem('selectedCurrency');
        localStorage.removeItem('planAmount');
        setTimeout(() => window.location.replace('/dashboard.html'), 1200);
      },

      prefill: {
        // Razorpay supports prefill for smoother checkout
      },

      theme: { color: '#1cc7ae' },
    };

    const rzp = new Razorpay(options);
    rzp.open();

  } catch (err) {
    console.error('❌ Payment error:', err);
    showToast(err.message || 'Payment failed. Please try again.');
  }
});
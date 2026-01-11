// /public/js/payment.js

/* -------------------------
   DOM Elements
------------------------- */
const payBtn = document.getElementById('payBtn');
const amountDisplay = document.getElementById('amountDisplay');
const planDisplay = document.getElementById('planDisplay');

/* -------------------------
   Plan Configuration (UI only)
------------------------- */
const PLAN_CONFIG = {
  starter:   { name: 'Starter',   amount: 499,  type: 'full' },
  growth:    { name: 'Growth',    amount: 999,  type: 'full' },
  pro:       { name: 'Pro',       amount: 1999, type: 'full' },
  connector: { name: 'Connector', amount: 399,  type: 'integrated' },
};

/* -------------------------
   JWT Helper (ROBUST)
------------------------- */
function getToken() {
  // 1️⃣ Primary — localStorage
  const lsToken = localStorage.getItem('accessToken');
  if (lsToken) return lsToken;

  // 2️⃣ Fallback — cookie (legacy safety)
  const match = document.cookie.match(/(^|;)\s*accessToken=([^;]+)/);
  if (match) return match[2];

  return null;
}

/* -------------------------
   Resolve Selected Plan
------------------------- */
const planCode = localStorage.getItem('selectedPlan');

if (!planCode || !PLAN_CONFIG[planCode]) {
  alert('Please select a plan first.');
  window.location.replace('/plans.html');
  throw new Error('Invalid or missing plan selection');
}

const plan = PLAN_CONFIG[planCode];

/* -------------------------
   Render Plan Info
------------------------- */
if (amountDisplay) amountDisplay.textContent = plan.amount;
if (planDisplay) planDisplay.textContent = plan.name;

/* -------------------------
   Toast Utility
------------------------- */
function showToast(message, duration = 2200) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

/* -------------------------
   Pay Button Handler
------------------------- */
payBtn?.addEventListener('click', async () => {
  try {
    const token = getToken();

    // 🔴 HARD FAIL — no token
    if (!token) {
      showToast('Session expired. Please login again.');
      localStorage.clear();
      window.location.replace('/login.html');
      return;
    }

    console.log('🟢 Using access token:', token.slice(0, 20) + '…');

    /* -------------------------
       Create Razorpay Order
    ------------------------- */
    const res = await fetch('/api/payments/create-order', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ plan_code: planCode }),
    });

    const order = await res.json();

    if (!res.ok) {
      throw new Error(order.message || 'Order creation failed');
    }

    /* -------------------------
       Razorpay Checkout
    ------------------------- */
    const options = {
      key: window.RAZORPAY_KEY_ID,
      amount: order.amount,
      currency: order.currency || 'INR',
      name: 'RemindFlow',
      description: `${plan.name} Subscription`,
      order_id: order.order_id || order.id,

      handler: () => {
        showToast('Payment successful! Redirecting...');
        localStorage.removeItem('selectedPlan');

        setTimeout(() => {
          window.location.replace(
            plan.type === 'integrated'
              ? '/integration-dashboard.html'
              : '/dashboard.html'
          );
        }, 1200);
      },

      theme: { color: '#4a63e7' },
    };

    const rzp = new Razorpay(options);
    rzp.open();

  } catch (err) {
    console.error('❌ Payment error:', err);
    showToast(err.message || 'Payment failed. Please try again.');
  }
});

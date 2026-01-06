// public/js/plans.js

/* -------------------------
   DOM Elements
------------------------- */
const payBtn = document.getElementById('payBtn');
const amountDisplay = document.getElementById('amountDisplay');
const planDisplay = document.getElementById('planDisplay');

/* -------------------------
   Plan Configuration (MUST match backend)
------------------------- */
const PLAN_CONFIG = {
  starter:   { name: 'Starter',   amount: 499,  type: 'full' },
  growth:    { name: 'Growth',    amount: 999,  type: 'full' },
  pro:       { name: 'Pro',       amount: 1999, type: 'full' },
  connector: { name: 'Connector', amount: 399,  type: 'integrated' },
};

/* -------------------------
   JWT Helper
------------------------- */
function getToken() {
  const match = document.cookie.match(/(^|;)\s*accessToken=([^;]+)/);
  return match ? match[2] : null;
}

/* -------------------------
   Resolve Current Plan
------------------------- */
const injectedPlanCode = window.PLAN_CODE;        // Preferred
const userType = window.USER_TYPE || 'full';      // Fallback

let planCode =
  injectedPlanCode ||
  (userType === 'integrated' ? 'connector' : 'starter');

const plan = PLAN_CONFIG[planCode] || PLAN_CONFIG.starter;

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
    if (!token) {
      showToast('Session expired. Please login again.');
      return window.location.href = '/login';
    }

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
    if (!res.ok) throw new Error(order.message || 'Order creation failed');

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
        setTimeout(() => {
          if (plan.type === 'integrated') {
            window.location.href = '/integration-dashboard';
          } else {
            window.location.href = '/dashboard';
          }
        }, 1200);
      },
      prefill: {
        email: window.USER_EMAIL || '',
        contact: window.USER_PHONE || '',
      },
      theme: { color: '#4a63e7' },
    };

    const rzp = new Razorpay(options);
    rzp.open();

  } catch (err) {
    console.error('Payment error:', err);
    showToast(err.message || 'Payment failed. Please try again.');
  }
});

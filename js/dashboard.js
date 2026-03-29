// /js/dashboard.js
import { API_BASE } from './api.js';


/* ------------------ Utils ------------------ */
const $ = (id) => document.getElementById(id);

const safeText = (el, text, fallback = '—') => {
  if (!el) return;
  el.textContent =
    text !== undefined && text !== null && text !== ''
      ? text
      : fallback;
};

const capitalize = (str) =>
  str ? str.charAt(0).toUpperCase() + str.slice(1) : '—';

/* ✅ Money formatter (NUMBER ONLY) */
const formatMoney = (value) =>
  typeof value === 'number'
    ? value.toLocaleString('en-IN')
    : '0';


/* ------------------ Auth Helper ------------------ */
function getAuthHeaders() {
  const token = localStorage.getItem('accessToken');
  if (!token) return null;

  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

/* ------------------ Fetch Helper (JWT AUTH) ------------------ */
async function fetchJSON(path) {
  const headers = getAuthHeaders();

  if (!headers) {
    localStorage.clear();
    window.location.replace('/login.html');
    return null;
  }

  try {
    const res = await fetch(`${API_BASE}${path}`, { headers });

    if (res.status === 401) {
      localStorage.clear();
      window.location.replace('/login.html');
      return null;
    }

    if (res.status === 403) {
      console.warn('Access blocked by plan');
    
      // 🔥 FORCE UI LOCK
      disableAllCreationButtons('plan');
      showUpgradeBanner(
        'Your plan has expired. Upgrade to continue.',
        true
      );
    
      return null;
    }

    if (!res.ok) {
      throw new Error(`Request failed: ${res.status}`);
    }

    return await res.json();
  } catch (err) {
    console.error('Dashboard fetch failed:', err);
    return null;
  }
}

function enableCreateButtons() {
  document.querySelectorAll('[data-requires-plan]').forEach((btn) => {
    btn.classList.remove('disabled-by-plan');
    btn.style.pointerEvents = 'auto';
    btn.style.opacity = '1';
    btn.title = '';

    // remove redirect override
    btn.onclick = null;
  });
}

/* ------------------ Plan Expiry Handling ------------------ */
function disableCreateButtons() {
  document.querySelectorAll('[data-requires-plan]').forEach((btn) => {
    btn.classList.add('disabled-by-plan');
    btn.style.pointerEvents = 'none';   // 🔥 important for <a>
    btn.style.opacity = '0.5';
    btn.title = 'Upgrade to continue';
  });
}

function disableAllCreationButtons(reason = 'limit') {
  document.querySelectorAll('[data-requires-plan]').forEach((btn) => {
    btn.classList.add('disabled-by-plan');
    btn.style.opacity = '0.6';

    // 🔥 Instead of blocking → redirect
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      window.location.href = '/plans.html';
    });

    if (reason === 'limit') {
      btn.title = 'Upgrade to continue';
    } else {
      btn.title = 'Upgrade your plan';
    }
  });
}

function showUpgradeBanner(message, cta = true) {
  const existing = document.getElementById('upgradeBanner');
  if (existing) return;

  const banner = document.createElement('div');
  banner.id = 'upgradeBanner';

  banner.style.background = '#fff4e5';
  banner.style.color = '#8a4b00';
  banner.style.padding = '14px';
  banner.style.marginBottom = '16px';
  banner.style.borderRadius = '8px';
  banner.style.display = 'flex';
  banner.style.justifyContent = 'space-between';
  banner.style.alignItems = 'center';
  banner.style.gap = '12px';

  const text = document.createElement('div');
  text.textContent = message;

  banner.appendChild(text);

  if (cta) {
    const btn = document.createElement('a');
    btn.href = '/plans.html';
    btn.textContent = 'Upgrade Plan';
    btn.style.background = '#0f766e';
    btn.style.color = '#fff';
    btn.style.padding = '8px 14px';
    btn.style.borderRadius = '6px';
    btn.style.textDecoration = 'none';
    btn.style.fontWeight = '500';
    btn.style.whiteSpace = 'nowrap';

    banner.appendChild(btn);
  }

  const container = document.querySelector('.main') || document.body;
  container.prepend(banner);
}

function applyPlanUIState(principal, expired) {
  if (expired) {
    disableAllCreationButtons('plan');
    showUpgradeBanner('Your plan has expired. Upgrade to continue.', true);
    return;
  }

  // ✅ THIS WAS MISSING
  enableCreateButtons();

  const now = new Date();

  // Trial banner (keep this)
  if (principal?.plan_code === 'trial' && principal?.trial_end){
    const daysLeft = Math.ceil(
      (new Date(principal.trial_end) - now) /
      (1000 * 60 * 60 * 24)
    );

    if (daysLeft > 0) {
      showUpgradeBanner(
        `${daysLeft} day${daysLeft === 1 ? '' : 's'} left in trial`
      );
    }
  }
}

/* 🔔 Listen for global plan status event */
window.addEventListener('planStatusReady', (e) => {
  applyPlanUIState(
    e.detail?.principal,
    e.detail?.expired
  );
});

/* ------------------ Load Dashboard ------------------ */
async function loadDashboard(period = 'this_month', start = null, end = null) {
  let url = `/api/dashboard?period=${period}`;

  if (period === 'custom' && start && end) {
    url += `&start=${start}&end=${end}`;
  }

  const data = await fetchJSON(url);


  if (!data || !data.user || !data.stats) {
    console.error('Invalid dashboard payload:', data);
    return;
  }

  const { user, stats } = data;

  /* ------------------ Plan Expiry (Backend Source of Truth) ------------------ */

  const expired = !user.subscription_active;
  applyPlanUIState(user, expired);

  /* ------------------ User Info ------------------ */
  safeText(
    $('userName'),
    user.display_name || user.name || user.email
  );

  safeText(
    $('userEmail'),
    user.display_email || user.email || ''
  );

  /* ------------------ Plan Info ------------------ */
  safeText(
    $('planType'),
    user.plan_type ? capitalize(user.plan_type) : 'Free'
  );

  safeText(
    $('userPlan'),
    user.plan_code ? capitalize(user.plan_code) : 'Trial'
  );

  /* ------------------ Stats ------------------ */
  safeText(
    $('amountDue'),
    `₹${formatMoney(stats.amountDue)}`
  );

  safeText(
    $('amountRecovered'),
    `₹${formatMoney(stats.amountRecovered)}`
  );

  safeText($('pendingInvoices'), stats.pendingInvoices, '0');

  /* ------------------ Slots Logic (FIXED) ------------------ */

  let slotsDisplay;

  if (expired) {
    slotsDisplay = '0';
  } else {
    slotsDisplay =
      stats.slotsLeft === null
        ? 'Unlimited'
        : `${stats.slotsLeft} remaining`;
  }

  // 🔥 SLOT-BASED UI CONTROL
  if (!expired && stats.slotsLeft !== null && stats.slotsLeft <= 0) {
    disableAllCreationButtons('limit');
  
    showUpgradeBanner(
      'You’ve reached your invoice limit. Upgrade to continue adding or importing invoices.',
      true
    );
  }

  safeText($('slotsLeft'), slotsDisplay);
}

/* ------------------ Period Filter ------------------ */
document.addEventListener('DOMContentLoaded', () => {

  const periodFilter = document.getElementById('periodFilter');
  const customRangeDiv = document.getElementById('customRange');
  const startDateInput = document.getElementById('startDate');
  const endDateInput = document.getElementById('endDate');
  const applyCustomBtn = document.getElementById('applyCustomRange');

  if (!periodFilter) return;

  periodFilter.addEventListener('change', () => {
    const selected = periodFilter.value;

    if (selected === 'custom') {
      if (customRangeDiv) {
        customRangeDiv.classList.add('active');
      }
    } else {
      if (customRangeDiv) {
        customRangeDiv.classList.remove('active');
      }
      loadDashboard(selected);
    }
  });

  applyCustomBtn?.addEventListener('click', () => {
    const start = startDateInput?.value;
    const end = endDateInput?.value;

    if (!start || !end) {
      alert('Please select both dates');
      return;
    }

    loadDashboard('custom', start, end);
  });

});

document.addEventListener('DOMContentLoaded', () => {

  // 🔥 Only click guard (no forced disable here)
  document.querySelectorAll('[data-requires-plan]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      if (btn.classList.contains('disabled-by-plan')) {
        e.preventDefault();
        window.location.href = '/plans.html';
      }
    });
  });

});

/* ------------------ Action Center Clicks ------------------ */
document.addEventListener('DOMContentLoaded', () => {

  document.querySelector('.needs-attention-card')?.addEventListener('click', () => {
    window.location.href = '/invoices.html?filter=needs_attention';
  });

  document.querySelector('.high-risk-card')?.addEventListener('click', () => {
    window.location.href = '/invoices.html?filter=high_risk';
  });

  document.querySelector('.high-value-card')?.addEventListener('click', () => {
    window.location.href = '/invoices.html?filter=high_value';
  });

});

/* ------------------ Boot ------------------ */
loadDashboard('this_month');


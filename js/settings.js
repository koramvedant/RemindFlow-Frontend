import { API_BASE } from './api.js';

/* -------------------------
   Auth Helper (ADDED)
------------------------- */
function getAuthHeaders() {
  const token = localStorage.getItem('accessToken');
  if (!token) return {};
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

/* -------------------------
   Section Toggles (FINAL)
------------------------- */
const toggles = document.querySelectorAll('.section-header[data-toggle]');

toggles.forEach((header) => {
  header.addEventListener('click', () => {
    const section = header.closest('.settings-section');
    if (!section) return;

    section.classList.toggle('open');
  });
});

/* -------------------------
   Seller Cache (IMPORTANT)
------------------------- */
function cacheSellerInfo(data) {
  const seller = {
    name: data.company_name || data.name || '—',
    email: data.email || '',

    address_line1: data.address_line1 || '',
    address_line2: data.address_line2 || '',
    city: data.city || '',
    state: data.state || '',
    postal_code: data.postal_code || '',
    country: data.country || 'India',
  };

  localStorage.setItem('sellerInfo', JSON.stringify(seller));
}

/* -------------------------
   Load Settings (FIXED)
------------------------- */
async function loadSettings() {
  try {
    const res = await fetch(`${API_BASE}/api/settings`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch settings');

    const { data } = await res.json();

    document.getElementById('name').value = data.name || '';
    document.getElementById('email').value = data.email || '';
    document.getElementById('company_name').value =
      data.company_name || '';
    document.getElementById('timezone').value =
      data.timezone || 'Asia/Kolkata';

    /* ✅ FIX 1: aligned with backend
    document.getElementById('disable_whatsapp').checked =
      data.reminder_preferences?.whatsapp === false; */

    // 🏢 Business Address (Structured)
    document.getElementById('address_line1').value =
      data.address_line1 || '';
    document.getElementById('address_line2').value =
      data.address_line2 || '';
    document.getElementById('city').value =
      data.city || '';
    document.getElementById('state').value =
      data.state || '';
    document.getElementById('postal_code').value =
      data.postal_code || '';
    document.getElementById('country').value =
      data.country || 'India';

    cacheSellerInfo(data);
  } catch (err) {
    console.warn('⚠️ Failed to load settings:', err);
  }
}

/* -------------------------
   Save Account Settings
  ------------------------- */
document.getElementById('saveAccount')?.addEventListener('click', async () => {
  const payload = {
    // User / Account
    name: document.getElementById('name').value.trim(),
    company_name: document
      .getElementById('company_name')
      .value.trim(),
    timezone: document.getElementById('timezone').value,

    // 🏢 Business Address (Structured)
    address_line1: document
      .getElementById('address_line1')
      .value.trim(),
    address_line2: document
      .getElementById('address_line2')
      .value.trim(),
    city: document.getElementById('city').value.trim(),
    state: document.getElementById('state').value.trim(),
    postal_code: document
      .getElementById('postal_code')
      .value.trim(),
    country: document.getElementById('country').value.trim(),
  };

  // Optional safety (allowed)
  if (!payload.address_line1 || !payload.city) {
    alert('Please complete business address');
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/api/settings`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });

    if (!res.ok) throw new Error('Failed to save');

    alert('✅ Account settings saved');
    cacheSellerInfo(payload);
  } catch (err) {
    console.error('❌ Account save error:', err);
    alert('❌ Failed to save account settings');
  }
});

/* =====================================================
   PAYMENTS (MANUAL METHODS ONLY)
===================================================== */

const savePaymentsBtn = document.getElementById('savePayments');

const upiInput = document.getElementById('upi_id');
const bankNameInput = document.getElementById('bank_name');
const accountNumberInput = document.getElementById('account_number');
const ifscInput = document.getElementById('ifsc_code');

/* 🔑 DEFAULT PAYMENT METHODS */
const defaultPayUpi = document.getElementById('default_pay_upi');
const defaultPayBank = document.getElementById('default_pay_bank');
const defaultPayCash = document.getElementById('default_pay_cash');

/* -------------------------
   Helper Validation (ADDED)
------------------------- */
function isUpiFilled() {
  return upiInput.value.trim().length > 0;
}

function isBankFilled() {
  return (
    bankNameInput.value.trim().length > 0 &&
    accountNumberInput.value.trim().length > 0 &&
    ifscInput.value.trim().length > 0
  );
}

/* -------------------------
   Guard Checkbox Interactions
------------------------- */
defaultPayUpi?.addEventListener('change', () => {
  if (defaultPayUpi.checked && !isUpiFilled()) {
    alert('Please fill UPI ID before enabling UPI.');
    defaultPayUpi.checked = false;
  }
});

defaultPayBank?.addEventListener('change', () => {
  if (defaultPayBank.checked && !isBankFilled()) {
    alert('Please fill bank details before enabling Bank Transfer.');
    defaultPayBank.checked = false;
  }
});

/* -------------------------
   Load Payment Settings
------------------------- */
async function loadPayments() {
  try {
    const res = await fetch(`${API_BASE}/api/settings/payments`, {
      headers: getAuthHeaders(),
    });

    if (!res.ok) throw new Error('Failed to load payments');

    const { data } = await res.json();

    upiInput.value = data.upi_id || '';
    bankNameInput.value = data.bank_name || '';
    accountNumberInput.value = data.account_number || '';
    ifscInput.value = data.ifsc_code || '';

    if (data.default_payment_methods) {
      defaultPayUpi.checked = !!data.default_payment_methods.upi;
      defaultPayBank.checked = !!data.default_payment_methods.bank;
      defaultPayCash.checked = !!data.default_payment_methods.cash;
    }
  } catch (err) {
    console.warn('⚠️ Payment settings not loaded:', err);
  }
}

/* -------------------------
   Save Payment Settings (GUARDED)
------------------------- */
savePaymentsBtn?.addEventListener('click', async () => {
  const upiEnabled = defaultPayUpi.checked;
  const bankEnabled = defaultPayBank.checked;

  if (upiEnabled && !isUpiFilled()) {
    alert('UPI is selected but UPI ID is missing.');
    return;
  }

  if (bankEnabled && !isBankFilled()) {
    alert('Bank Transfer is selected but bank details are incomplete.');
    return;
  }

  const payload = {
    upi_id: upiInput.value.trim(),
    bank_name: bankNameInput.value.trim(),
    account_number: accountNumberInput.value.trim(),
    ifsc_code: ifscInput.value.trim(),

    default_payment_methods: {
      upi: upiEnabled,
      bank: bankEnabled,
      cash: defaultPayCash.checked,
    },
  };

  try {
    const res = await fetch(`${API_BASE}/api/settings/payments`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });

    if (!res.ok) throw new Error('Save failed');

    alert('✅ Payment settings saved');
  } catch (err) {
    console.error('❌ Payment save error:', err);
    alert('❌ Failed to save payment settings');
  }
});

/* =====================================================
   TAXES — ONLY RESPONSIBILITY BELOW
===================================================== */

const taxesContainer = document.getElementById('taxesContainer');
const addTaxBtn = document.getElementById('addTaxBtn');
const saveTaxesBtn = document.getElementById('saveTaxes');

let taxes = [];

/* -------------------------
   Load Taxes
------------------------- */
async function loadTaxes() {
  try {
    const res = await fetch(`${API_BASE}/api/settings/taxes`, {
      headers: getAuthHeaders(),
    });

    if (!res.ok) throw new Error('Failed to load taxes');

    const { data } = await res.json();
    taxes = Array.isArray(data) ? data : [];

    renderTaxes();
  } catch (err) {
    console.error('❌ Failed to load taxes:', err);
    taxes = [];
    renderTaxes();
  }
}

/* -------------------------
   Render Taxes
------------------------- */
function renderTaxes() {
  taxesContainer.innerHTML = '';

  taxes.forEach((tax, index) => {
    const row = document.createElement('div');
    row.className = 'invoice-items-grid';

    row.innerHTML = `
      <input type="text" value="${tax.name || ''}" data-field="name" />
      <input type="number" value="${tax.rate ?? ''}" data-field="rate" />
      <div></div>
      <button class="item-delete" data-index="${index}" title="Delete tax">
        🗑
      </button>
    `;

    taxesContainer.appendChild(row);
  });
}

/* -------------------------
   Add Tax
------------------------- */
addTaxBtn?.addEventListener('click', () => {
  taxes.push({
    name: '',
    rate: '',
    is_active: true,
  });

  renderTaxes();
});

/* -------------------------
   Delete Tax
------------------------- */
taxesContainer?.addEventListener('click', (e) => {
  if (!e.target.classList.contains('item-delete')) return;

  const index = Number(e.target.dataset.index);
  taxes.splice(index, 1);
  renderTaxes();
});

/* -------------------------
   Save Taxes
------------------------- */
saveTaxesBtn?.addEventListener('click', async () => {
  const rows = [
    ...taxesContainer.querySelectorAll('.invoice-items-grid'),
  ];

  const payload = rows
    .map((row) => {
      const name = row
        .querySelector('[data-field="name"]')
        .value.trim();
      const rate = Number(
        row.querySelector('[data-field="rate"]').value
      );

      if (!name || isNaN(rate)) return null;

      return {
        name,
        rate,
        is_active: true,
      };
    })
    .filter(Boolean);

  try {
    const res = await fetch(`${API_BASE}/api/settings/taxes`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ taxes: payload }),
    });

    if (!res.ok) throw new Error('Save failed');

    alert('✅ Taxes saved');
    taxes = payload;
    renderTaxes();
  } catch (err) {
    console.error('❌ Failed to save taxes:', err);
    alert('❌ Failed to save taxes');
  }
});

/* =====================================================
   BILLING SECTION
===================================================== */

async function loadBilling() {
  try {
    const res = await fetch(`${API_BASE}/api/dashboard/info`, {
      headers: getAuthHeaders(),
    });

    if (!res.ok) throw new Error('Failed to load billing info');

    const { user, queuedPlan } = await res.json();

    const currentPlanEl = document.getElementById('currentPlan');
    const expiryEl = document.getElementById('planExpiry');
    const statusEl = document.getElementById('planStatus');

    const queuedSection = document.getElementById('queuedPlanSection');
    const nextPlanNameEl = document.getElementById('nextPlanName');
    const nextActivationDateEl = document.getElementById('nextActivationDate');
    const activateNowBtn = document.getElementById('activateNowBtn');

    if (!currentPlanEl || !expiryEl || !statusEl) return;

    const now = new Date();
    const planEnd = user.plan_end ? new Date(user.plan_end) : null;

    const isExpired =
      !user.subscription_active ||
      !planEnd ||
      planEnd <= now;

    // Current Plan
    currentPlanEl.textContent =
      user.plan_code
        ? user.plan_code.charAt(0).toUpperCase() + user.plan_code.slice(1)
        : 'Free';

    // Expiry Date
    expiryEl.textContent = planEnd
      ? planEnd.toLocaleDateString()
      : '—';

    // Status
    statusEl.textContent = isExpired ? 'Expired' : 'Active';
    statusEl.style.color = isExpired ? 'red' : 'green';

    /* -------------------------
       Queued Plan Display
    ------------------------- */
    if (queuedPlan && queuedSection) {
      queuedSection.style.display = 'block';

      nextPlanNameEl.textContent =
        queuedPlan.name || '—';

      const activationDate = planEnd
        ? planEnd.toLocaleDateString()
        : '—';

      nextActivationDateEl.textContent = activationDate;

      /* Activate Now */
      activateNowBtn?.addEventListener('click', async () => {
        const confirmAction = confirm(
          "Activating now will end your current plan immediately and reset your slots. Continue?"
        );

        if (!confirmAction) return;

        try {
          const activateRes = await fetch(
            `${API_BASE}/api/billing/activate-now`,
            {
              method: 'POST',
              headers: getAuthHeaders(),
            }
          );

          if (!activateRes.ok) throw new Error('Activation failed');

          alert('✅ Plan activated successfully');
          location.reload();
        } catch (err) {
          console.error('Activation error:', err);
          alert('❌ Failed to activate plan');
        }
      });
    } else if (queuedSection) {
      queuedSection.style.display = 'none';
    }
  } catch (err) {
    console.warn('Billing not loaded:', err);
  }
}

/* -------------------------
   Renew Button
------------------------- */

document.getElementById('renewPlan')?.addEventListener('click', () => {
  window.location.href = '/plans.html';
});


/* -------------------------
   Init (FINAL)
------------------------- */
loadSettings();
loadTaxes();
loadPayments();
loadBilling();

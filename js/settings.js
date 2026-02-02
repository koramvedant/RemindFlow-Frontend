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

    document.getElementById('disable_whatsapp').checked =
      data.whatsapp_enabled === false;

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
    name: document.getElementById('name').value.trim(),
    email: document.getElementById('email').value.trim(),
    company_name: document
      .getElementById('company_name')
      .value.trim(),
    timezone: document.getElementById('timezone').value,
  };

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

/* -------------------------
   Save Communication Settings
------------------------- */
document
  .getElementById('saveCommunication')
  ?.addEventListener('click', async () => {
    const disableWhatsapp =
      document.getElementById('disable_whatsapp').checked;

    const payload = {
      whatsapp_enabled: !disableWhatsapp,
    };

    try {
      const res = await fetch(`${API_BASE}/api/settings`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Failed');

      alert('✅ Communication settings saved');
    } catch (err) {
      console.error('❌ Communication save error:', err);
      alert('❌ Failed to save communication settings');
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
  } catch (err) {
    console.warn('⚠️ Payment settings not loaded:', err);
  }
}

/* -------------------------
   Save Payment Settings
------------------------- */
savePaymentsBtn?.addEventListener('click', async () => {
  const payload = {
    upi_id: upiInput.value.trim(),
    bank_name: bankNameInput.value.trim(),
    account_number: accountNumberInput.value.trim(),
    ifsc_code: ifscInput.value.trim(),
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

/* -------------------------
   Init (FINAL)
------------------------- */
loadSettings();
loadTaxes();
loadPayments();

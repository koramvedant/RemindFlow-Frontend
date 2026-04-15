// js/settings.js
// CHANGES: Country field editable. Changing country updates tax label,
//          address labels, tax ID label, currency display, and timezone.

import { API_BASE } from './api.js';
import {
  COUNTRY_OPTIONS,
  getLocaleByCountryName,
  setActiveLocale,
} from './localeConfig.js';

/* ── Auth ────────────────────────────────────────────── */
function getAuthHeaders() {
  const token = localStorage.getItem('accessToken');
  if (!token) return {};
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

/* ── Populate country select ─────────────────────────── */
function populateCountrySelect() {
  const select = document.getElementById('country');
  if (!select) return;

  // Clear and rebuild as <select>
  select.innerHTML = '';
  COUNTRY_OPTIONS.forEach(opt => {
    const el = document.createElement('option');
    el.value = opt.value;
    el.textContent = opt.label;
    select.appendChild(el);
  });
}

/* ── Apply locale to UI when country changes ─────────── */
function applyLocaleToUI(countryName) {
  const lc = getLocaleByCountryName(countryName);

  // Tax label
  const taxLabelEl = document.querySelector('label[for="tax_id"]');
  if (taxLabelEl) taxLabelEl.textContent = lc.taxIdLabel;

  const taxIdInput = document.getElementById('tax_id');
  if (taxIdInput) taxIdInput.placeholder = lc.taxIdPlaceholder;

  // Address field labels
  const stateLabel = document.querySelector('label[for="state"]');
  if (stateLabel) stateLabel.textContent = lc.addressFields.stateLabel || 'State';

  const postalLabel = document.querySelector('label[for="postal_code"]');
  if (postalLabel) postalLabel.textContent = lc.addressFields.postalLabel;

  // Timezone: auto-suggest locale default if user hasn't picked one
  const tzSelect = document.getElementById('timezone');
  if (tzSelect && !localStorage.getItem('timezoneManuallySet')) {
    tzSelect.value = lc.timezone;
  }

  // Currency info strip (if present)
  const currencyNote = document.getElementById('currencyNote');
  if (currencyNote) {
    currencyNote.textContent = `Your invoices will use ${lc.currency} (${lc.currencySymbol})`;
  }

  // Singapore has no state field
  const stateField = document.getElementById('state')?.closest('.field');
  if (stateField) {
    stateField.style.display = lc.addressFields.stateLabel ? '' : 'none';
  }
}

/* ── Seller cache ────────────────────────────────────── */
function cacheSellerInfo(data) {
  localStorage.setItem('sellerInfo', JSON.stringify({
    name:         data.company_name || data.name || '—',
    email:        data.email || '',
    address_line1: data.address_line1 || '',
    address_line2: data.address_line2 || '',
    city:          data.city    || '',
    state:         data.state   || '',
    postal_code:   data.postal_code || '',
    country:       data.country || 'India',
  }));
}

/* ── Load settings ───────────────────────────────────── */
async function loadSettings() {
  try {
    const res = await fetch(`${API_BASE}/api/settings`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to fetch settings');
    const { data } = await res.json();

    document.getElementById('name').value          = data.name         || '';
    document.getElementById('email').value         = data.email        || '';
    document.getElementById('company_name').value  = data.company_name || '';
    document.getElementById('contact_phone').value = data.contact_phone || '';
    document.getElementById('timezone').value      = data.timezone     || 'Asia/Kolkata';
    document.getElementById('address_line1').value = data.address_line1 || '';
    document.getElementById('address_line2').value = data.address_line2 || '';
    document.getElementById('city').value          = data.city         || '';
    document.getElementById('state').value         = data.state        || '';
    document.getElementById('postal_code').value   = data.postal_code  || '';

    // Country — set the select value
    const countrySelect = document.getElementById('country');
    if (countrySelect) countrySelect.value = data.country || 'India';

    // Apply locale labels based on loaded country
    applyLocaleToUI(data.country || 'India');

    // Sync locale to localStorage
    const lc = getLocaleByCountryName(data.country || 'India');
    setActiveLocale(lc.countryCode);

    cacheSellerInfo(data);
  } catch (err) {
    console.warn('⚠️ Failed to load settings:', err);
  }
}

/* ── Save account ────────────────────────────────────── */
document.getElementById('saveAccount')?.addEventListener('click', async () => {
  const country = document.getElementById('country')?.value || 'India';
  const lc      = getLocaleByCountryName(country);

  const payload = {
    name:          document.getElementById('name').value.trim(),
    company_name:  document.getElementById('company_name').value.trim(),
    contact_phone: document.getElementById('contact_phone').value.trim(),
    timezone:      document.getElementById('timezone').value,
    country,
    address_line1: document.getElementById('address_line1').value.trim(),
    address_line2: document.getElementById('address_line2').value.trim(),
    city:          document.getElementById('city').value.trim(),
    state:         document.getElementById('state').value.trim() || null,
    postal_code:   document.getElementById('postal_code').value.trim(),
  };

  if (!payload.address_line1 || !payload.city) {
    alert('Please complete your business address.');
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/api/settings`, {
      method:  'PUT',
      headers: getAuthHeaders(),
      body:    JSON.stringify(payload),
    });

    if (!res.ok) throw new Error('Failed to save');

    // Update locale in localStorage immediately
    setActiveLocale(lc.countryCode);
    localStorage.setItem('country', country);

    alert('✅ Account settings saved');
    cacheSellerInfo(payload);
  } catch (err) {
    console.error('❌ Account save error:', err);
    alert('❌ Failed to save account settings');
  }
});

/* ── Timezone manual override tracking ───────────────── */
document.getElementById('timezone')?.addEventListener('change', () => {
  localStorage.setItem('timezoneManuallySet', '1');
});

/* ── Payments section (unchanged) ───────────────────── */
const upiInput           = document.getElementById('upi_id');
const bankNameInput      = document.getElementById('bank_name');
const accountNumberInput = document.getElementById('account_number');
const ifscInput          = document.getElementById('ifsc_code');
const defaultPayUpi      = document.getElementById('default_pay_upi');
const defaultPayBank     = document.getElementById('default_pay_bank');
const defaultPayCash     = document.getElementById('default_pay_cash');

const isUpiFilled  = () => upiInput?.value.trim().length > 0;
const isBankFilled = () =>
  bankNameInput?.value.trim().length > 0 &&
  accountNumberInput?.value.trim().length > 0 &&
  ifscInput?.value.trim().length > 0;

defaultPayUpi?.addEventListener('change', () => {
  if (defaultPayUpi.checked && !isUpiFilled()) { alert('Please fill UPI ID before enabling UPI.'); defaultPayUpi.checked = false; }
});
defaultPayBank?.addEventListener('change', () => {
  if (defaultPayBank.checked && !isBankFilled()) { alert('Please fill bank details before enabling Bank Transfer.'); defaultPayBank.checked = false; }
});

async function loadPayments() {
  try {
    const res = await fetch(`${API_BASE}/api/settings/payments`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to load payments');
    const { data } = await res.json();
    if (upiInput)          upiInput.value          = data.upi_id         || '';
    if (bankNameInput)     bankNameInput.value     = data.bank_name      || '';
    if (accountNumberInput)accountNumberInput.value= data.account_number || '';
    if (ifscInput)         ifscInput.value         = data.ifsc_code      || '';
    if (data.default_payment_methods) {
      if (defaultPayUpi)  defaultPayUpi.checked  = !!data.default_payment_methods.upi;
      if (defaultPayBank) defaultPayBank.checked = !!data.default_payment_methods.bank;
      if (defaultPayCash) defaultPayCash.checked = !!data.default_payment_methods.cash;
    }
  } catch (err) { console.warn('⚠️ Payment settings not loaded:', err); }
}

document.getElementById('savePayments')?.addEventListener('click', async () => {
  const upiEnabled  = defaultPayUpi?.checked;
  const bankEnabled = defaultPayBank?.checked;
  if (upiEnabled  && !isUpiFilled())  { alert('UPI is selected but UPI ID is missing.');                        return; }
  if (bankEnabled && !isBankFilled()) { alert('Bank Transfer is selected but bank details are incomplete.');     return; }

  const payload = {
    upi_id:          upiInput?.value.trim(),
    bank_name:       bankNameInput?.value.trim(),
    account_number:  accountNumberInput?.value.trim(),
    ifsc_code:       ifscInput?.value.trim(),
    default_payment_methods: { upi: upiEnabled, bank: bankEnabled, cash: defaultPayCash?.checked },
  };

  try {
    const res = await fetch(`${API_BASE}/api/settings/payments`, { method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify(payload) });
    if (!res.ok) throw new Error('Save failed');
    alert('✅ Payment settings saved');
  } catch (err) { alert('❌ Failed to save payment settings'); }
});

/* ── Taxes section (unchanged) ──────────────────────── */
const taxesContainer = document.getElementById('taxesContainer');
const addTaxBtn      = document.getElementById('addTaxBtn');
const saveTaxesBtn   = document.getElementById('saveTaxes');
let taxes = [];

function renderTaxes() {
  if (!taxesContainer) return;
  taxesContainer.innerHTML = '';
  taxes.forEach((tax, index) => {
    const row = document.createElement('div');
    row.className = 'invoice-items-grid';
    row.innerHTML = `
      <input type="text"   value="${tax.name || ''}" data-field="name" />
      <input type="number" value="${tax.rate ?? ''}" data-field="rate" />
      <div></div>
      <button class="item-delete" data-index="${index}">🗑</button>
    `;
    taxesContainer.appendChild(row);
  });
}

async function loadTaxes() {
  try {
    const res = await fetch(`${API_BASE}/api/settings/taxes`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to load taxes');
    const { data } = await res.json();
    taxes = Array.isArray(data) ? data : [];
    renderTaxes();
  } catch (err) { console.error('❌ Failed to load taxes:', err); taxes = []; renderTaxes(); }
}

addTaxBtn?.addEventListener('click', () => { taxes.push({ name: '', rate: '', is_active: true }); renderTaxes(); });

taxesContainer?.addEventListener('click', e => {
  if (!e.target.classList.contains('item-delete')) return;
  taxes.splice(Number(e.target.dataset.index), 1);
  renderTaxes();
});

saveTaxesBtn?.addEventListener('click', async () => {
  const rows   = [...(taxesContainer?.querySelectorAll('.invoice-items-grid') || [])];
  const payload = rows.map(row => {
    const name = row.querySelector('[data-field="name"]')?.value.trim();
    const rate = Number(row.querySelector('[data-field="rate"]')?.value);
    if (!name || isNaN(rate)) return null;
    return { name, rate, is_active: true };
  }).filter(Boolean);

  try {
    const res = await fetch(`${API_BASE}/api/settings/taxes`, { method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify({ taxes: payload }) });
    if (!res.ok) throw new Error('Save failed');
    alert('✅ Taxes saved');
    taxes = payload;
    renderTaxes();
  } catch (err) { alert('❌ Failed to save taxes'); }
});

/* ── Billing section (unchanged) ────────────────────── */
async function loadBilling() {
  try {
    const res = await fetch(`${API_BASE}/api/dashboard/info`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to load billing info');
    const { user, queuedPlan } = await res.json();

    const currentPlanEl = document.getElementById('currentPlan');
    const expiryEl      = document.getElementById('planExpiry');
    const statusEl      = document.getElementById('planStatus');
    const queuedSection = document.getElementById('queuedPlanSection');

    if (!currentPlanEl) return;

    const now     = new Date();
    const planEnd = user.plan_end ? new Date(user.plan_end) : null;
    const isExpired = !user.subscription_active || !planEnd || planEnd <= now;

    currentPlanEl.textContent = user.plan_code
      ? user.plan_code.charAt(0).toUpperCase() + user.plan_code.slice(1)
      : 'Free';
    expiryEl.textContent = planEnd ? planEnd.toLocaleDateString() : '—';
    statusEl.textContent = isExpired ? 'Expired' : 'Active';
    statusEl.style.color = isExpired ? '#f87171' : '#4ade80';

    if (queuedPlan && queuedSection) {
      queuedSection.style.display = 'block';
      document.getElementById('nextPlanName').textContent      = queuedPlan.name || '—';
      document.getElementById('nextActivationDate').textContent = planEnd ? planEnd.toLocaleDateString() : '—';
      document.getElementById('activateNowBtn')?.addEventListener('click', async () => {
        if (!confirm('Activating now will end your current plan immediately. Continue?')) return;
        try {
          const r = await fetch(`${API_BASE}/api/billing/activate-now`, { method: 'POST', headers: getAuthHeaders() });
          if (!r.ok) throw new Error('Activation failed');
          alert('✅ Plan activated successfully');
          location.reload();
        } catch (err) { alert('❌ Failed to activate plan'); }
      });
    } else if (queuedSection) {
      queuedSection.style.display = 'none';
    }
  } catch (err) { console.warn('Billing not loaded:', err); }
}

document.getElementById('renewPlan')?.addEventListener('click', () => window.location.href = '/plans.html');

/* ── Init ────────────────────────────────────────────── */
populateCountrySelect();

// Country change handler — live locale update
document.getElementById('country')?.addEventListener('change', function () {
  applyLocaleToUI(this.value);
});

loadSettings();
loadTaxes();
loadPayments();
loadBilling();
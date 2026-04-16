// js/add-invoice.js
// CHANGES:
//   - Currency symbol in "Rate" column header comes from locale
//   - Tax section label uses locale taxLabel (GST / VAT / Tax)
//   - UPI payment option hidden for non-India users
//   - Discount flat label shows correct currency symbol

import { API_BASE } from './api.js';
import { getActiveLocale } from './localeConfig.js';

const lc = getActiveLocale();

/* ── Apply locale to static labels ─────────────────────── */
function applyLocaleLabels() {
  // Currency symbol in rate column header
  const symEl = document.getElementById('currencySymbolLabel');
  if (symEl) symEl.textContent = lc.currencySymbol;

  // Discount flat label
  const discEl = document.getElementById('discountCurrencyLabel');
  if (discEl) discEl.textContent = lc.currencySymbol;

  // Tax section label: "Tax (optional)" → "GST (optional)" / "VAT (optional)"
  const taxLabel = document.getElementById('taxSectionLabel');
  if (taxLabel) taxLabel.textContent = `${lc.taxLabel} (optional)`;

  // Tax name column header
  const taxNameCol = document.getElementById('taxNameColLabel');
  if (taxNameCol) taxNameCol.textContent = `${lc.taxLabel} Name`;

  // UPI: hide entirely for non-India
  const upiRow = document.getElementById('upiRow');
  if (upiRow && lc.countryCode !== 'IN') {
    upiRow.style.display = 'none';
    const upiCheckbox = document.getElementById('pay_upi');
    if (upiCheckbox) upiCheckbox.checked = false;
  }
}

applyLocaleLabels();

/* ── Auth ────────────────────────────────────────────────── */
function getAuthHeaders() {
  const token = localStorage.getItem('accessToken');
  if (!token) return null;
  return { Authorization: `Bearer ${token}` };
}

/* ── Elements ────────────────────────────────────────────── */
const searchInput   = document.getElementById('clientSearch');
const dropdown      = document.getElementById('clientDropdown');
const changeBtn     = document.getElementById('changeClientBtn');
const continueBtn   = document.getElementById('continueBtn');
const addItemBtn    = document.getElementById('addItemBtn');
const invoiceDate   = document.getElementById('invoiceDate');
const dueDate       = document.getElementById('dueDate');
const invoiceTypeSelect   = document.getElementById('invoiceType');
const discountTypeSelect  = document.getElementById('discountType');
const discountValueInput  = document.getElementById('discountValue');
const notesInput    = document.getElementById('notes');
const layoutSelect  = document.getElementById('layoutSelect');
const invoiceIdInput = document.getElementById('invoiceIdInput');
const payUpiCheckbox  = document.getElementById('pay_upi');
const payBankCheckbox = document.getElementById('pay_bank');
const payCashCheckbox = document.getElementById('pay_cash');
const itemsContainer  = document.getElementById('itemsContainer');
const taxesContainer  = document.getElementById('taxesContainer');

/* ── State ───────────────────────────────────────────────── */
let clients = [], selectedClient = null, activeIndex = -1;
const items = [], taxes = [];

/* ── Load clients ────────────────────────────────────────── */
async function loadClients() {
  const headers = getAuthHeaders();
  if (!headers) return location.replace('/login.html');
  const res  = await fetch(`${API_BASE}/api/clients`, { headers });
  const data = await res.json();
  clients = data.clients || [];
}

/* ── Load taxes ──────────────────────────────────────────── */
async function loadUserTaxes() {
  const res = await fetch(`${API_BASE}/api/settings/taxes`, { headers: getAuthHeaders() });
  if (!res.ok) return;
  const { data } = await res.json();
  taxes.length = 0;
  (data || []).forEach(t => taxes.push({ name: t.name, rate: Number(t.rate) }));
  renderTaxes();
}

/* ── Load payment settings ───────────────────────────────── */
async function loadPaymentSettings() {
  const res = await fetch(`${API_BASE}/api/settings/payments`, { headers: getAuthHeaders() });
  if (!res.ok) return null;
  const { data } = await res.json();
  return data;
}

/* ── Payment availability ────────────────────────────────── */
const isUpiAvailable  = () => window.__paymentSettings?.upi_id?.trim().length > 0;
const isBankAvailable = () => window.__paymentSettings?.bank_name && window.__paymentSettings?.account_number && window.__paymentSettings?.ifsc_code;

payUpiCheckbox?.addEventListener('change', () => {
  if (payUpiCheckbox.checked && !isUpiAvailable()) {
    alert('Please add your UPI ID in Settings before using UPI.');
    payUpiCheckbox.checked = false;
  }
});
payBankCheckbox?.addEventListener('change', () => {
  if (payBankCheckbox.checked && !isBankAvailable()) {
    alert('Please add your bank details in Settings before using Bank Transfer.');
    payBankCheckbox.checked = false;
  }
});

/* ── Dropdown ────────────────────────────────────────────── */
function renderDropdown(list) {
  dropdown.innerHTML = '';
  activeIndex = -1;
  if (!list.length) { dropdown.style.display = 'none'; return; }
  list.forEach(c => {
    const li = document.createElement('li');
    li.innerHTML = `<div class="name">${c.name}</div><div class="email">${c.email || ''}</div>`;
    li.onclick = () => selectClient(c);
    dropdown.appendChild(li);
  });
  dropdown.style.display = 'block';
}

function selectClient(client) {
  selectedClient = client;
  searchInput.value = client.name;
  searchInput.setAttribute('readonly', true);
  dropdown.style.display = 'none';
  changeBtn.style.display = 'inline-block';
}

changeBtn.onclick = () => {
  selectedClient = null;
  searchInput.value = '';
  searchInput.removeAttribute('readonly');
  changeBtn.style.display = 'none';
  searchInput.focus();
};

searchInput.addEventListener('focus', () => { if (!selectedClient) renderDropdown(clients); });
searchInput.addEventListener('input', () => {
  const val = searchInput.value.toLowerCase();
  renderDropdown(clients.filter(c => c.name.toLowerCase().includes(val)));
});
searchInput.addEventListener('keydown', e => {
  const lis = dropdown.querySelectorAll('li');
  if (!lis.length) return;
  if (e.key === 'ArrowDown') activeIndex = (activeIndex + 1) % lis.length;
  if (e.key === 'ArrowUp')   activeIndex = (activeIndex - 1 + lis.length) % lis.length;
  if (e.key === 'Enter') { e.preventDefault(); lis[activeIndex]?.click(); }
  if (e.key === 'Escape') dropdown.style.display = 'none';
  lis.forEach((li, i) => li.classList.toggle('active', i === activeIndex));
});

/* ── Items ───────────────────────────────────────────────── */
function renderItems() {
  itemsContainer.innerHTML = '';
  items.forEach((item, index) => {
    const row = document.createElement('div');
    row.className = 'invoice-items-grid';
    row.innerHTML = `
      <input class="item-desc" value="${item.description}" />
      <input class="item-qty" type="number" value="${item.quantity}" />
      <input class="item-rate" type="number" value="${item.rate}" />
      <button type="button" class="item-delete" data-index="${index}">🗑</button>`;
    itemsContainer.appendChild(row);
  });
}

addItemBtn.addEventListener('click', () => { syncItemsFromDOM(); items.push({ description:'', quantity:1, rate:0 }); renderItems(); });
itemsContainer.addEventListener('click', e => {
  if (!e.target.classList.contains('item-delete')) return;
  items.splice(Number(e.target.dataset.index), 1);
  renderItems();
});

function syncItemsFromDOM() {
  items.length = 0;
  [...itemsContainer.querySelectorAll('.invoice-items-grid')].forEach(row => {
    const desc = row.querySelector('.item-desc').value.trim();
    const qty  = Number(row.querySelector('.item-qty').value);
    const rate = Number(row.querySelector('.item-rate').value);
    if (desc && qty > 0 && rate > 0) items.push({ description:desc, quantity:qty, rate });
  });
}

/* ── Taxes ───────────────────────────────────────────────── */
function renderTaxes() {
  taxesContainer.innerHTML = '';
  taxes.forEach((t, index) => {
    const row = document.createElement('div');
    row.className = 'invoice-items-grid';
    row.innerHTML = `
      <input value="${t.name}" readonly />
      <input type="number" value="${t.rate}" />
      <button type="button" class="item-delete">🗑</button>`;
    row.querySelector('input[type="number"]').oninput = e => { taxes[index].rate = Number(e.target.value); };
    row.querySelector('.item-delete').onclick = () => { taxes.splice(index, 1); renderTaxes(); };
    taxesContainer.appendChild(row);
  });
}

/* ── Invoice ID uniqueness ───────────────────────────────── */
async function isInvoiceIdUnique(invoiceId) {
  const headers = getAuthHeaders();
  if (!headers) return false;
  const res = await fetch(`${API_BASE}/api/invoices/code/${encodeURIComponent(invoiceId)}`, { headers });
  return res.status === 404;
}

/* ── Submit ──────────────────────────────────────────────── */
continueBtn.onclick = async () => {
  if (!selectedClient) return alert('Please select a client');
  syncItemsFromDOM();
  if (!items.length) return alert('Add at least one invoice item');

  const enteredInvoiceId = invoiceIdInput.value?.trim();
  if (enteredInvoiceId) {
    const isUnique = await isInvoiceIdUnique(enteredInvoiceId);
    if (!isUnique) return alert(`Invoice ID "${enteredInvoiceId}" already exists.\nPlease use a different invoice ID.`);
  }

  // For non-India: UPI is always false regardless of checkbox state
  const upiSelected  = lc.countryCode === 'IN' ? payUpiCheckbox?.checked : false;
  const bankSelected = payBankCheckbox?.checked;
  const cashSelected = payCashCheckbox?.checked;

  if (!upiSelected && !bankSelected && !cashSelected) return alert('Select at least one payment option');
  if (upiSelected  && !isUpiAvailable())  return alert('UPI selected but UPI ID is missing in settings.');
  if (bankSelected && !isBankAvailable()) return alert('Bank transfer selected but bank details are missing in settings.');

  continueBtn.disabled = true;
  const overlay = document.getElementById('addInvoiceOverlay');
  const msg     = document.getElementById('addInvoiceText');
  overlay.classList.remove('hidden');

  const steps = ["Validating invoice data...", "Saving draft...", "Preparing preview..."];
  let i = 0;
  const interval = setInterval(() => { if (i < steps.length - 1) msg.innerText = steps[++i]; }, 4000);

  try {
    const payload = {
      invoice_id:   enteredInvoiceId || null,
      invoice_date: invoiceDate.value,
      due_date:     dueDate.value,
      invoice_type: invoiceTypeSelect?.value || 'one_time',
      client_id:    selectedClient.client_id,
      items,
      taxes:        taxes.map(t => ({ ...t })),
      discount: {
        type:  discountTypeSelect.value === 'percentage' ? 'percent' : 'flat',
        value: Number(discountValueInput.value || 0),
      },
      notes:           notesInput.value || '',
      payment_methods: { upi: upiSelected, bank: bankSelected, cash: cashSelected },
      layout_id:       layoutSelect.value || 'minimal',
      status:          'draft',
    };

    const res = await fetch(`${API_BASE}/api/invoices`, {
      method:  'POST',
      headers: { ...getAuthHeaders(), 'Content-Type':'application/json' },
      body:    JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Failed to create draft');
    }

    const data = await res.json();
    clearInterval(interval);
    msg.innerText = "Redirecting to preview...";
    setTimeout(() => { window.location.href = `/invoice-preview.html?id=${data.db_id}`; }, 600);

  } catch (err) {
    clearInterval(interval);
    overlay.classList.add('hidden');
    continueBtn.disabled = false;
    alert(err.message || 'Something went wrong');
  }
};

/* ── Init ────────────────────────────────────────────────── */
(async () => {
  await loadClients();
  await loadUserTaxes();
  const paymentSettings = await loadPaymentSettings();
  window.__paymentSettings = paymentSettings;

  if (paymentSettings?.default_payment_methods) {
    // Only pre-check UPI for India users
    if (payUpiCheckbox && lc.countryCode === 'IN') {
      payUpiCheckbox.checked = !!paymentSettings.default_payment_methods.upi;
    }
    if (payBankCheckbox) payBankCheckbox.checked = !!paymentSettings.default_payment_methods.bank;
    if (payCashCheckbox) payCashCheckbox.checked = !!paymentSettings.default_payment_methods.cash;
  }
})();
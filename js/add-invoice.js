import { API_BASE } from './api.js';

/* ================= URL CONTROL ================= */
const params = new URLSearchParams(window.location.search);
const fromPreview = params.get('from') === 'preview';

/* ================= AUTH ================= */
function getAuthHeaders() {
  const token = localStorage.getItem('accessToken');
  if (!token) return null;
  return { Authorization: `Bearer ${token}` };
}

/* ================= ELEMENTS ================= */
const searchInput = document.getElementById('clientSearch');
const dropdown = document.getElementById('clientDropdown');
const changeBtn = document.getElementById('changeClientBtn');
const continueBtn = document.getElementById('continueBtn');
const addItemBtn = document.getElementById('addItemBtn');

const invoiceDate = document.getElementById('invoiceDate');
const dueDate = document.getElementById('dueDate');

/* ✅ DISCOUNT (CANONICAL) */
const discountTypeSelect = document.getElementById('discountType');
const discountValueInput = document.getElementById('discountValue');

const notesInput = document.getElementById('notes');
const layoutSelect = document.getElementById('layoutSelect');
const invoiceIdInput = document.getElementById('invoiceIdInput');

/* 🔑 PAYMENT OPTIONS (MANUAL) */
const payUpiCheckbox = document.getElementById('pay_upi');
const payBankCheckbox = document.getElementById('pay_bank');
const payCashCheckbox = document.getElementById('pay_cash');

/* 🔑 ITEMS UI */
const itemsContainer = document.getElementById('itemsContainer');

/* 🔑 TAXES UI */
const taxesContainer = document.getElementById('taxesContainer');

/* ================= STATE ================= */
let clients = [];
let selectedClient = null;
let activeIndex = -1;

/* ✅ SINGLE SOURCE OF TRUTH */
const items = [];
const taxes = [];

/* ================= FETCH CLIENTS ================= */
async function loadClients() {
  const headers = getAuthHeaders();
  if (!headers) return location.replace('/login.html');

  const res = await fetch(`${API_BASE}/api/clients`, { headers });
  const data = await res.json();
  clients = data.clients || [];
}

/* ================= FETCH USER TAXES ================= */
async function loadUserTaxes() {
  const res = await fetch(`${API_BASE}/api/settings/taxes`, {
    headers: getAuthHeaders(),
  });

  if (!res.ok) return;

  const { data } = await res.json();

  taxes.length = 0;
  (data || []).forEach((t) => {
    taxes.push({
      name: t.name,
      rate: Number(t.rate),
    });
  });

  renderTaxes();
}

/* ================= FETCH PAYMENT SETTINGS ================= */
async function loadPaymentSettings() {
  const res = await fetch(`${API_BASE}/api/settings/payments`, {
    headers: getAuthHeaders(),
  });

  if (!res.ok) return null;

  const { data } = await res.json();
  return data;
}

/* ================= PAYMENT AVAILABILITY HELPERS ================= */
function isUpiAvailable() {
  return (
    window.__paymentSettings &&
    window.__paymentSettings.upi_id &&
    window.__paymentSettings.upi_id.trim().length > 0
  );
}

function isBankAvailable() {
  return (
    window.__paymentSettings &&
    window.__paymentSettings.bank_name &&
    window.__paymentSettings.account_number &&
    window.__paymentSettings.ifsc_code
  );
}

/* ================= PAYMENT CHECKBOX GUARDS ================= */
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

/* ================= DROPDOWN ================= */
function renderDropdown(list) {
  dropdown.innerHTML = '';
  activeIndex = -1;

  if (!list.length) {
    dropdown.style.display = 'none';
    return;
  }

  list.forEach((c) => {
    const li = document.createElement('li');
    li.innerHTML = `
      <div class="name">${c.name}</div>
      <div class="email">${c.email || ''}</div>
    `;
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

/* ================= SEARCH + KEYBOARD ================= */
searchInput.addEventListener('focus', () => {
  if (!selectedClient) renderDropdown(clients);
});

searchInput.addEventListener('input', () => {
  const val = searchInput.value.toLowerCase();
  renderDropdown(
    clients.filter((c) => c.name.toLowerCase().includes(val))
  );
});

searchInput.addEventListener('keydown', (e) => {
  const listItems = dropdown.querySelectorAll('li');
  if (!listItems.length) return;

  if (e.key === 'ArrowDown') activeIndex = (activeIndex + 1) % listItems.length;
  if (e.key === 'ArrowUp')
    activeIndex = (activeIndex - 1 + listItems.length) % listItems.length;

  if (e.key === 'Enter') {
    e.preventDefault();
    listItems[activeIndex]?.click();
  }

  if (e.key === 'Escape') dropdown.style.display = 'none';

  listItems.forEach((li, i) =>
    li.classList.toggle('active', i === activeIndex)
  );
});

/* ================= ITEMS ================= */
function renderItems() {
  itemsContainer.innerHTML = '';

  items.forEach((item, index) => {
    const row = document.createElement('div');
    row.className = 'invoice-items-grid';

    row.innerHTML = `
      <input class="item-desc" value="${item.description}" />
      <input class="item-qty" type="number" value="${item.quantity}" />
      <input class="item-rate" type="number" value="${item.rate}" />
      <button type="button" class="item-delete" data-index="${index}">🗑</button>
    `;

    itemsContainer.appendChild(row);
  });
}

addItemBtn.addEventListener('click', () => {
  syncItemsFromDOM();
  items.push({ description: '', quantity: 1, rate: 0 });
  renderItems();
});

itemsContainer.addEventListener('click', (e) => {
  if (!e.target.classList.contains('item-delete')) return;
  items.splice(Number(e.target.dataset.index), 1);
  renderItems();
});

function syncItemsFromDOM() {
  items.length = 0;

  [...itemsContainer.querySelectorAll('.invoice-items-grid')].forEach(
    (row) => {
      const desc = row.querySelector('.item-desc').value.trim();
      const qty = Number(row.querySelector('.item-qty').value);
      const rate = Number(row.querySelector('.item-rate').value);

      if (desc && qty > 0 && rate > 0) {
        items.push({ description: desc, quantity: qty, rate });
      }
    }
  );
}

/* ================= TAXES ================= */
function renderTaxes() {
  taxesContainer.innerHTML = '';

  taxes.forEach((t, index) => {
    const row = document.createElement('div');
    row.className = 'invoice-items-grid';

    row.innerHTML = `
      <input value="${t.name}" readonly />
      <input type="number" value="${t.rate}" />
      <button type="button" class="item-delete">🗑</button>
    `;

    row.querySelector('input[type="number"]').oninput = (e) => {
      taxes[index].rate = Number(e.target.value);
    };

    row.querySelector('.item-delete').onclick = () => {
      taxes.splice(index, 1);
      renderTaxes();
    };

    taxesContainer.appendChild(row);
  });
}

/* ================= RESTORE DRAFT ================= */
function loadDraftFromSession() {
  const stored = sessionStorage.getItem('invoiceDraft');
  if (!stored) return;

  const draft = JSON.parse(stored);

  if (draft.client) {
    selectedClient = draft.client;
  }

  if (selectedClient) {
    searchInput.value = selectedClient.name;
    searchInput.setAttribute('readonly', true);
    changeBtn.style.display = 'inline-block';
  }

  invoiceDate.value = draft.invoice_date || '';
  dueDate.value = draft.due_date || '';

  items.length = 0;
  (draft.items || []).forEach((i) => items.push(i));
  renderItems();

  taxes.length = 0;
  (draft.taxes || []).forEach((t) => taxes.push(t));
  renderTaxes();

  if (draft.discount) {
    discountTypeSelect.value =
      draft.discount.type === 'percent'
        ? 'percentage'
        : 'flat';
    discountValueInput.value = draft.discount.value;
  }

  notesInput.value = draft.notes || '';
  layoutSelect.value = draft.layout_id || 'minimal';

  if (draft.payment_methods) {
    payUpiCheckbox.checked = !!draft.payment_methods.upi;
    payBankCheckbox.checked = !!draft.payment_methods.bank;
    payCashCheckbox.checked = !!draft.payment_methods.cash;
  }
}

/* ================= CONTINUE ================= */
continueBtn.onclick = () => {
  if (!selectedClient) return alert('Please select a client');

  syncItemsFromDOM();
  if (!items.length) return alert('Add at least one invoice item');

  if (
    !payUpiCheckbox.checked &&
    !payBankCheckbox.checked &&
    !payCashCheckbox.checked
  ) {
    return alert('Select at least one payment option');
  }

  if (payUpiCheckbox.checked && !isUpiAvailable()) {
    return alert('UPI selected but UPI ID is missing in settings.');
  }

  if (payBankCheckbox.checked && !isBankAvailable()) {
    return alert('Bank transfer selected but bank details are missing in settings.');
  }

  const discount = {
    type:
      discountTypeSelect.value === 'percentage'
        ? 'percent'
        : 'flat',
    value: Number(discountValueInput.value || 0),
  };

  const payment_methods = {
    upi: payUpiCheckbox.checked,
    bank: payBankCheckbox.checked,
    cash: payCashCheckbox.checked,
  };

  const payload = {
    invoice_id: invoiceIdInput.value || null,
    invoice_date: invoiceDate.value,
    due_date: dueDate.value,
    client: selectedClient,
    items,
    taxes: taxes.map((t) => ({ ...t })),
    discount,
    notes: notesInput.value || '',
    payment_methods,
    layout_id: layoutSelect.value || 'minimal',
    status: 'draft',
  };

  sessionStorage.setItem('invoiceDraft', JSON.stringify(payload));
  window.location.href = '/invoice-preview.html';
};

/* ================= INIT ================= */
(async () => {
  await loadClients();
  await loadUserTaxes();

  const paymentSettings = await loadPaymentSettings();
  window.__paymentSettings = paymentSettings;

  if (fromPreview) {
    loadDraftFromSession();
  } else {
    sessionStorage.removeItem('invoiceDraft');

    if (paymentSettings?.default_payment_methods) {
      payUpiCheckbox.checked = !!paymentSettings.default_payment_methods.upi;
      payBankCheckbox.checked = !!paymentSettings.default_payment_methods.bank;
      payCashCheckbox.checked = !!paymentSettings.default_payment_methods.cash;
    }
  }
})();

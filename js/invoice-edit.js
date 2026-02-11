import { API_BASE } from './api.js';

/* ================= AUTH ================= */
function getAuthHeaders() {
  const token = localStorage.getItem('accessToken');
  if (!token) return null;
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

/* ================= URL ================= */
const params = new URLSearchParams(window.location.search);
const invoiceDbId = params.get('id');
if (!invoiceDbId) location.replace('/invoices.html');

/* ================= ELEMENTS ================= */
const searchInput = document.getElementById('clientSearch');
const dropdown = document.getElementById('clientDropdown');
const changeBtn = document.getElementById('changeClientBtn');
const saveBtn = document.getElementById('saveBtn');
const addItemBtn = document.getElementById('addItemBtn');

const invoiceDate = document.getElementById('invoiceDate');
const dueDate = document.getElementById('dueDate');

const discountTypeSelect = document.getElementById('discountType');
const discountValueInput = document.getElementById('discountValue');

const notesInput = document.getElementById('notes');
const layoutSelect = document.getElementById('layoutSelect');
const invoiceIdInput = document.getElementById('invoiceIdInput');

const itemsContainer = document.getElementById('itemsContainer');
const taxesContainer = document.getElementById('taxesContainer');

/* ================= STATE ================= */
let clients = [];
let selectedClient = null;
let activeIndex = -1;
let draft = null;

/* ================= HELPERS ================= */
async function isInvoiceIdUniqueForEdit(invoiceId) {
  const headers = getAuthHeaders();
  if (!headers) return false;

  const res = await fetch(
    `${API_BASE}/api/invoices/code/${encodeURIComponent(invoiceId)}`,
    { headers }
  );

  if (res.status === 404) return true;
  if (!res.ok) return false;

  const { invoice } = await res.json();
  return invoice.id === Number(invoiceDbId);
}

/* ================= FETCH CLIENTS ================= */
async function loadClients() {
  const res = await fetch(`${API_BASE}/api/clients`, {
    headers: getAuthHeaders(),
  });
  const data = await res.json();
  clients = data.clients || [];
}

/* ================= FETCH INVOICE (DB → DRAFT) ================= */
async function loadInvoiceFromDB() {
  const res = await fetch(
    `${API_BASE}/api/invoices/id/${invoiceDbId}`,
    { headers: getAuthHeaders() }
  );

  const { invoice } = await res.json();

  draft = {
    invoice_id: invoice.invoice_id || null,
    client_id: invoice.client_id,
    invoice_date: invoice.invoice_date,
    due_date: invoice.due_date,
    items: invoice.items || [],
    taxes: invoice.taxes || [],
    discount: {
      type: invoice.discount_type || 'flat',
      value: Number(invoice.discount_value || 0),
    },
    notes: invoice.notes || '',
    layout_id: invoice.layout_id || 'minimal',
    payment_methods:
      invoice.payment_payload?.payment_methods || {
        upi: false,
        bank: false,
        cash: false,
      },
  };
}

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
      <div class="name">${c.company || c.name}</div>
      <div class="email">${c.email || ''}</div>
    `;
    li.onclick = () => selectClient(c);
    dropdown.appendChild(li);
  });

  dropdown.style.display = 'block';
}

function closeDropdown() {
  dropdown.style.display = 'none';
  activeIndex = -1;
}

function selectClient(client) {
  selectedClient = client;
  searchInput.value = client.company || client.name || '';
  searchInput.readOnly = true;
  changeBtn.style.display = 'inline-block';
  closeDropdown();
}

/* ================= SEARCH ================= */
searchInput.addEventListener('focus', () => {
  if (!selectedClient) renderDropdown(clients);
});

searchInput.addEventListener('input', () => {
  const val = searchInput.value.toLowerCase();
  renderDropdown(
    clients.filter((c) =>
      (c.company || c.name || '').toLowerCase().includes(val)
    )
  );
});

/* ================= CHANGE CLIENT ================= */
changeBtn.onclick = () => {
  selectedClient = null;
  draft.client_id = null;

  searchInput.value = '';
  searchInput.readOnly = false;
  changeBtn.style.display = 'none';
  renderDropdown(clients);
  searchInput.focus();
};

/* ================= ITEMS ================= */
function renderItems() {
  itemsContainer.innerHTML = '';

  draft.items.forEach((item, index) => {
    const row = document.createElement('div');
    row.className = 'invoice-items-grid';

    row.innerHTML = `
      <input class="item-desc" value="${item.description}" />
      <input class="item-qty" type="number" value="${item.quantity}" />
      <input class="item-rate" type="number" value="${item.rate}" />
      <button class="item-delete" data-index="${index}">🗑</button>
    `;

    itemsContainer.appendChild(row);
  });
}

addItemBtn.addEventListener('click', () => {
  draft.items.push({ description: '', quantity: 1, rate: 0 });
  renderItems();
});

itemsContainer.addEventListener('click', (e) => {
  if (!e.target.classList.contains('item-delete')) return;
  draft.items.splice(Number(e.target.dataset.index), 1);
  renderItems();
});

function collectItems() {
  return [...itemsContainer.querySelectorAll('.invoice-items-grid')]
    .map((row) => ({
      description: row.querySelector('.item-desc').value.trim(),
      quantity: Number(row.querySelector('.item-qty').value),
      rate: Number(row.querySelector('.item-rate').value),
    }))
    .filter((i) => i.description && i.quantity > 0 && i.rate > 0);
}

/* ================= TAXES ================= */
function renderTaxes() {
  taxesContainer.innerHTML = '';

  draft.taxes.forEach((t, index) => {
    const row = document.createElement('div');
    row.className = 'invoice-items-grid';

    row.innerHTML = `
      <input value="${t.name}" readonly />
      <input type="number" value="${t.rate}" />
      <button class="item-delete">🗑</button>
    `;

    row.querySelector('input[type="number"]').oninput = (e) => {
      draft.taxes[index].rate = Number(e.target.value);
    };

    row.querySelector('.item-delete').onclick = () => {
      draft.taxes.splice(index, 1);
      renderTaxes();
    };

    taxesContainer.appendChild(row);
  });
}

/* ================= PREFILL ================= */
async function prefillFromDraft(draft) {
  if (draft.invoice_id) invoiceIdInput.value = draft.invoice_id;

  if (draft.client_id) {
    const matched = clients.find((c) => c.client_id === draft.client_id);
    if (matched) {
      selectedClient = matched;
      searchInput.value = matched.company || matched.name || '';
      searchInput.readOnly = true;
      changeBtn.style.display = 'inline-block';
    }
  }

  invoiceDate.value = draft.invoice_date?.split('T')[0] || '';
  dueDate.value = draft.due_date?.split('T')[0] || '';
  notesInput.value = draft.notes || '';
  layoutSelect.value = draft.layout_id || 'minimal';

  discountTypeSelect.value =
    draft.discount.type === 'percent' ? 'percentage' : 'flat';
  discountValueInput.value = draft.discount.value || 0;

  renderItems();

  if (!draft.taxes.length) {
    const res = await fetch(`${API_BASE}/api/settings/taxes`, {
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    draft.taxes = (data.taxes || []).map((t) => ({
      name: t.name,
      rate: Number(t.rate),
    }));
  }

  renderTaxes();

  // ✅ PAYMENT OPTIONS PREFILL
  if (draft.payment_methods) {
    const { upi, bank, cash } = draft.payment_methods;

    const payUpi = document.getElementById('pay_upi');
    const payBank = document.getElementById('pay_bank');
    const payCash = document.getElementById('pay_cash');

    if (payUpi) payUpi.checked = !!upi;
    if (payBank) payBank.checked = !!bank;
    if (payCash) payCash.checked = !!cash;
  }
}

/* ================= SAVE → PREVIEW ================= */
saveBtn.addEventListener('click', async () => {
  const enteredInvoiceId = invoiceIdInput.value?.trim();
  if (enteredInvoiceId) {
    const ok = await isInvoiceIdUniqueForEdit(enteredInvoiceId);
    if (!ok) {
      return alert(
        `Invoice ID "${enteredInvoiceId}" already exists.\nPlease use a different one.`
      );
    }
  }

  draft.items = collectItems();
  const items = draft.items;

  const clientId = selectedClient?.client_id;
  if (!clientId) return alert('Client missing');
  if (!items.length) return alert('Add at least one invoice item');

  const finalDraft = {
    invoice_id: enteredInvoiceId || null,
    client_id: clientId,
    invoice_date: invoiceDate.value,
    due_date: dueDate.value,
    items,
    taxes: draft.taxes,
    discount: {
      type:
        discountTypeSelect.value === 'percentage'
          ? 'percent'
          : 'flat',
      value: Number(discountValueInput.value || 0),
    },
    notes: notesInput.value || '',
    layout_id: layoutSelect.value || 'minimal',
    payment_methods: draft.payment_methods || {
      upi: false,
      bank: false,
      cash: false,
    },
  };

  sessionStorage.setItem('invoiceDraft', JSON.stringify(finalDraft));
  window.location.href = `/invoice-preview.html?id=${invoiceDbId}`;
});

/* ================= INIT (FINAL, SAFE) ================= */
(async () => {
  await loadClients();

  // 🔥 ALWAYS trust DB on edit
  await loadInvoiceFromDB();

  await prefillFromDraft(draft);
})();

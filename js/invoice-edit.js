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
const discountInput = document.getElementById('discount');
const notesInput = document.getElementById('notes');
const layoutSelect = document.getElementById('layoutSelect');
const enableRazorpay = document.getElementById('enableRazorpay');
const invoiceIdInput = document.getElementById('invoiceIdInput');

const itemsContainer = document.getElementById('itemsContainer');

/* ================= STATE ================= */
let clients = [];
let selectedClient = null;
let activeIndex = -1;
let draft = null;

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
    {
      headers: getAuthHeaders(),
    }
  );

  const { invoice } = await res.json();

  draft = {
    invoice_id: invoice.invoice_id || null,
    client_id: invoice.client?.client_id || null,

    invoice_date: invoice.invoice_date,
    due_date: invoice.due_date,

    items: invoice.items || [],
    taxes: invoice.taxes || [],
    discount: invoice.discount || 0,
    notes: invoice.notes || '',

    layout_id: invoice.layout_id || 'minimal',

    payment: {
      razorpay_enabled: !!invoice.payment?.razorpay_enabled,
    },
  };

  sessionStorage.setItem('invoiceDraft', JSON.stringify(draft));
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

/* ✅ STEP 1 — helper */
function closeDropdown() {
  dropdown.style.display = 'none';
  activeIndex = -1;
}

function selectClient(client) {
  selectedClient = client;
  searchInput.value = client.company || client.name || '';
  searchInput.readOnly = true;
  changeBtn.style.display = 'inline-block';
  dropdown.style.display = 'none';
}

/* ================= SEARCH + KEYBOARD ================= */
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

searchInput.addEventListener('keydown', (e) => {
  const listItems = dropdown.querySelectorAll('li');
  if (!listItems.length) return;

  if (e.key === 'ArrowDown') {
    activeIndex = (activeIndex + 1) % listItems.length;
  }

  if (e.key === 'ArrowUp') {
    activeIndex =
      (activeIndex - 1 + listItems.length) % listItems.length;
  }

  if (e.key === 'Enter') {
    e.preventDefault();
    listItems[activeIndex]?.click();
    return;
  }

  if (e.key === 'Escape') {
    closeDropdown();
    searchInput.blur();
  }

  listItems.forEach((li, i) =>
    li.classList.toggle('active', i === activeIndex)
  );
});

/* ✅ STEP 3 — outside click close */
document.addEventListener('click', (e) => {
  const clickedInside =
    searchInput.contains(e.target) ||
    dropdown.contains(e.target) ||
    changeBtn.contains(e.target);

  if (!clickedInside) {
    closeDropdown();
  }
});

/* ================= CHANGE CLIENT ================= */
changeBtn.onclick = () => {
  selectedClient = null;

  if (draft) {
    draft.client_id = null;
    sessionStorage.setItem('invoiceDraft', JSON.stringify(draft));
  }

  searchInput.value = '';
  searchInput.readOnly = false;
  changeBtn.style.display = 'none';
  dropdown.style.display = 'block';
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

/* ================= PREFILL ================= */
function prefillFromDraft(draft) {
  if (draft.invoice_id && invoiceIdInput) {
    invoiceIdInput.value = draft.invoice_id;
  }

  if (draft.client_id && Array.isArray(clients)) {
    const matchedClient = clients.find(
      (c) => c.client_id === draft.client_id
    );

    if (matchedClient) {
      selectedClient = matchedClient;
      searchInput.value =
        matchedClient.company || matchedClient.name || '';
      searchInput.readOnly = true;
      changeBtn.style.display = 'inline-block';
    } else {
      selectedClient = null;
      searchInput.readOnly = false;
      changeBtn.style.display = 'none';
    }
  }

  invoiceDate.value = draft.invoice_date?.split('T')[0] || '';
  dueDate.value = draft.due_date?.split('T')[0] || '';
  notesInput.value = draft.notes || '';
  layoutSelect.value = draft.layout_id || 'minimal';
  enableRazorpay.checked = !!draft.payment?.razorpay_enabled;

  renderItems();
}

/* ================= SAVE → PREVIEW ================= */
saveBtn.addEventListener('click', () => {
  const items = collectItems();

  if (!selectedClient?.client_id) {
    alert('Client missing');
    return;
  }

  if (!items.length) {
    alert('Add at least one invoice item');
    return;
  }

  const finalDraft = {
    invoice_id: draft.invoice_id || null,
    client_id: selectedClient.client_id,
    invoice_date: invoiceDate.value,
    due_date: dueDate.value,
    items,
    taxes: draft.taxes || [],
    discount: Number(discountInput.value || 0),
    notes: notesInput.value || '',
    layout_id: layoutSelect.value || 'minimal',
    payment: { razorpay_enabled: enableRazorpay.checked },
  };

  sessionStorage.setItem('invoiceDraft', JSON.stringify(finalDraft));
  window.location.href = `/invoice-preview.html?id=${invoiceDbId}`;
});

/* ================= INIT ================= */
(async () => {
  await loadClients();

  const stored = sessionStorage.getItem('invoiceDraft');
  if (stored) {
    draft = JSON.parse(stored);
  } else {
    await loadInvoiceFromDB();
  }

  prefillFromDraft(draft);
})();

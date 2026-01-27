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

const invoiceDate = document.getElementById('invoiceDate');
const dueDate = document.getElementById('dueDate');
const discountInput = document.getElementById('discount');
const notesInput = document.getElementById('notes');
const layoutSelect = document.getElementById('layoutSelect');
const enableRazorpay = document.getElementById('enableRazorpay');
const invoiceIdInput = document.getElementById('invoiceIdInput');
const itemsContainer = document.getElementById('itemsBody');

/* ================= STATE ================= */
let clients = [];
let selectedClient = null;
let activeIndex = -1;

/* ✅ SINGLE SOURCE OF TRUTH */
let draft = { items: [] };

/* ================= FETCH CLIENTS ================= */
async function loadClients() {
  const res = await fetch('/api/clients', { headers: getAuthHeaders() });
  const data = await res.json();
  clients = data.clients || [];
}

/* ================= FETCH INVOICE ================= */
async function loadInvoice() {
  const res = await fetch(`/api/invoices/id/${invoiceDbId}`, {
    headers: getAuthHeaders(),
  });

  const data = await res.json();

  draft = {
    ...data.invoice,
    items: [...(data.invoice.items || [])],
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

/* ================= CHANGE CLIENT ================= */
changeBtn.onclick = () => {
  selectedClient = null;
  searchInput.value = '';
  searchInput.removeAttribute('readonly');
  changeBtn.style.display = 'none';
  renderDropdown(clients);
  searchInput.focus();
};

/* ================= SEARCH ================= */
searchInput.addEventListener('focus', () => {
  if (!selectedClient) renderDropdown(clients);
});

searchInput.addEventListener('input', () => {
  const val = searchInput.value.toLowerCase();
  renderDropdown(
    clients.filter((c) => c.name.toLowerCase().includes(val))
  );
});

/* ================= ITEMS RENDER (SOLE DOM AUTHORITY) ================= */
function renderItems() {
  itemsContainer.innerHTML = '';

  draft.items.forEach((item, index) => {
    const row = document.createElement('div');
    row.className = 'item-row';

    row.innerHTML = `
      <input value="${item.description}" disabled />
      <input value="${item.quantity}" disabled />
      <input value="${item.rate}" disabled />

      <button
        type="button"
        class="item-delete"
        data-index="${index}"
      >
        🗑
      </button>
    `;

    itemsContainer.appendChild(row);
  });
}

/* ================= DELETE ITEM (ONLY ONE HANDLER) ================= */
itemsContainer.addEventListener('click', (e) => {
  if (!e.target.classList.contains('item-delete')) return;

  const index = Number(e.target.dataset.index);
  draft.items.splice(index, 1);
  sessionStorage.setItem('invoiceDraft', JSON.stringify(draft));
  renderItems();
});

/* ================= PREFILL ================= */
function prefillForm() {
  invoiceIdInput.value = draft.invoice_id || '';
  invoiceDate.value = draft.invoice_date?.slice(0, 10);
  dueDate.value = draft.due_date?.slice(0, 10);
  discountInput.value = draft.total_discount || 0;
  notesInput.value = draft.notes || '';
  layoutSelect.value = draft.layout_id || 'minimal';

  enableRazorpay.checked = !!draft.payment?.razorpay_enabled;

  selectedClient = clients.find((c) => c.client_id === draft.client_id);
  if (selectedClient) {
    searchInput.value = selectedClient.name;
    searchInput.setAttribute('readonly', true);
    changeBtn.style.display = 'inline-block';
  }

  renderItems();
}

/* ================= SAVE ================= */
saveBtn.onclick = async () => {
  if (!selectedClient) return alert('Select a client');
  if (!draft.items.length) return alert('Add at least one item');

  const payload = {
    invoice_id: invoiceIdInput.value || null,
    client_id: selectedClient.client_id,
    invoice_date: invoiceDate.value,
    due_date: dueDate.value,
    items: draft.items,
    notes: notesInput.value || '',
    layout_id: layoutSelect.value,
    total_discount: Number(discountInput.value) || 0,
    payment: {
      razorpay_enabled: enableRazorpay.checked,
    },
  };

  await fetch(`/api/invoices/${draft.invoice_id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  window.location.href = `/invoice-preview.html?id=${invoiceDbId}`;
};

/* ================= INIT ================= */
(async () => {
  await loadClients();
  await loadInvoice();
  prefillForm();
})();

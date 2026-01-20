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
const itemsBody = document.getElementById('itemsBody');

/* ================= STATE ================= */
let clients = [];
let selectedClient = null;
let invoice = null;
let activeIndex = -1;

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
  invoice = data.invoice;
}

/* ================= DROPDOWN (COPIED, UNCHANGED) ================= */
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

/* ================= CHANGE CLIENT (FIXED) ================= */
changeBtn.onclick = () => {
  selectedClient = null;
  searchInput.value = '';
  searchInput.removeAttribute('readonly');
  changeBtn.style.display = 'none';

  // 🔧 CRITICAL FIX
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

/* ================= PREFILL ================= */
function prefillForm() {
  invoiceIdInput.value = invoice.invoice_id || '';
  invoiceDate.value = invoice.invoice_date?.slice(0, 10);
  dueDate.value = invoice.due_date?.slice(0, 10);
  discountInput.value = invoice.total_discount || 0;
  notesInput.value = invoice.notes || '';
  layoutSelect.value = invoice.layout_id || 'minimal';

  // Client
  selectedClient = clients.find((c) => c.client_id === invoice.client_id);
  if (selectedClient) {
    searchInput.value = selectedClient.name;
    searchInput.setAttribute('readonly', true);
    changeBtn.style.display = 'inline-block';
  }

  // Items
  itemsBody.innerHTML = '';
  (invoice.items || []).forEach((i) => {
    const row = document.createElement('tr');
    row.className = 'item-row';
    row.innerHTML = `
      <td><input class="item-desc" value="${i.description}" /></td>
      <td><input class="item-qty" type="number" min="1" value="${i.quantity}" /></td>
      <td><input class="item-rate" type="number" step="0.01" value="${i.rate}" /></td>
    `;
    itemsBody.appendChild(row);
  });
}

/* ================= HELPERS ================= */
function getInvoiceItems() {
  return [...document.querySelectorAll('.item-row')]
    .map((row) => ({
      description: row.querySelector('.item-desc').value.trim(),
      quantity: Number(row.querySelector('.item-qty').value),
      rate: Number(row.querySelector('.item-rate').value),
    }))
    .filter((i) => i.description && i.quantity > 0 && i.rate > 0);
}

/* ================= SAVE ================= */
saveBtn.onclick = async () => {
  if (!selectedClient) return alert('Select a client');

  const items = getInvoiceItems();
  if (!items.length) return alert('Add at least one item');

  const payload = {
    invoice_id: invoiceIdInput.value || null,
    client_id: selectedClient.client_id,
    invoice_date: invoiceDate.value,
    due_date: dueDate.value,
    items,
    notes: notesInput.value || '',
    layout_id: layoutSelect.value,
    total_discount: Number(discountInput.value) || 0,
  };

  await fetch(`/api/invoices/${invoice.invoice_id}`, {
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

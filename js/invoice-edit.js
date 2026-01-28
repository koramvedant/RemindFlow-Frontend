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

/* ================= SEARCH HANDLERS ================= */
searchInput.addEventListener('focus', () => {
  if (!selectedClient) renderDropdown(clients);
});

searchInput.addEventListener('input', () => {
  const val = searchInput.value.toLowerCase();
  renderDropdown(clients.filter((c) => c.name.toLowerCase().includes(val)));
});

searchInput.addEventListener('keydown', (e) => {
  const items = dropdown.querySelectorAll('li');
  if (!items.length) return;

  if (e.key === 'ArrowDown') activeIndex = (activeIndex + 1) % items.length;
  if (e.key === 'ArrowUp') activeIndex = (activeIndex - 1 + items.length) % items.length;

  if (e.key === 'Enter') {
    e.preventDefault();
    items[activeIndex]?.click();
    return;
  }

  if (e.key === 'Escape') dropdown.style.display = 'none';

  items.forEach((li, i) => li.classList.toggle('active', i === activeIndex));
});

/* ================= ITEMS RENDER ================= */
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

/* ================= COLLECT ITEMS (AUTHORITATIVE) ================= */
function collectItems() {
  const rows = itemsContainer.querySelectorAll('.invoice-items-grid');
  const items = [];

  rows.forEach((row) => {
    const desc = row.querySelector('.item-desc')?.value.trim();
    const qty = Number(row.querySelector('.item-qty')?.value);
    const rate = Number(row.querySelector('.item-rate')?.value);

    if (desc && qty > 0 && rate > 0) {
      items.push({ description: desc, quantity: qty, rate });
    }
  });

  return items;
}

/* ================= ADD ITEM ================= */
addItemBtn?.addEventListener('click', () => {
  draft.items.push({ description: '', quantity: 1, rate: 0 });
  renderItems();
});

/* ================= DELETE ITEM ================= */
itemsContainer.addEventListener('click', (e) => {
  if (!e.target.classList.contains('item-delete')) return;
  const index = Number(e.target.dataset.index);
  draft.items.splice(index, 1);
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

/* ================= PREVIEW / CONTINUE (🔥 FIX) ================= */
document.getElementById('saveBtn')?.addEventListener('click', () => {
  try {
    if (!selectedClient || !selectedClient.client_id) {
      alert('Client missing');
      return;
    }

    const items = collectItems();
    if (!items.length) {
      alert('Add at least one invoice item');
      return;
    }

    const rebuiltDraft = {
      invoice_id: draft.invoice_id || null,

      client: {
        id: selectedClient.client_id,
        name: selectedClient.name,
        company: selectedClient.company || null,
        email: selectedClient.email || null,
      },

      invoice_date: invoiceDate.value,
      due_date: dueDate.value,

      items,
      taxes: draft.taxes || [],
      discount: Number(discountInput.value || 0),
      notes: notesInput.value || '',

      layout_id: layoutSelect.value || 'minimal',

      payment: {
        razorpay_enabled: enableRazorpay.checked === true,
      },
    };

    sessionStorage.setItem('invoiceDraft', JSON.stringify(rebuiltDraft));

    window.location.href = `/invoice-preview.html?id=${invoiceDbId}`;
  } catch (err) {
    console.error(err);
    alert('Something went wrong');
  }
});

/* ================= INIT ================= */
(async () => {
  await loadClients();
  await loadInvoice();
  prefillForm();
})();

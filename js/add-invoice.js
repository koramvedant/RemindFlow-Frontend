import { API_BASE } from './api.js';

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
const discountInput = document.getElementById('discount');
const notesInput = document.getElementById('notes');
const layoutSelect = document.getElementById('layoutSelect');
const enableRazorpay = document.getElementById('enableRazorpay');
const invoiceIdInput = document.getElementById('invoiceIdInput');

/* 🔑 ITEMS UI — FIXED ID */
const itemsContainer = document.getElementById('itemsContainer');

/* ================= STATE ================= */
let clients = [];
let selectedClient = null;
let activeIndex = -1;

/* ✅ SINGLE SOURCE OF TRUTH */
const items = [];

/* ================= FETCH CLIENTS ================= */
async function loadClients() {
  const headers = getAuthHeaders();
  if (!headers) return location.replace('/login.html');

  const res = await fetch(`${API_BASE}/api/clients`, { headers });
  const data = await res.json();
  clients = data.clients || [];
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
    return;
  }

  if (e.key === 'Escape') dropdown.style.display = 'none';

  listItems.forEach((li, i) =>
    li.classList.toggle('active', i === activeIndex)
  );
});

/* ================= ITEMS RENDER (GRID-ALIGNED) ================= */
function renderItems() {
  itemsContainer.innerHTML = '';

  items.forEach((item, index) => {
    const row = document.createElement('div');
    row.className = 'invoice-items-grid';

    row.innerHTML = `
      <input class="item-desc" value="${item.description}" />
      <input class="item-qty" type="number" value="${item.quantity}" />
      <input class="item-rate" type="number" value="${item.rate}" />

      <button
        type="button"
        class="item-delete"
        data-index="${index}"
        title="Delete item"
      >
        🗑
      </button>
    `;

    itemsContainer.appendChild(row);
  });
}

/* ================= ADD ITEM ================= */
addItemBtn.addEventListener('click', () => {
  items.push({
    description: '',
    quantity: 1,
    rate: 0,
  });

  renderItems();
});

/* ================= DELETE ITEM ================= */
itemsContainer.addEventListener('click', (e) => {
  if (!e.target.classList.contains('item-delete')) return;

  const index = Number(e.target.dataset.index);
  items.splice(index, 1);
  renderItems();
});

/* ================= SYNC DOM → STATE ================= */
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

/* ================= CONTINUE ================= */
continueBtn.onclick = () => {
  if (!selectedClient) return alert('Please select a client');

  syncItemsFromDOM();
  if (!items.length) return alert('Add at least one invoice item');

  const payload = {
    invoice_id: invoiceIdInput.value || null,
    invoice_date: invoiceDate.value,
    due_date: dueDate.value,
    client: selectedClient,
    items,
    notes: notesInput.value || '',
    payment: { razorpay_enabled: enableRazorpay.checked },
    layout_id: layoutSelect.value || 'minimal',
    status: 'draft',
  };

  sessionStorage.setItem('invoiceDraft', JSON.stringify(payload));
  window.location.href = '/invoice-preview.html';
};

/* ================= INIT ================= */
loadClients();

// add-invoice.js

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

const invoiceDate = document.getElementById('invoiceDate');
const dueDate = document.getElementById('dueDate');
const discount = document.getElementById('discount');
const notes = document.getElementById('notes');
const layoutSelect = document.getElementById('layoutSelect');

/* ================= STATE ================= */
let clients = [];
let selectedClient = null;
let activeIndex = -1;

/* ================= FETCH CLIENTS ================= */
async function loadClients() {
  const headers = getAuthHeaders();
  if (!headers) return location.replace('/login.html');

  const res = await fetch('/api/clients', { headers });
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
  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(val)
  );
  renderDropdown(filtered);
});

searchInput.addEventListener('keydown', (e) => {
  const items = dropdown.querySelectorAll('li');
  if (!items.length) return;

  if (e.key === 'ArrowDown') {
    activeIndex = (activeIndex + 1) % items.length;
  } else if (e.key === 'ArrowUp') {
    activeIndex = (activeIndex - 1 + items.length) % items.length;
  } else if (e.key === 'Enter') {
    e.preventDefault();
    items[activeIndex]?.click();
    return;
  } else if (e.key === 'Escape') {
    dropdown.style.display = 'none';
    return;
  }

  items.forEach((li, i) =>
    li.classList.toggle('active', i === activeIndex)
  );
});

/* ================= ITEMS ================= */
function getInvoiceItems() {
  const rows = document.querySelectorAll('.item-row');
  const items = [];

  rows.forEach((row) => {
    const description = row.querySelector('.item-desc')?.value.trim();
    const quantity = Number(row.querySelector('.item-qty')?.value);
    const rate = Number(row.querySelector('.item-rate')?.value);

    if (!description || quantity <= 0 || rate <= 0) return;
    items.push({ description, quantity, rate });
  });

  return items;
}

/* ================= TAX ================= */
function getTaxes() {
  const taxName = document.getElementById('taxName')?.value.trim();
  const taxRate = Number(document.getElementById('taxRate')?.value);
  if (!taxName || taxRate <= 0) return [];
  return [{ label: taxName, rate: taxRate }];
}

/* ================= CONTINUE ================= */
continueBtn.onclick = () => {
  if (!selectedClient) {
    alert('Please select a client');
    return;
  }

  const items = getInvoiceItems();
  if (!items.length) {
    alert('Add at least one invoice item');
    return;
  }

  const payload = {
    client_id: selectedClient.client_id,
    invoice_date: invoiceDate.value,
    due_date: dueDate.value,
    items,
    taxes: getTaxes(),
    discount: Number(discount.value) || 0,
    notes: notes.value || '',
    layout_id: Number(layoutSelect.value),
  };

  sessionStorage.setItem('invoiceDraft', JSON.stringify(payload));
  window.location.href = '/invoice-preview.html';
};

/* ================= INIT ================= */
loadClients();

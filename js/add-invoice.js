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
const discountInput = document.getElementById('discount');
const notesInput = document.getElementById('notes');
const layoutSelect = document.getElementById('layoutSelect');
const enableRazorpay = document.getElementById('enableRazorpay');

/* 🔑 NEW */
const invoiceIdInput = document.getElementById('invoiceIdInput');

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
  renderDropdown(
    clients.filter((c) => c.name.toLowerCase().includes(val))
  );
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

/* ================= TOTALS ================= */
function calculateSubtotal(items) {
  return items.reduce((sum, i) => sum + i.quantity * i.rate, 0);
}

function calculateTaxAmount(subtotal, taxes) {
  if (!taxes.length) return 0;
  return subtotal * (taxes[0].rate / 100);
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

  const subtotal = calculateSubtotal(items);
  const taxes = getTaxes();
  const taxAmount = calculateTaxAmount(subtotal, taxes);
  const discount = Number(discountInput.value) || 0;
  const total = subtotal + taxAmount - discount;

  /* 🔑 CRITICAL */
  const manualInvoiceId = invoiceIdInput?.value.trim();

  const payload = {
    invoice_id: manualInvoiceId || null, // ✅ FINAL RULE
    invoice_date: invoiceDate.value,
    due_date: dueDate.value,

    seller: {
      name: 'RemindFlow',
      email: 'billing@remindflow.in',
    },

    client: {
      id: selectedClient.client_id, // 🔒 REQUIRED
      name: selectedClient.name,
      email: selectedClient.email || '',
    },

    items,
    subtotal,
    taxes,
    discount,
    total,

    notes: notesInput.value || '',
    status: 'draft',

    payment: {
      razorpay_enabled: enableRazorpay?.checked || false,
    },

    layout_id: layoutSelect?.value || 'minimal',
  };

  sessionStorage.setItem('invoiceDraft', JSON.stringify(payload));
  window.location.href = '/invoice-preview.html';
};

/* ================= INIT ================= */
loadClients();

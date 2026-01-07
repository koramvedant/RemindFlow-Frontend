/* ------------------ Elements ------------------ */
const table = document.getElementById('invoiceTable');
const totalInvoices = document.getElementById('totalInvoices');
const searchInput = document.getElementById('searchInput');
const clientFilter = document.getElementById('clientFilter');
const statusFilter = document.getElementById('statusFilter');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const alertsDiv = document.getElementById('alerts');

/* ------------------ State ------------------ */
let clients = [];
let invoices = [];
let filtered = [];
let page = 1;
const perPage = 5;

/* ------------------ Helpers ------------------ */
function showAlert(message, type = 'success') {
  const alert = document.createElement('div');
  alert.className = `alert alert-${type}`;
  alert.textContent = message;
  alertsDiv?.appendChild(alert);
  setTimeout(() => {
    alert.classList.add('fade-out');
    setTimeout(() => alert.remove(), 300);
  }, 3000);
}

function getClientName(id) {
  return clients.find((c) => c.id === id)?.name || '-';
}

function getStatusClass(status) {
  switch ((status || '').toLowerCase()) {
    case 'paid': return 'status-paid';
    case 'pending': return 'status-pending';
    case 'overdue': return 'status-overdue';
    default: return '';
  }
}

/* ------------------ Render ------------------ */
function render() {
  table.innerHTML = '';

  const start = (page - 1) * perPage;
  const rows = filtered.slice(start, start + perPage);

  if (rows.length === 0) {
    table.innerHTML = `<tr><td colspan="6" style="text-align:center;">No invoices found</td></tr>`;
    totalInvoices.textContent = 0;
    return;
  }

  rows.forEach((inv) => {
    const row = document.createElement('tr');
    const statusClass = getStatusClass(inv.status);

    row.innerHTML = `
      <td>${inv.id}</td>
      <td>
        <span 
          class="client-link" 
          data-client-id="${inv.clientId}"
          style="color: var(--accent); cursor:pointer; font-weight:500;"
        >
          ${getClientName(inv.clientId)}
        </span>
      </td>
      <td>₹${inv.amount.toLocaleString()}</td>
      <td class="${statusClass}">${inv.status || '—'}</td>
      <td>${inv.date || '—'}</td>
      <td>
        <span class="action edit">Edit</span>
        <span class="action delete" data-id="${inv.id}">Delete</span>
      </td>
    `;
    table.appendChild(row);
  });

  totalInvoices.textContent = filtered.length;
  prevBtn.disabled = page === 1;
  nextBtn.disabled = page * perPage >= filtered.length;
}

/* ------------------ Filters ------------------ */
function applyFilters() {
  const search = (searchInput.value || '').toLowerCase();
  const client = clientFilter.value;
  const status = statusFilter.value;

  filtered = invoices.filter((inv) => {
    const idStr = String(inv.id || '');
    return (
      (idStr.toLowerCase().includes(search) ||
        getClientName(inv.clientId).toLowerCase().includes(search)) &&
      (!client || inv.clientId === client) &&
      (!status || inv.status === status)
    );
  });

  page = 1;
  render();
}

/* ------------------ Table Click ------------------ */
table.addEventListener('click', (e) => {
  if (e.target.classList.contains('client-link')) {
    const clientId = e.target.dataset.clientId;
    window.location.href = `invoice-logs.html?client_id=${clientId}`;
  }

  if (e.target.classList.contains('delete')) {
    if (!confirm('Delete this invoice?')) return;
    const idx = invoices.findIndex((i) => i.id == e.target.dataset.id);
    if (idx > -1) {
      invoices.splice(idx, 1);
      applyFilters();
      showAlert('Invoice deleted', 'success');
    }
  }
});

/* ------------------ Pagination ------------------ */
prevBtn.onclick = () => page > 1 && (page--, render());
nextBtn.onclick = () => page * perPage < filtered.length && (page++, render());

/* ------------------ Init ------------------ */
async function initInvoices() {
  try {
    // Fetch clients
    const clientsRes = await fetch('/api/clients', { credentials: 'include' });
    clients = (await clientsRes.json()) || [];

    // Populate client filter
    clientFilter.innerHTML = `<option value="">All Clients</option>`;
    clients.forEach((c) => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = c.name;
      clientFilter.appendChild(opt);
    });

    // Fetch invoices
    const invoicesRes = await fetch('/api/invoices', { credentials: 'include' });
    invoices = (await invoicesRes.json()) || [];

    filtered = [...invoices];
    render();
  } catch (err) {
    console.error(err);
    showAlert('Failed to load invoices', 'error');
  }
}

/* ------------------ Event Listeners ------------------ */
searchInput.addEventListener('input', applyFilters);
clientFilter.addEventListener('change', applyFilters);
statusFilter.addEventListener('change', applyFilters);

initInvoices();

/* ------------------ Read client_id from URL ------------------ */
const params = new URLSearchParams(window.location.search);
const clientId = params.get('client_id');

if (!clientId) {
  alert('Client not specified');
  window.location.href = '/clients';
  throw new Error('client_id missing');
}

/* ------------------ Client & Invoices ------------------ */
let client = null;
let invoices = [];

/* ------------------ Helper: Safe text ------------------ */
const setText = (id, value) => {
  const el = document.getElementById(id);
  if (el) el.textContent = value || '—';
};

/* ------------------ Pagination & Filtering ------------------ */
let filtered = [];
let page = 1;
const perPage = 5;

/* ------------------ Render Table ------------------ */
function render() {
  const tbody = document.getElementById('invoiceTable');
  if (!tbody) return;

  tbody.innerHTML = '';

  const start = (page - 1) * perPage;
  const rows = filtered.slice(start, start + perPage);

  if (rows.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;">No invoices found</td></tr>`;
    return;
  }

  rows.forEach(inv => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>#${inv.id || '—'}</td>
      <td>₹${inv.amount?.toLocaleString() || '—'}</td>
      <td>${inv.status || '—'}</td>
      <td>${inv.date || '—'}</td>
      <td class="actions">
        <a href="invoice-detail.html?id=${encodeURIComponent(inv.id)}">View</a>
        <a href="invoice-preview.html?id=${encodeURIComponent(inv.id)}">PDF</a>
        <a href="reminders.html?invoice_id=${encodeURIComponent(inv.id)}">Reminder</a>
      </td>
    `;
    tbody.appendChild(tr);
  });

  // Pagination buttons
  const nextBtn = document.getElementById('nextBtn');
  const prevBtn = document.getElementById('prevBtn');

  if (nextBtn) nextBtn.disabled = page * perPage >= filtered.length;
  if (prevBtn) prevBtn.disabled = page === 1;
}

/* ------------------ Filter Function ------------------ */
const filterBtn = document.getElementById('filterBtn');
if (filterBtn) {
  filterBtn.addEventListener('click', () => {
    const search = document.getElementById('searchInput')?.value.trim() || '';
    const status = document.getElementById('statusFilter')?.value || '';

    filtered = invoices.filter(i => {
      if (i.client_id !== clientId) return false;
      if (search && !i.id.toString().includes(search)) return false;
      if (status && i.status !== status) return false;
      return true;
    });

    page = 1;
    render();
  });
}

/* ------------------ Pagination Buttons ------------------ */
const nextBtn = document.getElementById('nextBtn');
const prevBtn = document.getElementById('prevBtn');

if (nextBtn) {
  nextBtn.onclick = () => {
    if (page * perPage < filtered.length) {
      page++;
      render();
    }
  };
}

if (prevBtn) {
  prevBtn.onclick = () => {
    if (page > 1) {
      page--;
      render();
    }
  };
}

/* ------------------ Sidebar Toggle ------------------ */
const sidebar = document.getElementById('sidebar');
const main = document.querySelector('.main');
const hamburger = document.getElementById('hamburger');
const sidebarKey = 'remindflow_sidebar_collapsed';

function applySidebarState(collapsed) {
  sidebar?.classList.toggle('collapsed', collapsed);
  main?.classList.toggle('collapsed', collapsed);
  localStorage.setItem(sidebarKey, collapsed ? '1' : '0');
}

if (hamburger && sidebar) {
  hamburger.onclick = () =>
    applySidebarState(!sidebar.classList.contains('collapsed'));

  applySidebarState(localStorage.getItem(sidebarKey) === '1');
}

/* ------------------ Fetch Client & Invoices ------------------ */
async function loadClientData() {
  try {
    const resClient = await fetch(`/api/clients/${clientId}`, { credentials: 'include' });
    if (!resClient.ok) throw new Error('Failed to fetch client');
    client = await resClient.json();

    setText('clientName', client.name);
    setText('clientEmail', client.email);
    setText('clientPhone', client.phone);
    setText('clientTrust', client.trust);

    const resInvoices = await fetch(`/api/invoices?client_id=${clientId}`, { credentials: 'include' });
    if (!resInvoices.ok) throw new Error('Failed to fetch invoices');
    invoices = await resInvoices.json();

    filtered = [...invoices];
    render();
  } catch (err) {
    console.error(err);
    alert('Failed to load client or invoices');
    window.location.href = '/clients';
  }
}

/* ------------------ Init ------------------ */
loadClientData();

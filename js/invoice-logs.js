// invoice-logs.js

/* ------------------ Read client_id from URL ------------------ */
const params = new URLSearchParams(window.location.search);
const clientId = params.get('client_id');

if (!clientId) {
  alert('Client not specified');
  window.location.href = '/clients.html';
  throw new Error('client_id missing');
}

/* ------------------ Auth Helper ------------------ */
function getAuthHeaders() {
  const token = localStorage.getItem('accessToken');
  if (!token) return null;

  return {
    Authorization: `Bearer ${token}`,
  };
}

/* ------------------ Client Info Header ------------------ */
async function loadClientInfo(clientId) {
  const headers = getAuthHeaders();
  if (!headers) {
    window.location.replace('/login.html');
    return;
  }

  try {
    const res = await fetch(`/api/clients/${clientId}`, { headers });
    const data = await res.json();

    if (!res.ok || !data.client) {
      throw new Error('Failed to load client');
    }

    const client = data.client;

    // Client Name
    const nameEl = document.getElementById('clientName');
    if (nameEl) nameEl.textContent = client.name;

    // User-based trust (optimistic default)
    const userTrust =
      client.status_flags?.user_trust_grade || 'A';

    const userTrustEl = document.getElementById('userTrust');
    if (userTrustEl) userTrustEl.textContent = userTrust;

    // Global trust (informational only)
    const globalTrust =
      client.global_trust_grade || '—';

    const globalTrustEl = document.getElementById('globalTrust');
    if (globalTrustEl) globalTrustEl.textContent = globalTrust;

  } catch (err) {
    console.error('Client info load failed:', err);
  }
}

/* ------------------ Invoices State ------------------ */
let invoices = [];
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
    tbody.innerHTML =
      `<tr><td colspan="5" style="text-align:center;">No invoices found</td></tr>`;
    return;
  }

  rows.forEach((inv) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>#${inv.id}</td>
      <td>₹${Number(inv.amount).toLocaleString()}</td>
      <td>${inv.status}</td>
      <td>${inv.date}</td>
      <td class="actions">
        <a href="/invoice-detail.html?id=${encodeURIComponent(inv.id)}">View</a>
        <a href="/invoice-preview.html?id=${encodeURIComponent(inv.id)}">PDF</a>
        <a href="/reminders.html?invoice_id=${encodeURIComponent(inv.id)}">Reminder</a>
      </td>
    `;
    tbody.appendChild(tr);
  });

  const nextBtn = document.getElementById('nextBtn');
  const prevBtn = document.getElementById('prevBtn');

  if (nextBtn) nextBtn.disabled = page * perPage >= filtered.length;
  if (prevBtn) prevBtn.disabled = page === 1;
}

/* ------------------ Filters ------------------ */
const filterBtn = document.getElementById('filterBtn');
if (filterBtn) {
  filterBtn.addEventListener('click', () => {
    const search = document.getElementById('searchInput')?.value.trim() || '';
    const status = document.getElementById('statusFilter')?.value || '';

    filtered = invoices.filter((i) => {
      if (search && !i.id.toString().includes(search)) return false;
      if (status && i.status !== status) return false;
      return true;
    });

    page = 1;
    render();
  });
}

/* ------------------ Pagination ------------------ */
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

/* ------------------ Fetch Invoices ------------------ */
async function loadInvoices() {
  const headers = getAuthHeaders();
  if (!headers) {
    window.location.replace('/login.html');
    return;
  }

  try {
    const res = await fetch(
      `/api/invoices/client/${encodeURIComponent(clientId)}`,
      { headers }
    );

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || 'Failed to fetch invoices');
    }

    // ✅ IMPORTANT: backend returns { success, invoices }
    invoices = (data.invoices || []).map((i) => ({
      id: i.id, // invoices.id (PK)
      amount: i.grand_total || 0,
      status: i.invoice_status,
      date: i.invoice_date || i.created_at?.split('T')[0] || '—',
    }));

    filtered = [...invoices];
    render();
  } catch (err) {
    console.error(err);
    alert('Failed to load invoices');
    window.location.href = '/clients.html';
  }
}

/* ------------------ Init ------------------ */
loadClientInfo(clientId);
loadInvoices();

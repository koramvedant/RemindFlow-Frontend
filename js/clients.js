// clients.js

import { API_BASE } from './api.js';

// ---------------- Clients Data ----------------
let clients = [];
let filtered = [];
let page = 1;
const perPage = 5;

// ---------------- Elements ----------------
const table = document.getElementById('clientTable');
const totalClients = document.getElementById('totalClients');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const searchInput = document.getElementById('searchInput');
const trustFilter = document.getElementById('trustFilter');


/* ------------------ Plan UI Helpers ------------------ */
function disableCreateButtons() {
  document
    .querySelectorAll('[data-requires-plan]')
    .forEach((btn) => {
      btn.style.pointerEvents = 'none';
      btn.style.opacity = '0.5';
      btn.title = 'Upgrade to create new clients';
      btn.classList.add('disabled-by-plan');
    });
}

function showUpgradeBanner() {
  if (document.getElementById('upgradeBanner')) return;

  const banner = document.createElement('div');
  banner.id = 'upgradeBanner';
  banner.style.background = '#ffe9e9';
  banner.style.color = '#b00020';
  banner.style.padding = '12px';
  banner.style.marginBottom = '16px';
  banner.style.borderRadius = '6px';
  banner.style.fontWeight = '500';
  banner.style.textAlign = 'center';
  banner.textContent = 'Your plan has expired. Please upgrade to continue.';

  const container =
    document.querySelector('.main') ||
    document.body;

  container.prepend(banner);
}

function applyPlanUIState(principal, expired) {
  if (expired) {
    disableCreateButtons();
    showUpgradeBanner();
  }
}

// ---------------- Render ----------------
function render() {
  if (!table) return;

  table.innerHTML = '';

  filtered
    .slice((page - 1) * perPage, page * perPage)
    .forEach((c) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${c.id}</td>
        <td>
          <a href="/invoice-logs.html?client_id=${c.id}" class="client-link">
            ${c.name}
          </a>
        </td>
        <td>
          <span 
            class="trust-badge trust-${c.trust}"
            title="Payment reliability score: ${c.reliabilityScore}/100"
          >
            ${c.trust}
          </span>
        </td>

        <td>${c.lastPayment || '-'}</td>
        <td>
          <span class="action edit" data-id="${c.id}">Edit</span>
          <span class="action delete" data-id="${c.id}">Delete</span>
        </td>
      `;
      table.appendChild(row);
    });

  if (totalClients) totalClients.textContent = filtered.length;
  if (prevBtn) prevBtn.disabled = page === 1;
  if (nextBtn) nextBtn.disabled = page * perPage >= filtered.length;
}

// ---------------- Filters ----------------
function applyFilters() {
  const s = searchInput?.value.toLowerCase() || '';
  const t = trustFilter?.value || '';

  filtered = clients.filter(
    (c) =>
      (c.id + c.name).toString().toLowerCase().includes(s) &&
      (!t || c.trust === t)
  );

  page = 1;
  render();
}

// ---------------- Fetch Clients ----------------
async function loadClients() {
  const token = localStorage.getItem('accessToken');
  if (!token) {
    window.location.replace('/login.html');
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/api/clients`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || 'Failed to load clients');
    }

    clients = (data.clients || []).map((c) => {
      return {
        id: c.client_id,
        name: c.name,
        trust: c.trust_grade || 'B',
        reliabilityScore: c.payment_reliability_score || 50,
        lastPayment: c.last_payment
          ? new Date(c.last_payment).toLocaleDateString('en-GB')
          : null,
      };
    });

    filtered = [...clients];
    render();
  } catch (err) {
    console.error('Load clients failed:', err);
    alert('Failed to load clients');
  }
}

// ---------------- Events ----------------
if (table) {
  table.addEventListener('click', (e) => {
    const id = e.target.dataset.id;
    if (!id) return;

    if (e.target.classList.contains('edit')) {
      window.location.href = `/edit-client.html?id=${id}`; // ✅ fixed
      return;
    }

    if (e.target.classList.contains('delete')) {
      const confirmed = confirm('Are you sure you want to delete this client?');
      if (!confirmed) return;

      clients = clients.filter((c) => c.id.toString() !== id.toString());
      applyFilters();
    }
  });
}

if (prevBtn) prevBtn.onclick = () => {
  if (page > 1) {
    page--;
    render();
  }
};

if (nextBtn) nextBtn.onclick = () => {
  if (page * perPage < filtered.length) {
    page++;
    render();
  }
};

if (searchInput) searchInput.addEventListener('input', applyFilters);
if (trustFilter) trustFilter.addEventListener('change', applyFilters);

/* ------------------ Plan Status Listener ------------------ */
window.addEventListener('planStatusReady', (e) => {
  applyPlanUIState(
    e.detail?.principal,
    e.detail?.expired
  );
});

window.addEventListener('trustUpdated', async (e) => {
  const clientId = e.detail?.clientId;
  if (!clientId) return;

  try {
    const token = localStorage.getItem('accessToken');

    const res = await fetch(
      `${API_BASE}/api/clients/${clientId}`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    const data = await res.json();
    if (!res.ok) return;

    const updated = data.client;

    const index = clients.findIndex(
      (c) => c.id.toString() === clientId.toString()
    );

    if (index !== -1) {
      clients[index].trust = updated.trust_grade || 'B';
      clients[index].reliabilityScore =
        updated.payment_reliability_score || 50;
    }

    applyFilters();
  } catch (err) {
    console.error('Trust live update failed:', err);
  }
});

// ---------------- Boot ----------------
loadClients();

// 🔥 Handle race condition
if (window.__USER_PLAN__) {
  applyPlanUIState(
    window.__USER_PLAN__,
    window.__PLAN_EXPIRED__
  );
}

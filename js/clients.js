// clients.js

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
        <td><strong>${c.userTrust}</strong></td>
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
      (!t || c.userTrust === t)
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
    const res = await fetch('/api/clients', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || 'Failed to load clients');
    }

    clients = (data.clients || []).map((c) => {
      let userTrust = 'A'; // ✅ default for new client

      if (c.status_flags && c.status_flags.user_trust_grade) {
        userTrust = c.status_flags.user_trust_grade;
      }

      return {
        id: c.client_id,
        name: c.name,
        userTrust,
        lastPayment: c.last_payment || null,
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
      window.location.href = `/clients-edit.html?id=${id}`;
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

// ---------------- Boot ----------------
loadClients();

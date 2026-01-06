// clients.js

// ---------------- Clients Data ----------------
// Will be loaded from backend/API or mock data
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

if (!table || !totalClients || !prevBtn || !nextBtn || !searchInput || !trustFilter) {
  console.warn("clients.js: One or more required elements are missing on this page.");
}

// ---------------- Render Function ----------------
function render() {
  if (!table) return;

  table.innerHTML = '';

  filtered.slice((page - 1) * perPage, page * perPage).forEach((c) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${c.id}</td>
      <td>
        <a href="/invoice-logs.html?client_id=${c.id}" class="client-link">
          ${c.name}
        </a>
      </td>
      <td>${c.trust || '-'}</td>
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

// ---------------- Filter Function ----------------
function applyFilters() {
  const s = searchInput?.value.toLowerCase() || "";
  const t = trustFilter?.value || "";

  filtered = clients.filter(
    (c) => ((c.id + c.name).toString().toLowerCase().includes(s)) && (!t || c.trust === t)
  );

  page = 1;
  render();
}

// ---------------- Event Listeners ----------------
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

      const idx = clients.findIndex((c) => c.id.toString() === id.toString());
      if (idx > -1) clients.splice(idx, 1);

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

// ---------------- Initial Render ----------------
filtered = [...clients];
render();

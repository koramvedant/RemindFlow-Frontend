// public/js/reminders.js
import { API_BASE } from './api.js';

/* -------------------------
   DOM Elements
------------------------- */
const tableBody = document.getElementById('reminderTable');
const searchInput = document.getElementById('searchInput');
const statusFilter = document.getElementById('statusFilter');

/* -------------------------
   State
------------------------- */
let reminders = [];

/* -------------------------
   Fetch Reminders
------------------------- */
async function fetchReminders() {
  try {
    const res = await fetch(`${API_BASE}/api/reminders`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) throw new Error('Failed to fetch reminders');

    const data = await res.json();
    reminders = data.reminders || [];
    renderTable();
  } catch (err) {
    console.error('Error fetching reminders:', err);
    tableBody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align:center; color:red;">
          Unable to load reminders
        </td>
      </tr>`;
  }
}

/* -------------------------
   Helper: Prepare Display List
------------------------- */
function prepareDisplayReminders() {
  const now = new Date();

  const sent = reminders.filter(r => r.status === 'sent');

  const upcoming = reminders
    .filter(r => r.status === 'active' && new Date(r.date) >= now)
    .reduce((map, r) => {
      // pick nearest upcoming per invoice
      if (
        !map[r.invoice_id] ||
        new Date(r.date) < new Date(map[r.invoice_id].date)
      ) {
        map[r.invoice_id] = r;
      }
      return map;
    }, {});

  return [
    ...Object.values(upcoming).sort((a, b) => new Date(a.date) - new Date(b.date)),
    ...sent.sort((a, b) => new Date(b.date) - new Date(a.date)),
  ];
}

/* -------------------------
   Render Table
------------------------- */
function renderTable() {
  tableBody.innerHTML = '';

  const search = searchInput?.value.toLowerCase() || '';
  const filter = statusFilter?.value;

  let displayReminders = prepareDisplayReminders();

  // Search filter
  displayReminders = displayReminders.filter(r =>
    r.client_name.toLowerCase().includes(search) ||
    r.invoice_code.toLowerCase().includes(search)
  );

  // Status filter
  if (filter === 'upcoming') {
    displayReminders = displayReminders.filter(r => r.status === 'active');
  } else if (filter === 'sent') {
    displayReminders = displayReminders.filter(r => r.status === 'sent');
  }

  if (displayReminders.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align:center;">No reminders found</td>
      </tr>`;
    return;
  }

  displayReminders.forEach(r => {
    const tr = document.createElement('tr');

    const stageText = r.stage
      .replace(/_/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());

    const statusText = r.status === 'active' ? 'Upcoming' : 'Sent';

    tr.innerHTML = `
      <td>${new Date(r.date).toLocaleDateString()}</td>
      <td>${r.invoice_code}</td>
      <td>${r.client_name}</td>
      <td class="stage">${stageText}</td>
      <td>
        <span class="badge ${r.status}">${statusText}</span>
      </td>
      <td>
        ${
          r.status === 'active' 
            ? r.reminders_paused
              ? `<button class="resume-invoice" data-invoice="${r.invoice_id}">
                   Resume
                 </button>`
              : `<button class="pause-invoice" data-invoice="${r.invoice_id}">
                   Pause
                 </button>`
            : '-'
        }
      </td>
    `;

    tableBody.appendChild(tr);
  });
}

/* -------------------------
   Invoice-level Pause / Resume (Delegated)
------------------------- */
tableBody.addEventListener('click', async (e) => {
  const invoiceId = e.target.dataset.invoice;
  if (!invoiceId) return;

  // ⏸ Pause reminders
  if (e.target.classList.contains('pause-invoice')) {
    if (!confirm('Pause all reminders for this invoice?')) return;

    const res = await fetch(
      `${API_BASE}/api/invoices/${invoiceId}/pause-reminders`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
      }
    );

    if (!res.ok) {
      alert('Failed to pause reminders');
      return;
    }

    fetchReminders();
  }

  // ▶ Resume reminders
  if (e.target.classList.contains('resume-invoice')) {
    if (!confirm('Resume reminders for this invoice?')) return;

    const res = await fetch(
      `${API_BASE}/api/invoices/${invoiceId}/resume-reminders`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
      }
    );

    if (!res.ok) {
      alert('Failed to resume reminders');
      return;
    }

    fetchReminders();
  }
});

/* -------------------------
   Event Listeners
------------------------- */
searchInput?.addEventListener('input', renderTable);
statusFilter?.addEventListener('change', renderTable);

/* -------------------------
   Init
------------------------- */
fetchReminders();

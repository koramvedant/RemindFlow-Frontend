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
    reminders = data.reminders || []; // ✅ FIXED
    renderTable();
  } catch (err) {
    console.error('Error fetching reminders:', err);
    tableBody.innerHTML = `<tr>
      <td colspan="6" style="text-align:center; color:red;">
        Unable to load reminders
      </td>
    </tr>`;
  }
}

/* -------------------------
   Render Table
------------------------- */
function renderTable() {
  tableBody.innerHTML = '';

  const search = searchInput?.value.toLowerCase() || '';
  const status = statusFilter?.value;

  const filtered = reminders.filter((r) => {
    const matchText =
      r.client_name.toLowerCase().includes(search) ||
      r.invoice_code.toLowerCase().includes(search);

    const matchStatus = status ? r.status === status : true;
    return matchText && matchStatus;
  });

  if (filtered.length === 0) {
    tableBody.innerHTML = `<tr>
      <td colspan="6" style="text-align:center;">No reminders found</td>
    </tr>`;
    return;
  }

  filtered.forEach((r) => {
    const tr = document.createElement('tr');

    // Capitalize stage for display
    const stageText = r.stage
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());

    const statusText =
      r.status === 'queued'
        ? 'Upcoming'
        : r.status.charAt(0).toUpperCase() + r.status.slice(1);

    tr.innerHTML = `
      <td>${new Date(r.date).toLocaleDateString()}</td>
      <td>${r.invoice_code}</td>
      <td>${r.client_name}</td>
      <td class="stage">${stageText}</td>
      <td>${r.channel}</td>
      <td>
        <span class="badge ${r.status}">${statusText}</span>
      </td>
    `;

    tableBody.appendChild(tr);
  });
}

/* -------------------------
   Event Listeners
------------------------- */
searchInput?.addEventListener('input', renderTable);
statusFilter?.addEventListener('change', renderTable);

/* -------------------------
   Init
------------------------- */
fetchReminders();

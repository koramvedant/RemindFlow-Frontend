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

  const history = reminders.filter(r => r.is_history);

  const upcoming = reminders
    .filter(r => r.status === 'active')
    .reduce((map, r) => {
      // pick nearest upcoming per invoice
      if (
        !map[r.invoice_id] ||
        new Date(r.scheduled_at) < new Date(map[r.invoice_id].scheduled_at)
      ) {
        map[r.invoice_id] = r;
      }
      return map;
    }, {});

  return [
    ...Object.values(upcoming).sort(
      (a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at)
    ),
    ...history.sort(
      (a, b) => new Date(b.scheduled_at) - new Date(a.scheduled_at)
    ),
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
      <td>${new Date(r.scheduled_at).toLocaleDateString('en-GB')}</td>
      <td>${r.invoice_code}</td>
      <td>${r.client_name}</td>
      <td class="stage">${stageText}</td>
      <td>
        <span class="badge ${r.status}">${statusText}</span>
      </td>
      <td>
        ${
          r.is_history && r.log_id
            ? `<button class="viewReminderBtn" data-id="${r.log_id}">
                 View
               </button>`
            : r.status === 'active'
              ? `<button class="pause-invoice" data-invoice="${r.invoice_id}">
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

document.addEventListener('click', async (e) => {
  if (!e.target.classList.contains('viewReminderBtn')) return;

  const logId = e.target.dataset.id;

  try {
    const res = await fetch(`${API_BASE}/api/reminders/logs/${logId}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
      },
    });

    const data = await res.json();
    if (!data.success) return;

    const reminder = data.reminder;

    document.getElementById('modalSubject').innerText = reminder.subject;

    document.getElementById('modalMeta').innerText =
      `Sent: ${new Date(reminder.sent_at).toLocaleString('en-GB')} | Mode: ${reminder.escalation_mode || 'standard'} | Status: ${reminder.status}`;

    document.getElementById('modalBody').innerHTML = reminder.body_html;

    document.getElementById('modalAttachment').innerHTML =
      reminder.attachment_key
        ? `📎 Attachment included`
        : '';

    document.getElementById('reminderModal').classList.add('open');

  } catch (err) {
    console.error('Failed to load reminder details', err);
  }
});

document.getElementById('closeReminderModal')
  ?.addEventListener('click', () => {
    document.getElementById('reminderModal')
      .classList.remove('open');
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

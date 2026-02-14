import { API_BASE } from './api.js';

const saveDraftBtn = document.getElementById('saveDraft');
const finalSaveBtn = document.getElementById('finalSave');
const box = document.getElementById('invoiceBox');
const layoutSelect = document.getElementById('layoutSelect');

function getAuthHeaders() {
  const token = localStorage.getItem('accessToken');
  return {
    Authorization: `Bearer ${token}`,
  };
}

const params = new URLSearchParams(window.location.search);
const invoiceId = params.get('id');

async function loadPreview() {
  const res = await fetch(
    `${API_BASE}/api/invoices/preview/${invoiceId}`,
    { headers: getAuthHeaders() }
  );

  const data = await res.json();

  box.innerHTML = data.html;
  layoutSelect.value = data.snapshot.layout_id;
}

layoutSelect?.addEventListener('change', async () => {
  await fetch(`${API_BASE}/api/invoices/${invoiceId}/layout`, {
    method: 'PUT',
    headers: {
      ...getAuthHeaders(),
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      layout_id: layoutSelect.value
    }),
  });

  await loadPreview();
});

if (!invoiceId) {
  box.innerHTML = '<p>Invoice not found</p>';
} else {
  loadPreview();
}

/* ---------------- FINALIZE ---------------- */
finalSaveBtn?.addEventListener('click', async () => {
  if (!invoiceId) return alert('Invoice not found');

  const confirmFinalize = confirm('Finalize this invoice?');
  if (!confirmFinalize) return;

  try {
    const res = await fetch(
      `${API_BASE}/api/invoices/${invoiceId}/finalize`,
      {
        method: 'PUT',
        headers: getAuthHeaders(),
      }
    );

    const data = await res.json();

    if (!res.ok) {
     if (res.status === 409) {
       // already finalized → just redirect
       window.location.href = '/invoices.html';
       return;
     }

     return alert(data.message || 'Failed to finalize invoice');
   }

    alert('Invoice finalized successfully');
    window.location.href = '/invoices.html';

  } catch (err) {
    console.error(err);
    alert('Something went wrong');
  }
});

/* ---------------- SAVE DRAFT ---------------- */
saveDraftBtn?.addEventListener('click', async () => {
  if (!invoiceId) return alert('Invoice not found');

  try {
    // Nothing to update because draft already exists.
    // Just redirect user back to invoices list.
    window.location.href = '/invoices.html';
  } catch (err) {
    console.error(err);
    alert('Something went wrong');
  }
});

// js/invoice-preview.js
// CHANGE: After finalize succeeds, fetch client email then open send modal
//         instead of redirecting to /invoices.html

import { API_BASE } from './api.js';

const saveDraftBtn = document.getElementById('saveDraft');
const finalSaveBtn = document.getElementById('finalSave');
const box = document.getElementById('invoiceBox');
const layoutSelect = document.getElementById('layoutSelect');

function getAuthHeaders() {
  const token = localStorage.getItem('accessToken');
  return { Authorization: `Bearer ${token}` };
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
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ layout_id: layoutSelect.value }),
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

  const overlay = document.getElementById('processingOverlay');
  const processingTitle = document.getElementById('processingTitle');
  const processingStep = document.getElementById('processingStep');

  try {
    finalSaveBtn.disabled = true;
    finalSaveBtn.innerText = 'Finalizing...';

    overlay.classList.remove('hidden');
    processingTitle.innerText = 'Finalizing Invoice';
    processingStep.innerText = 'Generating secure document...';

    const res = await fetch(
      `${API_BASE}/api/invoices/${invoiceId}/finalize`,
      { method: 'PUT', headers: getAuthHeaders() }
    );

    let data = {};
    try { data = await res.json(); } catch { /* ignore non-JSON */ }

    if (!res.ok) {
      if (res.status === 409) {
        // Already finalized — still open send modal if possible
        overlay.classList.add('hidden');
        window.location.href = '/invoices.html';
        return;
      }
      throw new Error(data.message || 'Failed to finalize invoice');
    }

    // ✅ Invoice finalized — now open the send modal
    processingStep.innerText = 'Ready to send...';

    // Fetch client email for display in the modal
    const clientEmail = await fetchClientEmail(invoiceId);

    overlay.classList.add('hidden');

    // Hand off to the send modal (defined in invoice-send-modal.js)
    window.openSendInvoiceModal(invoiceId, clientEmail);

  } catch (err) {
    console.error('Finalize error:', err);
    overlay.classList.add('hidden');
    alert(err.message || 'Something went wrong');

    finalSaveBtn.disabled = false;
    finalSaveBtn.innerText = 'Finalize Invoice';
  }
});

/* ---------------- Helper: get client email for modal display ---------------- */
async function fetchClientEmail(invoiceDbId) {
  try {
    const res = await fetch(
      `${API_BASE}/api/invoices/id/${invoiceDbId}`,
      { headers: getAuthHeaders() }
    );
    if (!res.ok) return null;
    const data = await res.json();
    // client_email is joined in getInvoiceByIdController
    // If not present, fall back gracefully — modal handles null
    return data.invoice?.client_email || null;
  } catch {
    return null;
  }
}

/* ---------------- SAVE DRAFT ---------------- */
saveDraftBtn?.addEventListener('click', async () => {
  if (!invoiceId) return alert('Invoice not found');

  const overlay = document.getElementById('processingOverlay');
  const stepText = document.getElementById('processingStep');

  const steps = [
    "Saving draft...",
    "Securing invoice snapshot...",
    "Redirecting..."
  ];

  let stepIndex = 0;

  function startStepRotation() {
    return setInterval(() => {
      if (stepIndex < steps.length - 1) {
        stepIndex++;
        stepText.innerText = steps[stepIndex];
      }
    }, 2000);
  }

  try {
    saveDraftBtn.disabled = true;
    overlay.classList.remove('hidden');

    const stepInterval = startStepRotation();

    await new Promise(resolve => setTimeout(resolve, 1500));

    clearInterval(stepInterval);

    stepText.innerText = "Draft saved. Redirecting...";

    setTimeout(() => {
      window.location.href = '/invoices.html';
    }, 600);

  } catch (err) {
    overlay.classList.add('hidden');
    saveDraftBtn.disabled = false;
    alert('Something went wrong');
  }
});
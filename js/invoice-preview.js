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
    finalSaveBtn.disabled = true;
    finalSaveBtn.innerText = 'Finalizing...';

    const res = await fetch(
      `${API_BASE}/api/invoices/${invoiceId}/finalize`,
      {
        method: 'PUT',
        headers: getAuthHeaders(),
      }
    );

    let data = {};
    try {
      data = await res.json();
    } catch {
      // If response isn't JSON, ignore
    }

    if (!res.ok) {
      if (res.status === 409) {
        // Already finalized → safe redirect
        window.location.href = '/invoices.html';
        return;
      }

      throw new Error(data.message || 'Failed to finalize invoice');
    }

    // ✅ Success
    window.location.href = '/invoices.html';

  } catch (err) {
    console.error('Finalize error:', err);
    alert(err.message || 'Something went wrong');

    finalSaveBtn.disabled = false;
    finalSaveBtn.innerText = 'Finalize';
  }
});

/* ---------------- SAVE DRAFT ---------------- */
finalSaveBtn?.addEventListener('click', async () => {
  if (!invoiceId) return alert('Invoice not found');

  const confirmFinalize = confirm('Finalize this invoice?');
  if (!confirmFinalize) return;

  const overlay = document.getElementById('processingOverlay');
  const stepText = document.getElementById('processingStep');

  const steps = [
    "Generating secure PDF...",
    "Uploading document...",
    "Updating payment tracking...",
    "Activating reminder workflow..."
  ];

  let stepIndex = 0;

  function startStepRotation() {
    return setInterval(() => {
      if (stepIndex < steps.length - 1) {
        stepIndex++;
        stepText.innerText = steps[stepIndex];
      }
    }, 5000);
  }

  try {
    // Lock UI
    finalSaveBtn.disabled = true;
    overlay.classList.remove('hidden');

    const stepInterval = startStepRotation();

    const res = await fetch(
      `${API_BASE}/api/invoices/${invoiceId}/finalize`,
      {
        method: 'PUT',
        headers: getAuthHeaders(),
      }
    );

    clearInterval(stepInterval);

    let data = {};
    try {
      data = await res.json();
    } catch {}

    if (!res.ok) {
      if (res.status === 409) {
        window.location.href = '/invoices.html';
        return;
      }
      throw new Error(data.message || 'Failed to finalize invoice');
    }

    // Smooth transition
    stepText.innerText = "Finalization complete. Redirecting...";

    setTimeout(() => {
      window.location.href = '/invoices.html';
    }, 800);

  } catch (err) {
    console.error('Finalize error:', err);

    overlay.classList.add('hidden');
    finalSaveBtn.disabled = false;

    alert(err.message || 'Something went wrong');
  }
});

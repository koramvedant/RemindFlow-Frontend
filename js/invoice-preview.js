/* ===================================================
   INVOICE PREVIEW — DRAFT + EXISTING
=================================================== */

/* ------------------ Elements ------------------ */
const box = document.getElementById('invoiceBox');

/* ------------------ Utility: Alert ------------------ */
function showAlert(message, type = 'success') {
  const alert = document.createElement('div');
  alert.className = `alert alert-${type}`;
  alert.textContent = message;
  document.body.appendChild(alert);

  setTimeout(() => {
    alert.classList.add('fade-out');
    setTimeout(() => alert.remove(), 300);
  }, 2500);
}

/* ------------------ Read URL + Draft ------------------ */
const params = new URLSearchParams(window.location.search);
const invoiceId = params.get('id');

let draft = null;
try {
  draft = JSON.parse(sessionStorage.getItem('invoiceDraft'));
} catch (_) {
  draft = null;
}

/* ===================================================
   RENDER: DRAFT PREVIEW
=================================================== */
function renderDraftPreview(draft) {
  if (!box) return;

  const total =
    draft.items.reduce(
      (sum, i) => sum + i.quantity * i.rate,
      0
    ) -
    (draft.discount || 0);

  box.innerHTML = `
    <h3>Invoice Preview (Draft)</h3>

    <p><strong>Client ID:</strong> ${draft.client_id}</p>
    <p><strong>Invoice Date:</strong> ${draft.invoice_date || '—'}</p>
    <p><strong>Due Date:</strong> ${draft.due_date || '—'}</p>

    <hr />

    <h4>Items</h4>
    <ul>
      ${draft.items
        .map(
          (i) =>
            `<li>${i.description} — ${i.quantity} × ₹${i.rate}</li>`
        )
        .join('')}
    </ul>

    ${
      draft.taxes?.length
        ? `<p><strong>Tax:</strong> ${draft.taxes[0].label} (${draft.taxes[0].rate}%)</p>`
        : ''
    }

    ${
      draft.discount
        ? `<p><strong>Discount:</strong> ₹${draft.discount}</p>`
        : ''
    }

    <p><strong>Total:</strong> ₹${total.toLocaleString()}</p>

    ${draft.notes ? `<p>${draft.notes}</p>` : ''}
  `;
}

/* ===================================================
   RENDER: EXISTING INVOICE
=================================================== */
async function loadExistingInvoice(id) {
  if (!box) return;

  try {
    const res = await fetch(`/api/invoices/${id}`, {
      credentials: 'include',
    });

    if (!res.ok) throw new Error('Failed to fetch invoice');

    const data = await res.json();

    box.innerHTML = `
      <h3>Invoice ${data.invoice_code || data.id}</h3>

      <p><strong>Client:</strong> ${data.client?.name || '—'}</p>
      <p><strong>Invoice Date:</strong> ${data.invoice_date || '—'}</p>
      <p><strong>Due Date:</strong> ${data.due_date || '—'}</p>
      <p><strong>Amount:</strong> ₹${data.grand_total?.toLocaleString() || '—'}</p>

      ${data.notes ? `<p>${data.notes}</p>` : ''}
    `;
  } catch (err) {
    console.error(err);
    alert('Failed to load invoice');
    window.location.href = '/dashboard.html';
  }
}

/* ===================================================
   BUTTONS
=================================================== */
document.getElementById('saveDraft')?.addEventListener('click', () => {
  showAlert('Draft saved');
  window.location.href = '/dashboard.html';
});

document.getElementById('finalSave')?.addEventListener('click', () => {
  showAlert('Invoice finalized');
  sessionStorage.removeItem('invoiceDraft');
  window.location.href = '/dashboard.html';
});

/* ===================================================
   INIT LOGIC
=================================================== */

// 1️⃣ Draft preview takes priority
if (draft) {
  renderDraftPreview(draft);
}
// 2️⃣ Existing invoice preview
else if (invoiceId) {
  loadExistingInvoice(invoiceId);
}
// 3️⃣ Nothing provided → real error
else {
  alert('Invoice not specified');
  window.location.href = '/dashboard.html';
  throw new Error('No invoice context');
}

/* ===================================================
   INVOICE PREVIEW — DRAFT + EXISTING (FINAL, FIXED)
=================================================== */

/* ------------------ Elements ------------------ */
const box = document.getElementById('invoiceBox');
const layoutSelect = document.getElementById('layoutSelect');

/* ------------------ Auth Helper ------------------ */
function getAuthHeaders() {
  const token = localStorage.getItem('accessToken');
  if (!token) return null;

  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

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

/* ------------------ URL + Draft ------------------ */
const params = new URLSearchParams(window.location.search);
const invoiceId = params.get('id');

let draft = null;
try {
  draft = JSON.parse(sessionStorage.getItem('invoiceDraft'));
} catch {
  draft = null;
}

/* ------------------ Layout Normalizer ------------------ */
function normalizeLayout(value) {
  return ['minimal', 'professional', 'modern'].includes(value)
    ? value
    : 'minimal';
}

/* ===================================================
   BUILD API PAYLOAD (AUTHORITATIVE)
=================================================== */
function buildInvoicePayload(draft) {
  if (!draft?.client?.id) {
    throw new Error('Client missing in draft');
  }

  if (!Array.isArray(draft.items) || draft.items.length === 0) {
    throw new Error('Invoice items missing');
  }

  return {
    invoice_id: draft.invoice_id || null,
    client_id: draft.client.id,
    invoice_date: draft.invoice_date,
    due_date: draft.due_date,
    items: draft.items,
    taxes: draft.taxes || [],
    discount: draft.discount || 0,
    notes: draft.notes || '',
    layout_id: normalizeLayout(draft.layout_id),
    payment: draft.payment || {},
  };
}

/* ===================================================
   TOTAL CALCULATOR
=================================================== */
function calculateTotal(invoice) {
  const subtotal =
    invoice.subtotal ??
    invoice.items.reduce((s, i) => s + i.quantity * i.rate, 0);

  const tax =
    (invoice.taxes || []).reduce(
      (sum, t) => sum + (subtotal * Number(t.rate || 0)) / 100,
      0
    );

  return subtotal + tax - Number(invoice.discount || 0);
}

/* ===================================================
   RENDER PREVIEW (DISPLAY FIX ONLY)
=================================================== */
function renderDraftPreview(invoice, rawLayout) {
  if (!box || !invoice || !Array.isArray(invoice.items)) return;

  const layout = normalizeLayout(rawLayout);
  const total = calculateTotal(invoice);

  /* FROM */
  const fromName =
    invoice.seller?.company_name ||
    invoice.business?.name ||
    '—';

  const fromEmail =
    invoice.seller?.email || '';

  /* BILLED TO */
  const billedToName =
    invoice.client?.company_name ||
    invoice.client?.name ||
    '—';

  const billedToEmail =
    invoice.client?.email || '';

  /* PAYMENT PREVIEW (VISUAL ONLY) */
  const paymentPreview =
    invoice.payment?.razorpay_enabled
      ? `
        <div class="payment-preview">
          <button class="pay-btn disabled" disabled>
            Pay Now
          </button>
          <p class="payment-note">
            (Payment button will be active after invoice is finalized)
          </p>
        </div>
      `
      : '';

  box.innerHTML = `
    <div class="invoice ${layout}">
      <h3>Invoice</h3>

      <p><strong>Invoice #:</strong> ${invoice.invoice_id || 'INV-XXXX'}</p>

      <hr />

      <p><strong>From:</strong><br/>
        ${fromName}<br/>
        ${fromEmail}
      </p>

      <p><strong>Billed To:</strong><br/>
        ${billedToName}<br/>
        ${billedToEmail}
      </p>

      <p><strong>Invoice Date:</strong> ${invoice.invoice_date || '—'}</p>
      <p><strong>Due Date:</strong> ${invoice.due_date || '—'}</p>

      <hr />

      <table width="100%">
        <thead>
          <tr>
            <th align="left">Description</th>
            <th align="right">Qty</th>
            <th align="right">Rate</th>
            <th align="right">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${invoice.items
            .map(
              (i) => `
              <tr>
                <td>${i.description}</td>
                <td align="right">${i.quantity}</td>
                <td align="right">₹${i.rate}</td>
                <td align="right">₹${(i.quantity * i.rate).toLocaleString()}</td>
              </tr>
            `
            )
            .join('')}
        </tbody>
      </table>

      <hr />
      <p><strong>Total:</strong> ₹${total.toLocaleString()}</p>

      ${paymentPreview}

      ${
        invoice.notes
          ? `<p><strong>Notes:</strong><br/>${invoice.notes}</p>`
          : ''
      }

      <div class="invoice-footer">
        Powered by <strong>RemindFlow</strong>
      </div>
    </div>
  `;
}

/* ===================================================
   LOAD EXISTING INVOICE (DB)
=================================================== */
async function loadExistingInvoice(id) {
  try {
    const headers = getAuthHeaders();
    if (!headers) return (window.location.href = '/login.html');

    const res = await fetch(`/api/invoices/id/${id}`, { headers });
    if (!res.ok) throw new Error('Fetch failed');

    const { invoice } = await res.json();
    renderDraftPreview(invoice, invoice.layout_id);
  } catch (err) {
    console.error(err);
    alert('Failed to load invoice');
    window.location.href = '/dashboard.html';
  }
}

/* ===================================================
   SAVE DRAFT (CREATE FLOW ONLY)
=================================================== */
if (!invoiceId && draft) {
  document.getElementById('saveDraft')?.addEventListener('click', async () => {
    try {
      const headers = getAuthHeaders();
      if (!headers) return (window.location.href = '/login.html');

      const payload = buildInvoicePayload(draft);

      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Save failed');

      sessionStorage.removeItem('invoiceDraft');
      showAlert('Draft saved');
      window.location.href = '/invoices.html';
    } catch (err) {
      console.error(err);
      alert(err.message);
    }
  });
}

/* ===================================================
   INIT (SOURCE OF TRUTH FIXED)
=================================================== */
if (invoiceId) {
  loadExistingInvoice(invoiceId);
} else if (draft) {
  renderDraftPreview(draft, draft.layout_id);

  layoutSelect?.addEventListener('change', () => {
    draft.layout_id = normalizeLayout(layoutSelect.value);
    sessionStorage.setItem('invoiceDraft', JSON.stringify(draft));
    renderDraftPreview(draft, draft.layout_id);
  });
} else {
  window.location.href = '/dashboard.html';
}

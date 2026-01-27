/* ===================================================
   INVOICE PREVIEW — FINAL (SENDER SOURCE FIXED)
=================================================== */

/* ------------------ Elements ------------------ */
const box = document.getElementById('invoiceBox');
const layoutSelect = document.getElementById('layoutSelect');
const saveDraftBtn = document.getElementById('saveDraft');
const finalSaveBtn = document.getElementById('finalSave');

/* ------------------ Auth Helper ------------------ */
function getAuthHeaders() {
  const token = localStorage.getItem('accessToken');
  if (!token) return {};
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

/* ------------------ Global Seller Cache ------------------ */
let currentSeller = null;

/* ------------------ Load Seller (SOURCE OF TRUTH) ------------------ */
async function loadSeller() {
  if (currentSeller) return currentSeller;

  try {
    const res = await fetch('/api/user/me', {
      headers: getAuthHeaders(),
      credentials: 'include',
    });

    if (!res.ok) throw new Error('Failed to load seller');

    const data = await res.json();
    currentSeller = data?.seller || null;
    return currentSeller;
  } catch (err) {
    console.error('Failed to load seller info:', err);
    return null;
  }
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
   NORMALIZE INVOICE FOR PREVIEW
=================================================== */
function normalizeInvoiceForPreview(invoice, seller) {
  return {
    ...invoice,
    seller: {
      company_name: seller?.company_name || '—',
      email: seller?.email || '',
    },
    client: {
      company_name:
        invoice.client?.company_name ||
        invoice.client?.company ||
        null,
      name: invoice.client?.name || '—',
      email: invoice.client?.email || '',
    },
  };
}

/* ===================================================
   BUILD API PAYLOAD
=================================================== */
function buildInvoicePayload(draft) {
  if (!draft?.client?.id) throw new Error('Client missing in draft');
  if (!Array.isArray(draft.items) || !draft.items.length)
    throw new Error('Invoice items missing');

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
    payment: {
      razorpay_enabled: !!draft.payment?.razorpay_enabled,
    },
  };
}

/* ===================================================
   TOTAL CALCULATOR
=================================================== */
function calculateTotal(invoice) {
  const subtotal =
    invoice.subtotal ??
    invoice.items.reduce((s, i) => s + i.quantity * i.rate, 0);

  const tax = (invoice.taxes || []).reduce(
    (sum, t) => sum + (subtotal * Number(t.rate || 0)) / 100,
    0
  );

  return subtotal + tax - Number(invoice.discount || 0);
}

/* ===================================================
   RENDER PREVIEW (UNCHANGED — PAYMENT KEPT)
=================================================== */
function renderDraftPreview(invoice, rawLayout) {
  if (!box || !invoice || !Array.isArray(invoice.items)) return;

  const layout = normalizeLayout(rawLayout);
  const total = calculateTotal(invoice);

  const razorpayEnabled =
    invoice.payment?.razorpay_enabled ||
    draft?.payment?.razorpay_enabled;

  const paymentPreview = razorpayEnabled
    ? `
      <div class="payment-section">
        <button class="pay-now-btn" disabled>Pay Now</button>
        <div class="payment-note">
          Payment button will be active after invoice is finalized
        </div>
      </div>
    `
    : '';

  box.innerHTML = `
    <div class="invoice ${layout}">
      <h3>Invoice</h3>
      <p><strong>Invoice #:</strong> ${invoice.invoice_id || 'INV-XXXX'}</p>
      <hr />

      <p><strong>From:</strong><br/>
        ${invoice.seller.company_name}<br/>
        ${invoice.seller.email}
      </p>

      <p><strong>Billed To:</strong><br/>
        ${invoice.client.company_name || invoice.client.name}<br/>
        ${invoice.client.email}
      </p>

      <p><strong>Invoice Date:</strong> ${invoice.invoice_date || '—'}</p>
      <p><strong>Due Date:</strong> ${invoice.due_date || '—'}</p>

      <hr />

      <table width="100%">
        <tbody>
          ${invoice.items.map(i => `
            <tr>
              <td>${i.description}</td>
              <td align="right">${i.quantity}</td>
              <td align="right">₹${i.rate}</td>
              <td align="right">₹${(i.quantity * i.rate).toLocaleString()}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <hr />
      <p><strong>Total:</strong> ₹${total.toLocaleString()}</p>
      ${paymentPreview}
    </div>
  `;
}

/* ===================================================
   LOAD EXISTING INVOICE
=================================================== */
async function loadExistingInvoice(id) {
  const seller = await loadSeller();
  const res = await fetch(`/api/invoices/id/${id}`, {
    headers: getAuthHeaders(),
  });
  const { invoice } = await res.json();
  renderDraftPreview(normalizeInvoiceForPreview(invoice, seller), invoice.layout_id);
}

/* ===================================================
   SAVE DRAFT (CREATE + EDIT)
=================================================== */
saveDraftBtn?.addEventListener('click', async () => {
  try {
    const payload = buildInvoicePayload(draft);

    const url = invoiceId
      ? `/api/invoices/${invoiceId}`
      : `/api/invoices`;

    const method = invoiceId ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });

    if (!res.ok) throw new Error('Save failed');

    sessionStorage.removeItem('invoiceDraft');
    showAlert('Draft saved');
    window.location.href = '/invoices.html';
  } catch (err) {
    alert(err.message);
  }
});

/* ===================================================
   FINALIZE INVOICE
=================================================== */
finalSaveBtn?.addEventListener('click', async () => {
  if (!invoiceId) return alert('Invoice not created yet');

  if (!confirm('Finalize this invoice?')) return;

  const res = await fetch(`/api/invoices/${invoiceId}/finalize`, {
    method: 'PUT',
    headers: getAuthHeaders(),
  });

  if (!res.ok) return alert('Finalize failed');

  sessionStorage.removeItem('invoiceDraft');
  window.location.href = '/invoices.html';
});

/* ===================================================
   INIT
=================================================== */
if (invoiceId) {
  loadExistingInvoice(invoiceId);
} else if (draft) {
  loadSeller().then(seller =>
    renderDraftPreview(
      normalizeInvoiceForPreview(draft, seller),
      draft.layout_id
    )
  );
}

import { API_BASE } from './api.js';

/* ===================================================
   INVOICE PREVIEW — DRAFT-FIRST + TAX SNAPSHOT SAFE
=================================================== */

/* ------------------ Elements ------------------ */
const box = document.getElementById('invoiceBox');
const layoutSelect = document.getElementById('layoutSelect');
const saveDraftBtn = document.getElementById('saveDraft');
const finalSaveBtn = document.getElementById('finalSave');

/* 🔑 PAYMENT DOM */
const paymentSection = document.getElementById('paymentSection');
const paymentUpi = document.getElementById('paymentUpi');
const paymentBank = document.getElementById('paymentBank');
const paymentCash = document.getElementById('paymentCash');

const upiText = document.getElementById('upiText');
const bankText = document.getElementById('bankText');

/* ------------------ Auth Helper ------------------ */
function getAuthHeaders() {
  const token = localStorage.getItem('accessToken');
  if (!token) return {};
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

/* ------------------ Date Formatter ------------------ */
function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d)) return '—';
  return d.toISOString().split('T')[0];
}

/* ------------------ Seller Cache ------------------ */
let currentSeller = null;

async function loadSeller() {
  if (currentSeller) return currentSeller;

  const res = await fetch(`${API_BASE}/api/user/me`, {
    headers: getAuthHeaders(),
    credentials: 'include',
  });

  const data = await res.json();
  currentSeller = data?.seller || null;
  return currentSeller;
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
   CANONICAL NORMALIZATION
=================================================== */
function normalizeInvoiceForPreview(invoice, seller) {
  return {
    ...invoice,

    seller: {
      company_name: seller?.company_name || '—',
      email: seller?.email || '',
      upi_id: seller?.upi_id || '',
      bank_name: seller?.bank_name || '',
      account_number: seller?.account_number || '',
      ifsc_code: seller?.ifsc_code || '',
    },

    client: {
      id: invoice.client?.id || invoice.client_id || null,
      name: invoice.client?.name || '—',
      company: invoice.client?.company || null,
      email: invoice.client?.email || '',
    },
  };
}

/* ------------------ Build API Payload (FIXED) ------------------ */
function buildInvoicePayload(draft) {
  const clientId =
    draft?.client?.id ||
    draft?.client?.client_id ||
    draft?.client_id;

  if (!clientId) {
    throw new Error('Client missing in draft');
  }

  if (!draft.items?.length) {
    throw new Error('Invoice items missing');
  }

  return {
    invoice_id: draft.invoice_id || null,
    client_id: clientId,
    invoice_date: draft.invoice_date,
    due_date: draft.due_date,
    items: draft.items,
    taxes: draft.taxes || [],

    discount: draft.discount || { type: 'flat', value: 0 },

    notes: draft.notes || '',
    layout_id: normalizeLayout(draft.layout_id),

    payment_methods: draft.payment_methods || {
      upi: false,
      bank: false,
      cash: false,
    },
  };
}

/* ------------------ Totals ------------------ */
function calculateTotals(invoice) {
  const subtotal = invoice.items.reduce(
    (s, i) => s + i.quantity * i.rate,
    0
  );

  const taxes = Array.isArray(invoice.taxes)
    ? invoice.taxes.map((t) => {
        const rate = Number(t.rate || 0);
        return {
          name: t.name,
          rate,
          amount: (subtotal * rate) / 100,
        };
      })
    : [];

  const totalTax = taxes.reduce((s, t) => s + t.amount, 0);

  const discountObj = invoice.discount || { type: 'flat', value: 0 };

  let discountAmount = 0;
  if (discountObj.type === 'percent') {
    discountAmount =
      (subtotal * Number(discountObj.value || 0)) / 100;
  } else {
    discountAmount = Number(discountObj.value || 0);
  }

  return {
    subtotal,
    taxes,
    discountAmount,
    discountLabel:
      discountObj.type === 'percent'
        ? `Discount (${discountObj.value}%)`
        : 'Discount',
    total: subtotal + totalTax - discountAmount,
  };
}

/* ------------------ Payment Instructions ------------------ */
function renderPaymentInstructions(invoice) {
  if (!paymentSection) return;

  const pm = invoice.payment_methods || {
    upi: false,
    bank: false,
    cash: false,
  };

  paymentSection.classList.add('hidden');
  paymentUpi.classList.add('hidden');
  paymentBank.classList.add('hidden');
  paymentCash.classList.add('hidden');

  let hasAny = false;

  if (pm.upi && invoice.seller?.upi_id) {
    upiText.textContent = invoice.seller.upi_id;
    paymentUpi.classList.remove('hidden');
    hasAny = true;
  }

  if (
    pm.bank &&
    invoice.seller?.bank_name &&
    invoice.seller?.account_number &&
    invoice.seller?.ifsc_code
  ) {
    bankText.innerHTML = `
      Bank: ${invoice.seller.bank_name}<br/>
      A/C: ${invoice.seller.account_number}<br/>
      IFSC: ${invoice.seller.ifsc_code}
    `;
    paymentBank.classList.remove('hidden');
    hasAny = true;
  }

  if (pm.cash) {
    paymentCash.classList.remove('hidden');
    hasAny = true;
  }

  if (hasAny) {
    paymentSection.classList.remove('hidden');
  }
}

/* ------------------ Render Preview ------------------ */
function renderDraftPreview(invoice, rawLayout) {
  if (!box || !invoice?.items) return;

  const layout = normalizeLayout(rawLayout);

  const {
    subtotal,
    taxes,
    discountAmount,
    discountLabel,
    total,
  } = calculateTotals(invoice);

  box.innerHTML = `
    <div class="invoice ${layout}">
      <h3>Invoice</h3>

      <p><strong>Invoice #:</strong> ${
        invoice.invoice_id || 'INV-XXXX'
      }</p>

      <p><strong>From:</strong><br/>
        ${invoice.seller.company_name}<br/>
        ${invoice.seller.email}
      </p>

      <p><strong>Billed To:</strong><br/>
        ${invoice.client.company || invoice.client.name}<br/>
        ${invoice.client.email}
      </p>

      <p><strong>Invoice Date:</strong> ${formatDate(invoice.invoice_date)}</p>
      <p><strong>Due Date:</strong> ${formatDate(invoice.due_date)}</p>

      <hr />

      <table width="100%">
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
      </table>

      <hr />

      <table width="100%">
        <tr>
          <td>Subtotal</td>
          <td align="right">₹${subtotal.toLocaleString()}</td>
        </tr>

        ${taxes
          .map(
            (t) => `
          <tr>
            <td>${t.name} (${t.rate}%)</td>
            <td align="right">₹${t.amount.toLocaleString()}</td>
          </tr>
        `
          )
          .join('')}

        ${
          discountAmount > 0
            ? `
          <tr>
            <td>${discountLabel}</td>
            <td align="right">-₹${discountAmount.toLocaleString()}</td>
          </tr>`
            : ''
        }

        <tr><td colspan="2"><hr /></td></tr>

        <tr>
          <td><strong>Total</strong></td>
          <td align="right"><strong>₹${total.toLocaleString()}</strong></td>
        </tr>
      </table>
    </div>
  `;

  renderPaymentInstructions(invoice);
}

/* ===================================================
   LOAD EXISTING (DRAFT FIRST)
=================================================== */
async function loadExistingInvoice(id) {
  const seller = await loadSeller();

  const storedDraft = sessionStorage.getItem('invoiceDraft');
  if (storedDraft) {
    draft = JSON.parse(storedDraft);
    const normalized = normalizeInvoiceForPreview(draft, seller);
    renderDraftPreview(normalized, normalized.layout_id);
    return;
  }

  const res = await fetch(`${API_BASE}/api/invoices/id/${id}`, {
    headers: getAuthHeaders(),
  });

  const { invoice } = await res.json();
  renderDraftPreview(
    normalizeInvoiceForPreview(invoice, seller),
    invoice.layout_id
  );
}

/* ------------------ Save Draft ------------------ */
saveDraftBtn?.addEventListener('click', async () => {
  try {
    const payload = buildInvoicePayload(draft);

    const url = invoiceId
      ? `${API_BASE}/api/invoices/${invoiceId}`
      : `${API_BASE}/api/invoices`;

    const method = invoiceId ? 'PUT' : 'POST';

    await fetch(url, {
      method,
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });

    sessionStorage.removeItem('invoiceDraft');
    window.location.href = '/invoices.html';
  } catch (err) {
    alert(err.message);
  }
});

/* ------------------ Finalize ------------------ */
finalSaveBtn?.addEventListener('click', async () => {
  if (!invoiceId) return alert('Invoice not created yet');

  if (!confirm('Finalize this invoice?')) return;

  await fetch(`${API_BASE}/api/invoices/${invoiceId}/finalize`, {
    method: 'PUT',
    headers: getAuthHeaders(),
  });

  sessionStorage.removeItem('invoiceDraft');
  window.location.href = '/invoices.html';
});

/* ------------------ Init ------------------ */
if (invoiceId) {
  loadExistingInvoice(invoiceId);
} else if (draft) {
  loadSeller().then((seller) =>
    renderDraftPreview(
      normalizeInvoiceForPreview(draft, seller),
      draft.layout_id
    )
  );
}

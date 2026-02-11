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

/* ------------------ Address Formatter (MANDATORY) ------------------ */
function formatAddress(entity) {
  if (!entity) return '';

  return [
    entity.address_line1,
    entity.address_line2,
    entity.city && entity.state
      ? `${entity.city}, ${entity.state}`
      : entity.city || entity.state,
    entity.postal_code,
    entity.country,
  ]
    .filter(Boolean)
    .join('<br/>');
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
async function fetchClientById(clientId) {
  if (!clientId) return null;

  const res = await fetch(`${API_BASE}/api/clients/${clientId}`, {
    headers: getAuthHeaders(),
  });

  if (!res.ok) return null;

  const data = await res.json();
  return data.client || null;
}


function normalizeInvoiceForPreview(invoice, seller) {
  return {
    ...invoice,

    seller: {
      name: seller?.name || '—',
      company_name: seller?.company_name || '—',
      email: seller?.email || '',

      address_line1: seller?.address_line1,
      address_line2: seller?.address_line2,
      city: seller?.city,
      state: seller?.state,
      postal_code: seller?.postal_code,
      country: seller?.country,

      upi_id: seller?.upi_id || '',
      bank_name: seller?.bank_name || '',
      account_number: seller?.account_number || '',
      ifsc_code: seller?.ifsc_code || '',
    },

    client: {
      id: invoice.client?.id || invoice.client_id || null,
      name: invoice.client?.name || '—',
      company_name: invoice.client?.company_name || null,
      email: invoice.client?.email || '',

      address_line1: invoice.client?.address_line1,
      address_line2: invoice.client?.address_line2,
      city: invoice.client?.city,
      state: invoice.client?.state,
      postal_code: invoice.client?.postal_code,
      country: invoice.client?.country,
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

/* ===================================================
   🔒 REUSABLE PARTY RENDERER (LOCKED ORDER)
=================================================== */
function renderParty(label, party) {
  return `
    <div class="party">
      <div class="party-label">${label}</div>
      <div class="party-body">
        <div class="party-name">${party.name}</div>
        ${
          party.company_name
            ? `<div class="party-company">${party.company_name}</div>`
            : ''
        }
        <div class="party-email">${party.email}</div>
        <div class="party-address">
          ${formatAddress(party)}
        </div>
      </div>
    </div>
  `;
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

      <!-- HEADER -->
      <div class="invoice-header">
        <div class="invoice-title">INVOICE</div>
        <div class="invoice-meta">
          <div><strong>Invoice #:</strong> ${invoice.invoice_id || 'INV-XXXX'}</div>
          <div><strong>Date:</strong> ${formatDate(invoice.invoice_date)}</div>
          <div><strong>Due Date:</strong> ${formatDate(invoice.due_date)}</div>
        </div>
      </div>

      <!-- PARTIES -->
      <div class="invoice-parties">
        ${renderParty('Billed To', invoice.client)}
        ${renderParty('From', invoice.seller)}
      </div>

      <hr />

      <!-- ITEMS -->
      <table width="100%" class="items-table">
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

      <!-- TOTALS -->
      <table width="100%" class="totals-table">
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

      ${
        invoice.notes
          ? `
        <div class="invoice-notes">
          <strong>Notes</strong><br/>
          ${invoice.notes}
        </div>
      `
          : ''
      }

    </div>
  `;

  // 🔒 DO NOT MOVE
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
    const client = 
     draft.client ||
      (draft.client_id ? await fetchClientById(draft.client_id) : null);

    const enrichedDraft = {
      ...draft,
      client,
    };
    const normalized = normalizeInvoiceForPreview(enrichedDraft, seller);
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

    let url;
    let method;

    if (invoiceId) {
      // 🔒 UPDATE EXISTING DRAFT → MUST USE invoice_code
      if (!draft.invoice_id) {
        throw new Error('Invoice code missing');
      }

      url = `${API_BASE}/api/invoices/code/${encodeURIComponent(draft.invoice_id)}`;
      method = 'PUT';
    } else {
      // 🆕 CREATE NEW DRAFT
      url = `${API_BASE}/api/invoices`;
      method = 'POST';
    }

    const res = await fetch(url, {
      method,
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Failed to save draft');
    }

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
  (async () => {
    const seller = await loadSeller();

    const client =
      draft.client ||
      (draft.client_id
        ? await fetchClientById(draft.client_id)
        : null);

    renderDraftPreview(
      normalizeInvoiceForPreview(
        { ...draft, client },
        seller
      ),
      draft.layout_id
    );
  })();
}

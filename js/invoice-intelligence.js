// ---------------- Initial Invoice Data ----------------
let invoices = []; // Will be populated from backend

// ---------------- Elements ----------------
const invoiceList = document.getElementById("invoice-list");
const alertsDiv = document.getElementById("alerts");

// ---------------- Utility Functions ----------------
const getStageLabel = stage => `label label-stage-${stage || '0'}`;
const getToneLabel = tone => `label label-tone-${tone?.toLowerCase() || 'neutral'}`;
const getRiskLabel = risk => `label label-risk-${risk?.toLowerCase() || 'unknown'}`;

function showAlert(message, type = "success") {
  if (!alertsDiv) return;

  const alert = document.createElement("div");
  alert.className = `alert alert-${type}`;
  alert.textContent = message;
  alertsDiv.appendChild(alert);

  setTimeout(() => {
    alert.classList.add("fade-out");
    setTimeout(() => alert.remove(), 300);
  }, 3500);
}

// Capitalize helper
function capitalize(str) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
}

// ---------------- Navigation ----------------
function openInvoiceDetail(invoiceId) {
  if (!invoiceId) return;
  window.location.href = `invoice-detail.html?id=${encodeURIComponent(invoiceId)}`;
}

function openClientProfile(clientName) {
  if (!clientName) return;
  window.location.href = `client-profile.html?client=${encodeURIComponent(clientName)}`;
}

// ---------------- Render Invoices ----------------
function renderInvoices() {
  if (!invoiceList) return;
  invoiceList.innerHTML = "";

  invoices.forEach((inv, index) => {
    const tr = document.createElement("tr");
    tr.classList.add("invoice-row");

    tr.innerHTML = `
      <td>${inv.id || '—'}</td>
      <td>${inv.client || '—'}</td>
      <td>₹${inv.amount?.toLocaleString() || '—'} / ${inv.dueDate || '—'}</td>
      <td><span class="${getStageLabel(inv.stage)}">Stage ${inv.stage || '—'}</span></td>
      <td><span class="${getToneLabel(inv.tone)}">${capitalize(inv.tone) || '—'}</span></td>
      <td><span class="${getRiskLabel(inv.risk)}">${inv.risk || '—'}</span></td>
      <td>
        <button class="action-btn action-pause" data-index="${index}">
          ${inv.paused ? "Resume" : "Pause"}
        </button>
        <button class="action-btn action-client" data-client="${inv.client}">
          View Client
        </button>
      </td>
    `;

    // Clicking the row navigates to Invoice Detail
    tr.addEventListener("click", () => {
      openInvoiceDetail(inv.id);
    });

    invoiceList.appendChild(tr);
  });

  attachActionListeners();
}

// ---------------- Action Listeners ----------------
function attachActionListeners() {
  // Pause / Resume Automation
  document.querySelectorAll(".action-pause").forEach(btn => {
    btn.onclick = e => {
      e.stopPropagation(); // Prevent row click
      const index = btn.dataset.index;
      if (!invoices[index]) return;

      invoices[index].paused = !invoices[index].paused;

      showAlert(
        invoices[index].paused
          ? `Automation paused for ${invoices[index].id}`
          : `Automation resumed for ${invoices[index].id}`
      );

      renderInvoices(); // Update button text
    };
  });

  // View Client
  document.querySelectorAll(".action-client").forEach(btn => {
    btn.onclick = e => {
      e.stopPropagation();
      const client = btn.dataset.client;
      if (!client) return;
      openClientProfile(client);
    };
  });
}

// ---------------- Initial Load ----------------
renderInvoices();

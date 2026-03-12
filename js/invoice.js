import { API_BASE } from "./api.js";

/* ------------------ Elements ------------------ */

const title = document.getElementById("invoiceTitle");
const clientName = document.getElementById("clientName");
const amount = document.getElementById("invoiceAmount");
const status = document.getElementById("invoiceStatus");
const due = document.getElementById("invoiceDue");
const timeline = document.getElementById("activityTimeline");

/* ------------------ Helpers ------------------ */

function getInvoiceId() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id");
}

function formatCurrency(value) {
  return Number(value || 0).toLocaleString("en-IN");
}

function formatDate(date) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

/* ------------------ Auth Fetch ------------------ */

function authFetch(url, options = {}) {
  const token = localStorage.getItem("accessToken");

  return fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  });
}

/* ------------------ Render Invoice ------------------ */

function renderInvoice(inv) {

  title.textContent = inv.invoice_id || "Invoice";

  clientName.textContent =
    inv.client_company || inv.client_name || "—";

  amount.textContent = formatCurrency(inv.grand_total);

  status.textContent = inv.invoice_status;

  due.textContent = formatDate(inv.due_date);
}

/* ------------------ Render Timeline ------------------ */

function renderTimeline(events) {

  timeline.innerHTML = "";

  if (!events.length) {
    timeline.innerHTML = "<p>No activity yet</p>";
    return;
  }

  events.forEach((e) => {

    let icon = "🔔";
    let text = "";

    if (e.type === "invoice_created") {
      icon = "📄";
      text = "Invoice created";
    }

    if (e.type === "reminder_sent") {

      const stageNames = {
        friendly: "Friendly",
        firm: "Firm",
        formal: "Formal",
        final: "Final"
      };

      text = `${stageNames[e.stage] || e.stage || ""} reminder sent`;
    }

    if (e.type === "payment_recorded") {
      icon = "💰";
      text = "Payment recorded";
    }

    timeline.innerHTML += `
      <div class="activity-item">
        <div class="activity-icon">${icon}</div>

        <div class="activity-content">
          <strong>${text}</strong>
          <span>${formatDate(e.event_time)}</span>
        </div>
      </div>
    `;
  });

}

/* ------------------ Load Page ------------------ */
async function loadInvoice() {

  const id = getInvoiceId();

  if (!id) {
    alert("Invoice not found");
    return;
  }

  try {

    /* ------------------ LOAD INVOICE ------------------ */

    const invoiceRes = await authFetch(`${API_BASE}/api/invoices/id/${id}`);

    if (!invoiceRes.ok) throw new Error("Invoice fetch failed");

    const invoiceData = await invoiceRes.json();

    const invoice = invoiceData.invoice;

    renderInvoice(invoice);

    /* ------------------ LOAD ACTIVITY ------------------ */

    const activityRes = await authFetch(`${API_BASE}/api/invoices/${id}/activity`);

    if (!activityRes.ok) throw new Error("Activity fetch failed");

    const activityData = await activityRes.json();

    renderTimeline(activityData.activity || []);

  } catch (err) {

    console.error(err);

    timeline.innerHTML = "<p>Failed to load invoice</p>";

  }

}
/* ------------------ Init ------------------ */

loadInvoice();
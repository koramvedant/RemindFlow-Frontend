// js/invoice.js
// CHANGES: Uses getActiveLocale() for currency and date formatting.

import { API_BASE } from "./api.js";
import { getActiveLocale, formatCurrency, formatDate as lcFormatDate } from "./localeConfig.js";

const title    = document.getElementById("invoiceTitle");
const clientEl = document.getElementById("clientName");
const amountEl = document.getElementById("invoiceAmount");
const statusEl = document.getElementById("invoiceStatus");
const dueEl    = document.getElementById("invoiceDue");
const timeline = document.getElementById("activityTimeline");

/* ── Helpers ────────────────────────────────────────────── */
function getInvoiceId() {
  return new URLSearchParams(window.location.search).get("id");
}

// Use locale from localStorage
const lc = getActiveLocale();

function fmtCurrency(value) {
  return formatCurrency(value, lc.countryCode);
}

function fmtDate(date) {
  return lcFormatDate(date, lc.countryCode);
}

function fmtDateTime(date) {
  if (!date) return "—";
  return new Date(date).toLocaleString(lc.locale, {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

/* ── Auth ───────────────────────────────────────────────── */
function authFetch(url, options = {}) {
  const token = localStorage.getItem("accessToken");
  return fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}

/* ── Render invoice meta ────────────────────────────────── */
function renderInvoice(inv) {
  title.textContent    = inv.invoice_id || "Invoice";
  clientEl.textContent = inv.client_company || inv.client_name || "—";
  amountEl.textContent = fmtCurrency(inv.grand_total);
  statusEl.textContent = inv.invoice_status;
  dueEl.textContent    = fmtDate(inv.due_date);
}

/* ── Render timeline ────────────────────────────────────── */
function renderTimeline(events) {
  timeline.innerHTML = "";

  if (!events.length) {
    timeline.innerHTML = "<p style='color:var(--text-3);font-size:14px;'>No activity yet</p>";
    return;
  }

  events.forEach((e) => {
    let icon = "🔔", text = "", subtext = "";

    if (e.type === "invoice_created") {
      icon = "📄"; text = "Invoice created";
    }

    if (e.type === "invoice_sent") {
      icon = "📧";
      text = `Invoice emailed to ${e.recipient_email || "client"}`;
      subtext = e.email_opened
        ? `<span class="activity-opened-badge">✓ Opened ${e.email_opened_at ? fmtDateTime(e.email_opened_at) : ""}</span>`
        : `<span class="activity-not-opened">Not opened yet</span>`;
    }

    if (e.type === "invoice_scheduled") {
      icon = "📅";
      text = `Invoice send scheduled for ${fmtDateTime(e.scheduled_at)}`;
    }

    if (e.type === "reminder_sent") {
      const stageNames = { friendly: "Friendly", firm: "Firm", formal: "Formal", final: "Final" };
      icon = "🔔";
      text = `${stageNames[e.stage] || e.stage || ""} reminder sent`;
      if (e.email_opened) {
        subtext = `<span class="activity-opened-badge">✓ Opened ${e.email_opened_at ? fmtDateTime(e.email_opened_at) : ""}</span>`;
      }
    }

    if (e.type === "payment_recorded") {
      icon = "💰"; text = "Payment recorded";
    }

    timeline.innerHTML += `
      <div class="activity-item">
        <div class="activity-icon">${icon}</div>
        <div class="activity-content">
          <strong>${text}</strong>
          <span>${fmtDate(e.event_time)}</span>
          ${subtext}
        </div>
      </div>`;
  });
}

/* ── Load ───────────────────────────────────────────────── */
async function loadInvoice() {
  const id = getInvoiceId();
  if (!id) { alert("Invoice not found"); return; }

  try {
    const [invoiceRes, activityRes] = await Promise.all([
      authFetch(`${API_BASE}/api/invoices/id/${id}`),
      authFetch(`${API_BASE}/api/invoices/${id}/activity`),
    ]);

    if (!invoiceRes.ok) throw new Error("Invoice fetch failed");
    if (!activityRes.ok) throw new Error("Activity fetch failed");

    const { invoice }  = await invoiceRes.json();
    const { activity } = await activityRes.json();

    renderInvoice(invoice);
    renderTimeline(activity || []);
  } catch (err) {
    console.error(err);
    timeline.innerHTML = "<p>Failed to load invoice</p>";
  }
}

loadInvoice();
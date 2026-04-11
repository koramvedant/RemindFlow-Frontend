/**
 * invoice-send-modal.js
 *
 * Handles the "Send Invoice" modal that appears after Finalize Invoice.
 *
 * Flow:
 *   Finalize Invoice clicked (in invoice-preview.js)
 *     → processingOverlay shown → invoice saved to backend
 *     → on success: backend returns invoiceId + clientEmail
 *     → window.openSendInvoiceModal(invoiceId, clientEmail) is called
 *     → modal opens with two choices:
 *         1. Send Now   → POST /api/invoices/:id/send
 *         2. Schedule   → POST /api/invoices/:id/send  { scheduledAt: ISO string }
 *     → on success: show success screen → redirect to invoice detail page
 *
 * Integration point in invoice-preview.js:
 *   After your existing finalize API call succeeds, call:
 *     window.openSendInvoiceModal(savedInvoiceId, clientEmail);
 */

const API_BASE = window.API_BASE || "";

/* ── DOM refs ─────────────────────────────────────────── */
const modal           = document.getElementById("sendInvoiceModal");
const emailDisplay    = document.getElementById("simClientEmail");
const confirmEmailEl  = document.getElementById("simConfirmEmail");

const step1           = document.getElementById("simStep1");
const stepConfirmNow  = document.getElementById("simStepConfirmNow");
const stepSchedule    = document.getElementById("simStepSchedule");
const stepSuccess     = document.getElementById("simStepSuccess");

const sendNowBtn      = document.getElementById("simSendNowBtn");
const scheduleBtn     = document.getElementById("simScheduleBtn");
const skipBtn         = document.getElementById("simSkipBtn");

const backFromNow     = document.getElementById("simBackFromNow");
const confirmSendNow  = document.getElementById("simConfirmSendNow");

const backFromSched   = document.getElementById("simBackFromSchedule");
const confirmSched    = document.getElementById("simConfirmSchedule");
const schedDateInput  = document.getElementById("simScheduleDate");
const schedTimeInput  = document.getElementById("simScheduleTime");
const schedHint       = document.getElementById("simScheduleHint");

const successTitle    = document.getElementById("simSuccessTitle");
const successMsg      = document.getElementById("simSuccessMsg");
const doneBtn         = document.getElementById("simDoneBtn");

/* ── State ────────────────────────────────────────────── */
let _invoiceId   = null;
let _clientEmail = null;

/* ── Helpers ──────────────────────────────────────────── */
function showOnly(el) {
  [step1, stepConfirmNow, stepSchedule, stepSuccess].forEach(s => {
    s.classList.toggle("hidden", s !== el);
  });
}

function openModal() {
  modal.classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function closeModal() {
  modal.classList.add("hidden");
  document.body.style.overflow = "";
}

/** Pre-fill date/time inputs to tomorrow 9 AM as a sensible default */
function prefillSchedule() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);

  const yyyy = tomorrow.getFullYear();
  const mm   = String(tomorrow.getMonth() + 1).padStart(2, "0");
  const dd   = String(tomorrow.getDate()).padStart(2, "0");
  schedDateInput.value = `${yyyy}-${mm}-${dd}`;
  schedTimeInput.value = "09:00";
  updateScheduleHint();

  // Set min date to today
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}-${String(today.getDate()).padStart(2,"0")}`;
  schedDateInput.min = todayStr;
}

function updateScheduleHint() {
  const d = schedDateInput.value;
  const t = schedTimeInput.value;
  if (!d || !t) { schedHint.textContent = ""; return; }

  const dt = new Date(`${d}T${t}`);
  if (isNaN(dt)) { schedHint.textContent = ""; return; }

  const now = new Date();
  const diffMs = dt - now;
  if (diffMs <= 0) {
    schedHint.textContent = "⚠️ Please pick a future date and time.";
    schedHint.style.color = "#ef4444";
    return;
  }

  schedHint.style.color = "#64748b";
  const diffH = Math.round(diffMs / (1000 * 60 * 60));
  if (diffH < 24) {
    schedHint.textContent = `Invoice will be sent in about ${diffH} hour${diffH !== 1 ? "s" : ""}.`;
  } else {
    const diffD = Math.round(diffH / 24);
    schedHint.textContent = `Invoice will be sent in about ${diffD} day${diffD !== 1 ? "s" : ""}.`;
  }
}

function setButtonLoading(btn, loading) {
  if (loading) {
    btn.disabled = true;
    btn.dataset.origText = btn.innerHTML;
    btn.innerHTML = `<span class="sim-spinner"></span> Sending…`;
  } else {
    btn.disabled = false;
    if (btn.dataset.origText) btn.innerHTML = btn.dataset.origText;
  }
}

/* ── API calls ────────────────────────────────────────── */
async function sendNow() {
  const token = localStorage.getItem("authToken") || sessionStorage.getItem("authToken") || "";
  const res = await fetch(`${API_BASE}/api/invoices/${_invoiceId}/send`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ sendMode: "now" }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Failed to send invoice.");
  }
  return res.json();
}

async function scheduleInvoice(isoDateTime) {
  const token = localStorage.getItem("authToken") || sessionStorage.getItem("authToken") || "";
  const res = await fetch(`${API_BASE}/api/invoices/${_invoiceId}/send`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ sendMode: "scheduled", scheduledAt: isoDateTime }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Failed to schedule invoice.");
  }
  return res.json();
}

/* ── Event wiring ─────────────────────────────────────── */

// Step 1 → Confirm Now
sendNowBtn.addEventListener("click", () => {
  confirmEmailEl.textContent = _clientEmail || "your client";
  showOnly(stepConfirmNow);
});

// Step 1 → Schedule
scheduleBtn.addEventListener("click", () => {
  prefillSchedule();
  showOnly(stepSchedule);
});

// Skip — just close and redirect to invoice detail
skipBtn.addEventListener("click", () => {
  closeModal();
  if (_invoiceId) {
    window.location.href = `/invoice-detail.html?id=${_invoiceId}`;
  }
});

// Back from Confirm Now
backFromNow.addEventListener("click", () => showOnly(step1));

// Back from Schedule
backFromSched.addEventListener("click", () => showOnly(step1));

// Confirm Send Now
confirmSendNow.addEventListener("click", async () => {
  setButtonLoading(confirmSendNow, true);
  try {
    await sendNow();
    successTitle.textContent = "Invoice Sent!";
    successMsg.textContent   = `The invoice has been emailed to ${_clientEmail}.`;
    doneBtn.textContent      = "Go to Invoice →";
    showOnly(stepSuccess);
  } catch (err) {
    alert(err.message || "Something went wrong. Please try again.");
  } finally {
    setButtonLoading(confirmSendNow, false);
  }
});

// Confirm Schedule
confirmSched.addEventListener("click", async () => {
  const d = schedDateInput.value;
  const t = schedTimeInput.value;

  if (!d || !t) {
    alert("Please select both a date and a time.");
    return;
  }

  const dt = new Date(`${d}T${t}`);
  if (isNaN(dt) || dt <= new Date()) {
    alert("Please pick a future date and time.");
    return;
  }

  setButtonLoading(confirmSched, true);
  try {
    await scheduleInvoice(dt.toISOString());

    // Format for display: "12 Apr 2026 at 9:00 AM"
    const formatted = dt.toLocaleDateString("en-IN", {
      day: "numeric", month: "short", year: "numeric",
    }) + " at " + dt.toLocaleTimeString("en-IN", {
      hour: "2-digit", minute: "2-digit",
    });

    successTitle.textContent = "Invoice Scheduled!";
    successMsg.textContent   = `The invoice will be emailed to ${_clientEmail} on ${formatted}.`;
    doneBtn.textContent      = "Go to Invoice →";
    showOnly(stepSuccess);
  } catch (err) {
    alert(err.message || "Something went wrong. Please try again.");
  } finally {
    setButtonLoading(confirmSched, false);
  }
});

// Done button → invoice detail
doneBtn.addEventListener("click", () => {
  closeModal();
  if (_invoiceId) {
    window.location.href = `/invoice-detail.html?id=${_invoiceId}`;
  }
});

// Live hint update on schedule inputs
schedDateInput.addEventListener("change", updateScheduleHint);
schedTimeInput.addEventListener("change", updateScheduleHint);

// Close on backdrop click
modal.addEventListener("click", (e) => {
  if (e.target === modal) {
    // Only allow close on step 1 or success (not mid-flow)
    if (!step1.classList.contains("hidden") || !stepSuccess.classList.contains("hidden")) {
      closeModal();
      if (_invoiceId && !stepSuccess.classList.contains("hidden")) {
        window.location.href = `/invoice-detail.html?id=${_invoiceId}`;
      }
    }
  }
});

// Escape key closes on step 1
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !modal.classList.contains("hidden")) {
    if (!step1.classList.contains("hidden")) {
      closeModal();
    }
  }
});

/* ── Public API ───────────────────────────────────────── */
/**
 * Call this from invoice-preview.js after the invoice is finalized.
 *
 * @param {string} invoiceId   - The saved invoice ID from your backend
 * @param {string} clientEmail - The client's email address to display
 */
window.openSendInvoiceModal = function(invoiceId, clientEmail) {
  _invoiceId   = invoiceId;
  _clientEmail = clientEmail || "your client";

  emailDisplay.textContent   = _clientEmail;
  confirmEmailEl.textContent = _clientEmail;

  showOnly(step1);
  openModal();
};
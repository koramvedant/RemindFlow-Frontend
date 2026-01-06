// ---------------- Initial Invoice Detail ----------------
let invoiceDetail = {
    id: '',
    client: '',
    amount: 0,
    dueDate: '',
    escalationTimeline: [],
    currentDecision: { stage: 0, tone: '', reason: '' },
    maxStage: 0
  };
  
  // ---------------- Elements ----------------
  const invIdElem = document.getElementById("inv-id");
  const invClientElem = document.getElementById("inv-client");
  const invAmountElem = document.getElementById("inv-amount");
  const invDueElem = document.getElementById("inv-due");
  const timelineElem = document.getElementById("timeline");
  const currentStageElem = document.getElementById("current-stage");
  const currentToneElem = document.getElementById("current-tone");
  const currentReasonElem = document.getElementById("current-reason");
  const pauseBtn = document.getElementById("pause-btn");
  const maxStageSelect = document.getElementById("max-stage");
  const softerToneBtn = document.getElementById("softer-tone-btn");
  const alertsDiv = document.getElementById("alerts");
  
  // ---------------- Utility Functions ----------------
  function showAlert(message, type = "success") {
    if (!alertsDiv) return;
  
    const alert = document.createElement("div");
    alert.className = `alert alert-${type}`;
    alert.textContent = message;
    alertsDiv.appendChild(alert);
  
    setTimeout(() => {
      alert.classList.add("fade-out");
      setTimeout(() => alert.remove(), 300);
    }, 4000);
  }
  
  function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
  
  // ---------------- Render Functions ----------------
  function renderSummary() {
    if (invIdElem) invIdElem.textContent = invoiceDetail.id || '—';
    if (invClientElem) invClientElem.textContent = invoiceDetail.client || '—';
    if (invAmountElem) invAmountElem.textContent = invoiceDetail.amount ? invoiceDetail.amount.toLocaleString() : '—';
    if (invDueElem) invDueElem.textContent = invoiceDetail.dueDate || '—';
  }
  
  function renderTimeline() {
    if (!timelineElem) return;
  
    timelineElem.innerHTML = "";
    invoiceDetail.escalationTimeline.forEach(event => {
      const li = document.createElement("li");
      li.textContent = `Stage ${event.stage} - ${capitalize(event.tone)} (${event.date}): ${event.reason}`;
      timelineElem.appendChild(li);
    });
  }
  
  function renderCurrentDecision() {
    const dec = invoiceDetail.currentDecision;
  
    if (currentStageElem) currentStageElem.textContent = dec.stage ? `Stage ${dec.stage}` : '—';
    if (currentToneElem) currentToneElem.textContent = dec.tone ? capitalize(dec.tone) : '—';
    if (currentReasonElem) currentReasonElem.textContent = dec.reason || '—';
    if (maxStageSelect) maxStageSelect.value = invoiceDetail.maxStage || 0;
  }
  
  // ---------------- Manual Controls ----------------
  pauseBtn?.addEventListener("click", () => {
    if (!invoiceDetail.id) return;
    showAlert(`Automation paused for ${invoiceDetail.id}`, "success");
  });
  
  maxStageSelect?.addEventListener("change", () => {
    invoiceDetail.maxStage = parseInt(maxStageSelect.value) || 0;
    showAlert(`Max escalation stage set to ${invoiceDetail.maxStage}`, "success");
  });
  
  softerToneBtn?.addEventListener("click", () => {
    invoiceDetail.currentDecision.tone = "friendly";
    renderCurrentDecision();
    showAlert("Tone forced to friendly", "success");
  });
  
  // ---------------- Initial Load ----------------
  function initDetailView() {
    renderSummary();
    renderTimeline();
    renderCurrentDecision();
  }
  
  initDetailView();
  
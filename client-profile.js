// client-profile.js

// ---------------- Mock Client Data ----------------
const clientProfile = {
    name: "Acme Corp",
    usualPayDays: 7,
    usualEscalation: "Friendly",
    trustGrade: "A",
    overrides: {
      toneBias: false,
      preDueReminder: false,
      excludeFinalNotice: false
    }
  };
  
  // ---------------- Elements ----------------
  const clientNameElem = document.getElementById("client-name");
  const payDaysElem = document.getElementById("pay-days");
  const usualEscalationElem = document.getElementById("usual-escalation");
  const trustGradeElem = document.getElementById("trust-grade");
  
  const toneBiasChk = document.getElementById("tone-bias");
  const preDueChk = document.getElementById("pre-due-reminder");
  const excludeFinalChk = document.getElementById("exclude-final");
  
  const alertsDiv = document.getElementById("alerts");
  
  // ---------------- Utility Functions ----------------
  
  // Show alert
  function showAlert(message, type = "success") {
    if (!alertsDiv) return;
  
    const alert = document.createElement("div");
    alert.className = `alert alert-${type}`;
    alert.textContent = message;
    alertsDiv.appendChild(alert);
  
    setTimeout(() => {
      alert.classList.add("fade-out");
      setTimeout(() => alert.remove(), 300);
    }, 3000);
  }
  
  // ---------------- Render Functions ----------------
  function renderProfile() {
    if (clientNameElem) clientNameElem.textContent = clientProfile.name;
    if (payDaysElem) payDaysElem.textContent = clientProfile.usualPayDays;
    if (usualEscalationElem) usualEscalationElem.textContent = clientProfile.usualEscalation;
    if (trustGradeElem) trustGradeElem.textContent = clientProfile.trustGrade;
  
    // Set checkboxes from overrides
    if (toneBiasChk) toneBiasChk.checked = clientProfile.overrides.toneBias;
    if (preDueChk) preDueChk.checked = clientProfile.overrides.preDueReminder;
    if (excludeFinalChk) excludeFinalChk.checked = clientProfile.overrides.excludeFinalNotice;
  }
  
  // ---------------- Event Listeners ----------------
  if (toneBiasChk) {
    toneBiasChk.addEventListener("change", () => {
      clientProfile.overrides.toneBias = toneBiasChk.checked;
      showAlert(`Permanent tone bias ${toneBiasChk.checked ? "enabled" : "disabled"}`, "success");
    });
  }
  
  if (preDueChk) {
    preDueChk.addEventListener("change", () => {
      clientProfile.overrides.preDueReminder = preDueChk.checked;
      showAlert(`Pre-due reminder ${preDueChk.checked ? "enabled" : "disabled"}`, "success");
    });
  }
  
  if (excludeFinalChk) {
    excludeFinalChk.addEventListener("change", () => {
      clientProfile.overrides.excludeFinalNotice = excludeFinalChk.checked;
      showAlert(`Excluded from final notice ${excludeFinalChk.checked ? "enabled" : "disabled"}`, "success");
    });
  }
  
  // ---------------- Initial Load ----------------
  function initClientProfile() {
    // Load saved overrides if any
    const savedOverrides = localStorage.getItem("clientProfileOverrides");
    if (savedOverrides) {
      clientProfile.overrides = JSON.parse(savedOverrides);
    }
  
    renderProfile();
  }
  
  // Save overrides to localStorage on change
  [toneBiasChk, preDueChk, excludeFinalChk].forEach(chk => {
    if (chk) {
      chk.addEventListener("change", () => {
        localStorage.setItem("clientProfileOverrides", JSON.stringify(clientProfile.overrides));
      });
    }
  });
  
  initClientProfile();
  
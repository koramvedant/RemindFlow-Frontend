// automation-control.js

// ---------------- Mock / Initial Settings ----------------
let automationSettings = {
    automationOn: false,
    maxEscalation: 3,
    cooldown: "Low"
  };
  
  // ---------------- Elements ----------------
  const automationToggle = document.getElementById("automation-toggle");
  const automationStatus = document.getElementById("automation-status");
  const maxEscalation = document.getElementById("max-escalation");
  const cooldownRadios = document.querySelectorAll('input[name="cooldown"]');
  const saveBtn = document.getElementById("save-settings");
  const alertsDiv = document.getElementById("alerts");
  
  // ---------------- Utility Functions ----------------
  
  // Update UI based on settings
  function updateUI() {
    if (!automationToggle || !automationStatus || !maxEscalation) return;
  
    automationToggle.checked = automationSettings.automationOn;
    automationStatus.textContent = automationSettings.automationOn ? "ON" : "OFF";
    maxEscalation.value = automationSettings.maxEscalation;
  
    cooldownRadios.forEach(radio => {
      radio.checked = radio.value === automationSettings.cooldown;
    });
  }
  
  // Show alert message with fade animation
  function showAlert(message, type = "success") {
    if (!alertsDiv) return;
  
    const alert = document.createElement("div");
    alert.className = `alert alert-${type}`;
    alert.textContent = message;
    alertsDiv.appendChild(alert);
  
    // Remove alert with fade-out
    setTimeout(() => {
      alert.classList.add("fade-out");
      setTimeout(() => alert.remove(), 300);
    }, 4000);
  }
  
  // Save settings to localStorage (simulate backend save)
  function saveSettings() {
    localStorage.setItem("automationSettings", JSON.stringify(automationSettings));
    showAlert("Settings saved successfully!", "success");
  }
  
  // ---------------- Event Listeners ----------------
  if (automationToggle) {
    automationToggle.addEventListener("change", () => {
      // Fade out text
      if (automationStatus) automationStatus.style.opacity = 0;
  
      setTimeout(() => {
        automationSettings.automationOn = automationToggle.checked;
        if (automationStatus) automationStatus.textContent = automationSettings.automationOn ? "ON" : "OFF";
        // Fade in new text
        if (automationStatus) automationStatus.style.opacity = 1;
      }, 150);
    });
  }
  
  if (maxEscalation) {
    maxEscalation.addEventListener("change", () => {
      automationSettings.maxEscalation = parseInt(maxEscalation.value) || 1;
    });
  }
  
  if (cooldownRadios.length > 0) {
    cooldownRadios.forEach(radio => {
      radio.addEventListener("change", () => {
        if (radio.checked) {
          automationSettings.cooldown = radio.value;
        }
      });
    });
  }
  
  if (saveBtn) {
    saveBtn.addEventListener("click", () => {
      saveSettings();
    });
  }
  
  // ---------------- Initial Load ----------------
  function loadSettings() {
    const saved = localStorage.getItem("automationSettings");
    if (saved) {
      automationSettings = JSON.parse(saved);
    }
    updateUI();
  }
  
  loadSettings();
  
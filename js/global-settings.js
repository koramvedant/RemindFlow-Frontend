// global-settings.js

// Elements
const acknowledgeBtn = document.getElementById("acknowledge-btn");
const alertsDiv = document.getElementById("alerts");

// ---------------- Utility Functions ----------------

// Show alert message safely
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

// ---------------- Event Listeners ----------------
acknowledgeBtn?.addEventListener("click", () => {
  // Simulate saving acknowledgement locally
  localStorage.setItem("settingsAcknowledged", "true");
  showAlert("Acknowledged & saved successfully!", "success");
});

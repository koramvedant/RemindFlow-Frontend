// alerts-center.js

// ---------------- Mock Alerts Data ----------------
const alertsData = [
    {
      date: "2026-01-01T09:15",
      type: "Integration Failure",
      invoice: "INV-1001",
      client: "Acme Corp",
      message: "Failed to sync with Zoho.",
    },
    {
      date: "2026-01-02T10:30",
      type: "Automation Paused",
      invoice: "INV-1002",
      client: "Beta Ltd",
      message: "Automation paused due to error in escalation rules.",
    },
    {
      date: "2026-01-03T11:45",
      type: "High-Risk Invoice",
      invoice: "INV-1003",
      client: "Acme Corp",
      message: "Invoice overdue with high payment risk.",
    },
    {
      date: "2026-01-04T14:20",
      type: "Final Notice",
      invoice: "INV-1004",
      client: "Gamma Inc",
      message: "Final notice reached for unpaid invoice.",
    }
  ];
  
  // ---------------- Elements ----------------
  const alertsListElem = document.getElementById("alerts-list");
  const filterDate = document.getElementById("filter-date");
  const filterType = document.getElementById("filter-type");
  const alertsDiv = document.getElementById("alerts-messages");
  
  // ---------------- Utility Functions ----------------
  
  // Show feedback alert
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
  
  // Format Date for table
  function formatDate(dateStr) {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleString([], { dateStyle: "short", timeStyle: "short" });
  }
  
  // ---------------- Render Table ----------------
  function renderAlertsTable(entries) {
    if (!alertsListElem) return;
    alertsListElem.innerHTML = "";
    if (!entries || entries.length === 0) {
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      td.colSpan = 5;
      td.style.textAlign = "center";
      td.textContent = "No alerts found.";
      tr.appendChild(td);
      alertsListElem.appendChild(tr);
      return;
    }
  
    entries.forEach(alert => {
      const tr = document.createElement("tr");
  
      // Date
      const tdDate = document.createElement("td");
      tdDate.textContent = formatDate(alert.date);
      tr.appendChild(tdDate);
  
      // Type
      const tdType = document.createElement("td");
      tdType.textContent = alert.type;
      tr.appendChild(tdType);
  
      // Invoice / Client
      const tdInvoice = document.createElement("td");
      tdInvoice.textContent = `${alert.invoice} / ${alert.client}`;
      tr.appendChild(tdInvoice);
  
      // Message
      const tdMessage = document.createElement("td");
      tdMessage.textContent = alert.message;
      tr.appendChild(tdMessage);
  
      // Actions
      const tdAction = document.createElement("td");
  
      // Resolve button
      const resolveBtn = document.createElement("button");
      resolveBtn.className = "btn-action btn-resolve";
      resolveBtn.textContent = "Resolve";
      resolveBtn.addEventListener("click", () => {
        showAlert(`Alert resolved: ${alert.type}`, "success");
        const index = alertsData.indexOf(alert);
        if (index > -1) alertsData.splice(index, 1);
        applyFilters();
      });
  
      // View button
      const viewBtn = document.createElement("button");
      viewBtn.className = "btn-action btn-view";
      viewBtn.textContent = "View";
      viewBtn.addEventListener("click", () => {
        showAlert(`Viewing alert for ${alert.invoice}`, "success");
      });
  
      tdAction.appendChild(resolveBtn);
      tdAction.appendChild(viewBtn);
      tr.appendChild(tdAction);
  
      alertsListElem.appendChild(tr);
    });
  }
  
  // ---------------- Filtering ----------------
  function applyFilters() {
    if (!alertsListElem) return;
  
    let filtered = alertsData.slice();
  
    const dateVal = filterDate?.value || "";
    const typeVal = filterType?.value || "";
  
    if (dateVal) filtered = filtered.filter(e => e.date.startsWith(dateVal));
    if (typeVal) filtered = filtered.filter(e => e.type === typeVal);
  
    renderAlertsTable(filtered);
  }
  
  // ---------------- Event Listeners ----------------
  if (filterDate) filterDate.addEventListener("change", applyFilters);
  if (filterType) filterType.addEventListener("change", applyFilters);
  
  // ---------------- Initial Load ----------------
  renderAlertsTable(alertsData);
  
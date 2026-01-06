// ---------------- Mock Log Data ----------------
const logEntries = [
    {
      date: "2026-01-01T10:15",
      invoice: "INV-1001",
      client: "Acme Corp",
      action: "Invoice evaluated",
      stage: 1,
      outcome: "Low risk"
    },
    {
      date: "2026-01-02T09:30",
      invoice: "INV-1002",
      client: "Beta Ltd",
      action: "Stage advanced",
      stage: 2,
      outcome: "Medium risk"
    },
    {
      date: "2026-01-03T11:45",
      invoice: "INV-1003",
      client: "Acme Corp",
      action: "Automation paused",
      stage: 2,
      outcome: "Paused by user"
    },
    {
      date: "2026-01-04T14:20",
      invoice: "INV-1004",
      client: "Gamma Inc",
      action: "Payment detected",
      stage: 3,
      outcome: "Paid"
    }
  ];
  
  // ---------------- Elements ----------------
  const logListElem = document.getElementById("log-list");
  const filterDate = document.getElementById("filter-date");
  const filterClient = document.getElementById("filter-client");
  const filterStage = document.getElementById("filter-stage");
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
  
  // Format Date for table display
  function formatDate(dateStr) {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleString([], { dateStyle: "short", timeStyle: "short" });
  }
  
  // ---------------- Render Table ----------------
  function renderLogTable(entries) {
    if (!logListElem) return;
    logListElem.innerHTML = "";
    if (!entries || entries.length === 0) {
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      td.colSpan = 6;
      td.style.textAlign = "center";
      td.textContent = "No log entries found.";
      tr.appendChild(td);
      logListElem.appendChild(tr);
      return;
    }
  
    entries.forEach(entry => {
      const tr = document.createElement("tr");
  
      ["date", "invoice", "client", "action", "stage", "outcome"].forEach(key => {
        const td = document.createElement("td");
        td.textContent = key === "date" ? formatDate(entry[key]) : entry[key];
        tr.appendChild(td);
      });
  
      logListElem.appendChild(tr);
    });
  }
  
  // ---------------- Filtering ----------------
  function applyFilters() {
    let filtered = logEntries.slice();
  
    const dateVal = filterDate ? filterDate.value : "";
    const clientVal = filterClient ? filterClient.value.toLowerCase() : "";
    const stageVal = filterStage ? filterStage.value : "";
  
    if (dateVal) filtered = filtered.filter(e => e.date.startsWith(dateVal));
    if (clientVal) filtered = filtered.filter(e => e.client.toLowerCase().includes(clientVal));
    if (stageVal) filtered = filtered.filter(e => e.stage.toString() === stageVal);
  
    renderLogTable(filtered);
  }
  
  // ---------------- Event Listeners ----------------
  if (filterDate) filterDate.addEventListener("change", applyFilters);
  if (filterClient) filterClient.addEventListener("input", applyFilters);
  if (filterStage) filterStage.addEventListener("change", applyFilters);
  
  // ---------------- Initial Load ----------------
  renderLogTable(logEntries);
  
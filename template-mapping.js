// public/js/template-mapping.js

/* ----------------------
   Mock Template Mapping Data
---------------------- */
const templateMapping = [
    {
      tone: "Friendly",
      templateName: "Reminder_Friendly",
      lastUpdated: "2026-01-01 10:15 AM",
      zohoLink: "https://zoho.com/templates/reminder_friendly"
    },
    {
      tone: "Direct",
      templateName: "Reminder_Direct",
      lastUpdated: "2026-01-02 09:30 AM",
      zohoLink: "https://zoho.com/templates/reminder_direct"
    },
    {
      tone: "Firm",
      templateName: "Reminder_Firm",
      lastUpdated: "2026-01-03 11:45 AM",
      zohoLink: "https://zoho.com/templates/reminder_firm"
    }
  ];
  
  /* ----------------------
     DOM Elements
  ---------------------- */
  const templateListElem = document.getElementById("template-list");
  const alertsDiv = document.getElementById("alerts");
  
  /* ----------------------
     Utility Functions
  ---------------------- */
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
  
  /* ----------------------
     Render Template Table
  ---------------------- */
  function renderTemplateTable() {
    if (!templateListElem) return;
  
    templateListElem.innerHTML = "";
  
    templateMapping.forEach(template => {
      const tr = document.createElement("tr");
  
      // Tone
      const tdTone = document.createElement("td");
      tdTone.textContent = template.tone;
      tr.appendChild(tdTone);
  
      // Template Name
      const tdTemplate = document.createElement("td");
      tdTemplate.textContent = template.templateName;
      tr.appendChild(tdTemplate);
  
      // Last Updated
      const tdUpdated = document.createElement("td");
      tdUpdated.textContent = template.lastUpdated;
      tr.appendChild(tdUpdated);
  
      // Preview Button
      const tdPreview = document.createElement("td");
      const previewBtn = document.createElement("button");
      previewBtn.className = "btn-preview";
      previewBtn.textContent = "Preview";
      previewBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        showAlert(`Previewing template: ${template.templateName}`, "success");
      });
      tdPreview.appendChild(previewBtn);
      tr.appendChild(tdPreview);
  
      // Open in Zoho link
      const tdZoho = document.createElement("td");
      const zohoLink = document.createElement("a");
      zohoLink.className = "btn-zoho";
      zohoLink.href = template.zohoLink;
      zohoLink.target = "_blank";
      zohoLink.rel = "noopener noreferrer";
      zohoLink.textContent = "Open in Zoho";
      tdZoho.appendChild(zohoLink);
      tr.appendChild(tdZoho);
  
      templateListElem.appendChild(tr);
    });
  }
  
  /* ----------------------
     Initial Load
  ---------------------- */
  renderTemplateTable();
  
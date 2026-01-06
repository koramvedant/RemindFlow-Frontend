// add-client.js

// Elements
const form = document.getElementById('addClientForm');
const toggleBtn = document.getElementById('toggleAdvanced');
const advancedFields = document.getElementById('advancedFields');

// ------------------------------
// Toggle Advanced Section Smoothly
// ------------------------------
if (toggleBtn && advancedFields) {
  toggleBtn.addEventListener('click', () => {
    advancedFields.classList.toggle('open');
    toggleBtn.textContent = advancedFields.classList.contains('open')
      ? '− Hide Advanced Details'
      : '+ Advanced Details';
  });
}

// ------------------------------
// Toast Notification Function
// ------------------------------
function showToast(message, duration = 2000) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);

  // Show and auto-remove
  setTimeout(() => {
    toast.classList.add('show');
  }, 10);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => document.body.removeChild(toast), 300);
  }, duration);
}

// ------------------------------
// Handle Form Submission
// ------------------------------
if (form) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Collect form data
    const payload = {
      name: document.getElementById('clientName')?.value.trim(),
      email: document.getElementById('clientEmail')?.value.trim() || null,
      phone: document.getElementById('clientPhone')?.value.trim() || null,
      company: document.getElementById('clientCompany')?.value.trim() || null,
      client_address: document.getElementById('clientAddress')?.value.trim() || null,
      client_tax_id: document.getElementById('clientTaxId')?.value.trim() || null,
      notes: document.getElementById('clientNotes')?.value.trim() || null,
    };

    // Basic Validation
    if (!payload.name) {
      showToast('Client name is required');
      return;
    }

    try {
      // Send data to backend
      const res = await fetch('/api/clients/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // keep if using cookies for auth
        body: JSON.stringify(payload),
      });

      const result = await res.json();

      if (res.ok) {
        // Success toast
        showToast('Client added successfully!');
        // Redirect after short delay
        setTimeout(() => {
          window.location.href = '/clients';
        }, 1200);
      } else {
        // Backend error
        showToast('Error adding client: ' + (result.message || 'Unknown error'));
      }
    } catch (err) {
      // Network / server error
      console.error('Error submitting client:', err);
      showToast('Failed to add client. Please try again.');
    }
  });
}

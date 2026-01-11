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

  setTimeout(() => toast.classList.add('show'), 10);

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

    const token = localStorage.getItem('accessToken');
    if (!token) {
      window.location.replace('/login.html');
      return;
    }

    // Collect form data (MATCH BACKEND CONTRACT)
    const payload = {
      name: document.getElementById('clientName')?.value.trim(),
      email: document.getElementById('clientEmail')?.value.trim(),
      phone: document.getElementById('clientPhone')?.value.trim() || null,
      company: document.getElementById('clientCompany')?.value.trim() || null,
      address: document.getElementById('clientAddress')?.value.trim() || null,
      tax_id: document.getElementById('clientTaxId')?.value.trim() || null,
      notes: document.getElementById('clientNotes')?.value.trim() || null,
    };

    // Basic validation
    if (!payload.name || !payload.email) {
      showToast('Client name and email are required');
      return;
    }

    try {
      // 🔴 CORRECT ROUTE + AUTH HEADER
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.message || 'Failed to add client');
      }

      // ✅ Success
      showToast('Client added successfully!');
      setTimeout(() => {
        window.location.href = '/clients.html';
      }, 1200);

    } catch (err) {
      console.error('Error adding client:', err);
      showToast(err.message || 'Failed to add client');
    }
  });
}

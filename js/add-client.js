// js/add-client.js
// CHANGES:
//   - Address field labels (State/County/Province, postal) driven by locale
//   - Tax ID label driven by locale (GST Number / VAT Number / EIN etc.)
//   - Country pre-filled from user's stored locale
//   - Singapore: state field hidden (no states)

import { API_BASE } from './api.js';
import { getActiveLocale } from './localeConfig.js';

const lc = getActiveLocale();

/* ── Apply locale to labels ─────────────────────────────── */
function applyLocaleLabels() {
  // Tax ID label
  const taxLabelEl = document.getElementById('taxIdLabel');
  if (taxLabelEl) taxLabelEl.textContent = lc.taxIdLabel || 'Tax ID';

  const taxInput = document.getElementById('taxIdInput') || document.getElementById('taxId');
  if (taxInput) taxInput.placeholder = lc.taxIdPlaceholder || '';

  // State label
  const stateLabel = document.getElementById('stateLabel');
  if (stateLabel) stateLabel.textContent = lc.addressFields.stateLabel || 'State';

  // Hide state field for Singapore (no states)
  const stateWrap = document.getElementById('stateFieldWrap');
  if (stateWrap && !lc.addressFields.stateLabel) {
    stateWrap.style.display = 'none';
  }

  // Postal label
  const postalLabel = document.getElementById('postalLabel');
  if (postalLabel) postalLabel.textContent = lc.addressFields.postalLabel || 'Postal code';

  // Pre-fill country from locale
  const countryInput = document.getElementById('country');
  if (countryInput && !countryInput.value) {
    countryInput.value = lc.country;
  }
}

applyLocaleLabels();

/* ── Form submission ────────────────────────────────────── */
const form = document.getElementById('addClientForm');

if (form) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const token = localStorage.getItem('accessToken');
    if (!token) { window.location.replace('/login.html'); return; }

    const payload = {
      name:         document.getElementById('clientName')?.value.trim(),
      email:        document.getElementById('email')?.value.trim(),
      phone:        document.getElementById('phone')?.value.trim() || null,
      company_name: document.getElementById('companyName')?.value.trim() || null,
      address_line1:document.getElementById('address_line1')?.value.trim() || null,
      address_line2:document.getElementById('address_line2')?.value.trim() || null,
      city:         document.getElementById('city')?.value.trim() || null,
      state:        document.getElementById('state')?.value.trim() || null,
      postal_code:  document.getElementById('postal_code')?.value.trim() || null,
      country:      document.getElementById('country')?.value.trim() || lc.country,
      tax_id:       (document.getElementById('taxIdInput') || document.getElementById('taxId'))?.value.trim() || null,
      notes:        document.getElementById('notes')?.value.trim() || null,
    };

    if (!payload.name || !payload.email) {
      alert('Client name and email are required');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/clients`, {
        method:  'POST',
        headers: { 'Content-Type':'application/json', Authorization:`Bearer ${token}` },
        body:    JSON.stringify(payload),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.message || 'Failed to add client');

      alert('Client added successfully!');
      setTimeout(() => { window.location.href = '/clients.html'; }, 400);

    } catch (err) {
      console.error('Error adding client:', err);
      alert(err.message || 'Failed to add client');
    }
  });
}
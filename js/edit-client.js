// edit-client.js
import { API_BASE } from './api.js';

const form = document.getElementById('editClientForm');
const saveBtn = document.getElementById('saveBtn');
const cancelBtn = document.getElementById('cancelBtn');
const emailInput = document.getElementById('email');
const emailError = document.getElementById('emailError');
const toggle = document.getElementById('toggleAdvanced');
const advanced = document.getElementById('advancedSection');

/* ------------------ CLIENT ID ------------------ */
const params = new URLSearchParams(window.location.search);
const clientId = params.get('id');

if (!clientId) {
  alert('Invalid client');
  window.location.href = '/clients.html';
}

/* ------------------ STATE ------------------ */
let isDirty = false;
let initialData = null;

/* ------------------ PREFILL ------------------ */
async function loadClient() {
  try {
    const res = await fetch(`${API_BASE}/api/clients/${clientId}`);
    if (!res.ok) throw new Error('Fetch failed');

    const client = await res.json();
    initialData = client;

    document.getElementById('clientName')?.value = client.name || '';
    document.getElementById('email')?.value = client.email || '';
    document.getElementById('phone')?.value = client.phone || '';
    document.getElementById('companyName')?.value =
      client.company_name || '';

    // 🏠 Structured address prefill
    document.getElementById('address_line1').value =
      client.address_line1 || '';
    document.getElementById('address_line2').value =
      client.address_line2 || '';
    document.getElementById('city').value =
      client.city || '';
    document.getElementById('state').value =
      client.state || '';
    document.getElementById('postal_code').value =
      client.postal_code || '';
    document.getElementById('country').value =
      client.country || 'India';

    document.getElementById('taxId')?.value = client.tax_id || '';
    document.getElementById('notes')?.value = client.notes || '';

    if (saveBtn) saveBtn.disabled = true;
    isDirty = false;
  } catch (err) {
    alert('Unable to load client');
    window.location.href = '/clients.html';
  }
}

loadClient();

/* ------------------ DIRTY TRACKING ------------------ */
form?.addEventListener('input', () => {
  isDirty = true;
  if (saveBtn) saveBtn.disabled = false;
});

/* ------------------ TOGGLE ADVANCED ------------------ */
toggle?.addEventListener('click', () => {
  if (!advanced) return;

  const open = advanced.style.display === 'block';
  advanced.style.display = open ? 'none' : 'block';
  toggle.textContent = open
    ? '+ Show Advanced Details'
    : '− Hide Advanced Details';
});

/* ------------------ CANCEL ------------------ */
cancelBtn?.addEventListener('click', () => {
  if (isDirty && !confirm('Discard unsaved changes?')) return;
  window.history.back();
});

/* ------------------ SUBMIT ------------------ */
form?.addEventListener('submit', async (e) => {
  e.preventDefault();

  if (!emailInput?.value.trim()) {
    if (emailError) emailError.style.display = 'block';
    return;
  }

  if (emailError) emailError.style.display = 'none';

  const payload = {
    name: document.getElementById('clientName')?.value.trim() || '',
    email: emailInput.value.trim(),
    phone: document.getElementById('phone')?.value.trim() || null,
    company_name:
      document.getElementById('companyName')?.value.trim() || null,

    // 🏠 Structured address
    address_line1:
      document.getElementById('address_line1')?.value.trim() || null,
    address_line2:
      document.getElementById('address_line2')?.value.trim() || null,
    city:
      document.getElementById('city')?.value.trim() || null,
    state:
      document.getElementById('state')?.value.trim() || null,
    postal_code:
      document.getElementById('postal_code')?.value.trim() || null,
    country:
      document.getElementById('country')?.value.trim() || 'India',

    tax_id:
      document.getElementById('taxId')?.value.trim() || null,
    notes:
      document.getElementById('notes')?.value.trim() || null,
  };

  try {
    const res = await fetch(`${API_BASE}/api/clients/${clientId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) throw new Error('Update failed');

    if (saveBtn) saveBtn.disabled = true;
    isDirty = false;

    alert('Client updated successfully');
    window.location.href = '/clients.html';
  } catch (err) {
    alert('Failed to update client');
    console.error(err);
  }
});

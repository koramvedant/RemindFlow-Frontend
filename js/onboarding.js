// js/onboarding.js
// CHANGES: Country select populated from localeConfig.
//          Changing country auto-updates timezone, locale hint, and field labels.

import { API_BASE } from './api.js';
import {
  COUNTRY_OPTIONS,
  getLocaleByCountryName,
  setActiveLocale,
} from './localeConfig.js';

(() => {
  const authToken = localStorage.getItem('accessToken');
  if (!authToken) { window.location.href = '/login.html'; return; }

  const form      = document.getElementById('onboardingForm');
  const submitBtn = document.getElementById('submitBtn');

  function authHeaders() {
    return { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` };
  }

  /* ── Populate country select ─────────────────────── */
  function populateCountrySelect() {
    const select = document.getElementById('country');
    if (!select) return;
    select.innerHTML = '<option value="">Select your country…</option>';
    COUNTRY_OPTIONS.forEach(opt => {
      const el = document.createElement('option');
      el.value       = opt.value;
      el.textContent = opt.label;
      if (opt.value === 'India') el.selected = true; // default
      select.appendChild(el);
    });
    // Trigger initial locale UI
    applyLocaleToForm('India');
  }

  /* ── Apply locale to form UI ─────────────────────── */
  function applyLocaleToForm(countryName) {
    if (!countryName) return;
    const lc = getLocaleByCountryName(countryName);

    // Locale hint
    const hint = document.getElementById('localeHint');
    if (hint) hint.textContent = `Currency: ${lc.currency} (${lc.currencySymbol}) · Tax label: ${lc.taxLabel} · Timezone: ${lc.timezone}`;

    // Auto-set timezone to locale default
    const tzSelect = document.getElementById('timezone');
    if (tzSelect) tzSelect.value = lc.timezone;

    // State label
    const stateLabel = document.getElementById('stateLabel');
    const stateWrap  = document.getElementById('stateFieldWrap');
    if (lc.addressFields.stateLabel) {
      if (stateLabel) stateLabel.textContent = lc.addressFields.stateLabel;
      if (stateWrap)  stateWrap.style.display = '';
    } else {
      // Singapore: no state field
      if (stateWrap) stateWrap.style.display = 'none';
    }

    // Postal label
    const postalLabel = document.getElementById('postalLabel');
    if (postalLabel) postalLabel.textContent = lc.addressFields.postalLabel;

    // Phone placeholder
    const phoneInput = document.getElementById('contact_phone');
    const phonePlaceholders = {
      IN: '+91 98765 43210',
      US: '+1 555 000 0000',
      GB: '+44 7700 900000',
      SG: '+65 9000 0000',
      AU: '+61 400 000 000',
      CA: '+1 416 000 0000',
    };
    if (phoneInput) phoneInput.placeholder = phonePlaceholders[lc.countryCode] || '+1 555 000 0000';
  }

  /* ── Country change handler ──────────────────────── */
  document.getElementById('country')?.addEventListener('change', function () {
    applyLocaleToForm(this.value);
  });

  /* ── Required field validation ───────────────────── */
  function checkRequiredFields() {
    const name    = document.getElementById('name').value.trim();
    const company = document.getElementById('company_name').value.trim();
    const country = document.getElementById('country').value;
    submitBtn.disabled = !(name && company && country);
  }

  ['name', 'company_name', 'country'].forEach(id => {
    document.getElementById(id)?.addEventListener('input',  checkRequiredFields);
    document.getElementById(id)?.addEventListener('change', checkRequiredFields);
  });

  /* ── Prefill name from dashboard ─────────────────── */
  (async function init() {
    populateCountrySelect();
    try {
      const res = await fetch(`${API_BASE}/api/dashboard/info`, { headers: authHeaders() });
      if (!res.ok) return;
      const data = await res.json();
      if (data.user?.name) {
        document.getElementById('name').value = data.user.name;
        checkRequiredFields();
      }
    } catch (err) {
      console.warn('Failed to load dashboard info');
    }
  })();

  /* ── Submit ──────────────────────────────────────── */
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    submitBtn.disabled = true;

    const country = document.getElementById('country').value;
    const lc      = getLocaleByCountryName(country);

    const payload = {
      name:        document.getElementById('name').value.trim(),
      businessName:document.getElementById('company_name').value.trim(),
      contactPhone:document.getElementById('contact_phone').value.trim() || null,
      timezone:    document.getElementById('timezone').value || lc.timezone,
      country:     country || 'India',
      address_line1: document.getElementById('address_line1').value.trim() || null,
      address_line2: document.getElementById('address_line2').value.trim() || null,
      city:          document.getElementById('city').value.trim()          || null,
      state:         document.getElementById('state').value.trim()         || null,
      postal_code:   document.getElementById('postal_code').value.trim()   || null,
    };

    try {
      const res = await fetch(`${API_BASE}/api/onboarding`, {
        method:  'POST',
        headers: authHeaders(),
        body:    JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      // Store locale in localStorage so all pages pick it up immediately
      setActiveLocale(lc.countryCode);
      localStorage.setItem('country', country);

      window.location.replace('/dashboard.html');
    } catch (err) {
      submitBtn.disabled = false;
      alert(err.message || 'Failed to save profile');
    }
  });
})();
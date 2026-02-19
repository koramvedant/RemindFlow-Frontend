import { API_BASE } from './api.js';

(() => {
  /* -----------------------
     Session
  ----------------------- */
  const authToken = localStorage.getItem('accessToken');

  if (!authToken) {
    window.location.href = '/login.html';
    return;
  }

  const form = document.getElementById('onboardingForm');
  const submitBtn = document.getElementById('submitBtn');

  function authHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${authToken}`,
  };
}

  function checkRequiredFields() {
    const name = document.getElementById('name').value.trim();
    const company = document.getElementById('company_name').value.trim();
  
    submitBtn.disabled = !(name && company);
  }

  // Attach listeners
  document
    .getElementById('name')
    .addEventListener('input', checkRequiredFields);
  
  document
    .getElementById('company_name')
    .addEventListener('input', checkRequiredFields);

  // Run once on load
  checkRequiredFields();

  /* -----------------------
     Prefill user name (optional improvement)
  ----------------------- */
  (async function init() {
    try {
      const res = await fetch(`${API_BASE}/api/dashboard/info`, {
        headers: authHeaders(),
      });

      if (!res.ok) return;

      const data = await res.json();
      const user = data.user;

      if (user?.name) {
        document.getElementById('name').value = user.name;
        checkRequiredFields();
      }
    } catch (err) {
      console.warn('Failed to load dashboard info');
    }
  })();

  /* -----------------------
     Submit Onboarding
  ----------------------- */
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    submitBtn.disabled = true;

    const payload = {
    name: document.getElementById('name').value.trim(),
    businessName: document.getElementById('company_name').value.trim(),
  
    contactPhone:
      document.getElementById('contact_phone').value.trim() || null,
  
    timezone:
      document.getElementById('timezone').value || 'Asia/Kolkata',
  
    address_line1:
      document.getElementById('address_line1').value.trim() || null,
  
    address_line2:
      document.getElementById('address_line2').value.trim() || null,
  
    city:
      document.getElementById('city').value.trim() || null,
  
    state:
      document.getElementById('state').value.trim() || null,
  
    postal_code:
      document.getElementById('postal_code').value.trim() || null,
  
    country:
      document.getElementById('country').value.trim() || null,
  };



    try {
      const res = await fetch(`${API_BASE}/api/onboarding`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      window.location.replace('/dashboard.html');
    } catch (err) {
      submitBtn.disabled = false;
      alert(err.message || 'Failed to save profile');
    }
  });
})();


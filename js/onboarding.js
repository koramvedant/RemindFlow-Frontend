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
      businessName: document.getElementById('businessName').value.trim(),
      address:
        document.getElementById('businessAddress').value.trim() || null,
      logoUrl: document.getElementById('logoUrl').value.trim() || null,
      contactEmail:
        document.getElementById('contactEmail').value.trim() || null,
      contactPhone:
        document.getElementById('contactPhone').value.trim() || null,
    };

    try {
      const res = await fetch(`${API_BASE}/api/onboarding`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      window.location.replace('/plans.html');
    } catch (err) {
      submitBtn.disabled = false;
      alert(err.message || 'Failed to save profile');
    }
  });
})();

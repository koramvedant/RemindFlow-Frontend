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

  /* -----------------------
     DOM
  ----------------------- */
  const sendOtpBtn = document.getElementById('sendOtpBtn');
  const verifyOtpBtn = document.getElementById('verifyOtpBtn');
  const otpSection = document.getElementById('otpSection');
  const otpStatus = document.getElementById('otpStatus');
  const submitBtn = document.getElementById('submitBtn');
  const form = document.getElementById('onboardingForm');

  const phoneInput = document.getElementById('phone');
  const otpInput = document.getElementById('otp');

  let phoneVerified = false;

  /* -----------------------
     Helpers
  ----------------------- */
  function authHeaders() {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    };
  }

  function setStatus(message, type = '') {
    otpStatus.textContent = message;
    otpStatus.className = `status ${type}`;
  }

  /* --------------------------------------------------
     🔒 Restore verification state (NO OTP resend)
  -------------------------------------------------- */
  if (localStorage.getItem('phoneVerified') === '1') {
    phoneVerified = true;
    sendOtpBtn.disabled = true;
    verifyOtpBtn.disabled = true;
    submitBtn.disabled = false;
  }

  /* -----------------------
     Init — fetch user info
  ----------------------- */
  (async function init() {
    try {
      const res = await fetch(`${API_BASE}/api/dashboard/info`, {
        headers: authHeaders(),
      });

      if (!res.ok) return;

      const data = await res.json();
      const user = data.user;

      if (user?.phone_verified === true) {
        phoneVerified = true;

        phoneInput.value = user.phone || '';
        phoneInput.readOnly = true;

        sendOtpBtn.disabled = true;
        verifyOtpBtn.disabled = true;
        otpSection.style.display = 'none';

        submitBtn.disabled = false;

        localStorage.setItem('phoneVerified', '1');
      }
    } catch (err) {
      console.warn('Failed to load dashboard info');
    }
  })();

  /* -----------------------
     Send OTP
  ----------------------- */
  sendOtpBtn.addEventListener('click', async () => {
    if (phoneVerified) {
      sendOtpBtn.disabled = true;
      return;
    }

    const phone = phoneInput.value.trim();

    if (phone.length !== 10) {
      setStatus('Enter a valid 10-digit phone number', 'error');
      return;
    }

    sendOtpBtn.disabled = true;
    setStatus('Sending OTP...');

    try {
      const res = await fetch(`${API_BASE}/api/auth/phone/send`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ phone }),
      });

      const data = await res.json();

      if (data.message === 'Phone number already verified') {
        phoneVerified = true;
        submitBtn.disabled = false;
        sendOtpBtn.disabled = true;
        setStatus('Phone already verified', 'success');
        localStorage.setItem('phoneVerified', '1');
        return;
      }

      if (!res.ok) throw new Error(data.message);

      otpSection.style.display = 'block';
      setStatus('OTP sent to your number', 'success');
    } catch (err) {
      sendOtpBtn.disabled = false;
      setStatus(err.message || 'Failed to send OTP', 'error');
    }
  });

  /* -----------------------
     Verify OTP
  ----------------------- */
  verifyOtpBtn.addEventListener('click', async () => {
    if (phoneVerified) return;

    const phone = phoneInput.value.trim();
    const otp = otpInput.value.trim();

    if (otp.length !== 6) {
      setStatus('Enter a valid 6-digit OTP', 'error');
      return;
    }

    verifyOtpBtn.disabled = true;
    setStatus('Verifying OTP...');

    try {
      const res = await fetch(`${API_BASE}/api/auth/phone/verify`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ phone, otp }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      phoneVerified = true;
      localStorage.setItem('phoneVerified', '1');

      setStatus('Phone verified successfully', 'success');
      submitBtn.disabled = false;

      phoneInput.readOnly = true;
      sendOtpBtn.disabled = true;
      verifyOtpBtn.disabled = true;
    } catch (err) {
      verifyOtpBtn.disabled = false;
      setStatus(err.message || 'OTP verification failed', 'error');
    }
  });

  /* -----------------------
     Submit Onboarding
  ----------------------- */
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!phoneVerified) {
      setStatus('Please verify phone number first', 'error');
      return;
    }

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

      // 🔒 HARD REDIRECT — NO HISTORY
      window.location.replace('/plans.html');
    } catch (err) {
      submitBtn.disabled = false;
      alert(err.message || 'Failed to save profile');
    }
  });
})();

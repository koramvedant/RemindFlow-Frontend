// /js/verify.js

/* ----------------------
   DOM Elements
---------------------- */
const phoneInput = document.getElementById('phone');
const otpSection = document.getElementById('otpSection');
const otpInput = document.getElementById('otp');
const sendBtn = document.getElementById('sendOTPBtn');
const verifyBtn = document.getElementById('verifyOTPBtn');
const verifyMessage = document.getElementById('verifyMessage');

/* ----------------------
   Helpers
---------------------- */
function showMessage(msg, timeout = 3000) {
  verifyMessage.textContent = msg;
  if (timeout) {
    setTimeout(() => (verifyMessage.textContent = ''), timeout);
  }
}

/* ----------------------
   Firebase reCAPTCHA
   (Initialize once)
---------------------- */
window.recaptchaVerifier = new firebase.auth.RecaptchaVerifier(
  'recaptcha-container',
  {
    size: 'invisible',
    callback: () => {
      console.log('reCAPTCHA solved');
    },
  }
);

/* ----------------------
   Send OTP (Firebase)
---------------------- */
async function sendOTP(phone) {
  const confirmationResult = await firebase
    .auth()
    .signInWithPhoneNumber(`+91${phone}`, window.recaptchaVerifier);

  window.confirmationResult = confirmationResult;
}

/* ----------------------
   Verify OTP (Firebase)
---------------------- */
async function verifyOTP(otp) {
  const result = await window.confirmationResult.confirm(otp);
  const user = result.user;

  const idToken = await user.getIdToken();

  // Exchange Firebase token with backend
  const res = await fetch('/api/auth/phone-login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
  });

  const data = await res.json();

  if (!res.ok || !data.accessToken) {
    throw new Error(data.message || 'Login failed');
  }

  localStorage.setItem('accessToken', data.accessToken);
}

/* ----------------------
   Send OTP Button
---------------------- */
sendBtn?.addEventListener('click', async () => {
  const phone = phoneInput.value.trim();

  if (!phone || phone.length !== 10) {
    showMessage('Please enter a valid 10-digit mobile number');
    return;
  }

  try {
    await sendOTP(phone);
    otpSection.style.display = 'block';
    showMessage('OTP sent to your number');
  } catch (err) {
    console.error('❌ Firebase send OTP error:', err);
    showMessage(err.message || 'Failed to send OTP');
  }
});

/* ----------------------
   Verify OTP Button
---------------------- */
verifyBtn?.addEventListener('click', async () => {
  const otp = otpInput.value.trim();

  if (!otp || otp.length !== 6) {
    showMessage('Enter a valid 6-digit OTP');
    return;
  }

  try {
    await verifyOTP(otp);
    showMessage('Mobile verified successfully!', 1200);

    setTimeout(() => {
      window.location.href = '/plans.html';
    }, 1200);
  } catch (err) {
    console.error('❌ Firebase verify OTP error:', err);
    showMessage(err.message || 'OTP verification failed');
  }
});

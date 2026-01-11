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
function showMessage(msg, timeout = null) {
  verifyMessage.textContent = msg;
  if (timeout) {
    setTimeout(() => {
      verifyMessage.textContent = '';
    }, timeout);
  }
}

function setLoading(btn, loading = true) {
  btn.disabled = loading;
  btn.textContent = loading ? 'Please wait...' : btn.dataset.label;
}

/* ----------------------
   Send OTP (Backend)
---------------------- */
async function sendOTP(phone) {
  const res = await fetch('/api/auth/phone/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || 'Failed to send OTP');
  }
}

/* ----------------------
   Verify OTP (Backend)
---------------------- */
async function verifyOTP(phone, otp) {
  const res = await fetch('/api/auth/phone/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, otp }),
  });

  const data = await res.json();

  if (!res.ok || !data.accessToken) {
    throw new Error(data.message || 'OTP verification failed');
  }

  localStorage.setItem('accessToken', data.accessToken);
}

/* ----------------------
   Send OTP Button
---------------------- */
sendBtn.dataset.label = sendBtn.textContent;

sendBtn.addEventListener('click', async () => {
  const phone = phoneInput.value.trim();

  if (!phone || phone.length !== 10) {
    showMessage('Please enter a valid 10-digit mobile number');
    return;
  }

  try {
    setLoading(sendBtn, true);
    await sendOTP(phone);

    otpSection.style.display = 'block';
    phoneInput.disabled = true;
    showMessage('OTP sent. Use the latest code received.');

  } catch (err) {
    console.error('❌ Send OTP error:', err);
    showMessage(err.message || 'Failed to send OTP');
    setLoading(sendBtn, false);
  }
});

/* ----------------------
   Verify OTP Button
---------------------- */
verifyBtn.dataset.label = verifyBtn.textContent;

verifyBtn.addEventListener('click', async () => {
  const phone = phoneInput.value.trim();
  const otp = otpInput.value.trim();

  if (!otp || otp.length !== 6) {
    showMessage('Enter a valid 6-digit OTP');
    return;
  }

  try {
    setLoading(verifyBtn, true);
    await verifyOTP(phone, otp);

    showMessage('Mobile verified successfully!', 1200);

    setTimeout(() => {
      window.location.href = '/plans.html';
    }, 1200);

  } catch (err) {
    console.error('❌ Verify OTP error:', err);
    showMessage(err.message || 'OTP invalid or expired. Please resend.');
    setLoading(verifyBtn, false);
  }
});

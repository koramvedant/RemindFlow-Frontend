// public/js/login.js
// --------------------------------------------------
// Google Login (Firebase → Backend)
// --------------------------------------------------

console.log('🔥 login.js loaded');

import { auth, provider } from './firebase-config.js';
import { signInWithPopup } from 'https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js';

// Backend URL injected from HTML
const BACKEND_URL = window.BACKEND_URL;

if (!BACKEND_URL) {
  console.error('❌ BACKEND_URL is not defined');
}

// Google login button
const googleBtn = document.getElementById('googleLoginBtn');

if (!googleBtn) {
  console.error('❌ Google login button not found');
} else {
  googleBtn.addEventListener('click', async () => {
    console.log('🟢 Google login button clicked');

    try {
      // Firebase popup login
      const result = await signInWithPopup(auth, provider);
      console.log('✅ Firebase popup success');

      const idToken = await result.user.getIdToken(true);
      if (!idToken) throw new Error('No Firebase ID token received');

      // Send ID token to backend
      const res = await fetch(`${BACKEND_URL}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });

      const data = await res.json();

      if (!res.ok) {
        console.error('❌ Backend error:', data);
        throw new Error(data.message || 'Backend login failed');
      }

      console.log('✅ Backend login success');

      // Store tokens (frontend only)
      if (data.accessToken) {
        localStorage.setItem('accessToken', data.accessToken);
      }
      if (data.refreshToken) {
        localStorage.setItem('refreshToken', data.refreshToken);
      }

      // Frontend-only redirects
      window.location.href = data.user?.isNew
        ? '/verify.html'
        : '/plans.html';

    } catch (err) {
      console.error('❌ Google login failed:', err);
      alert('Google login failed. Please try again.');
    }
  });
}

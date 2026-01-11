// public/js/login.js
// --------------------------------------------------
// Google Login (Firebase compat → Backend)
// --------------------------------------------------

console.log('🔥 login.js loaded');

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
      // Firebase popup login (COMPAT)
      const result = await firebase
        .auth()
        .signInWithPopup(window.googleProvider);

      console.log('✅ Firebase popup success');

      const firebaseUser = result.user;
      if (!firebaseUser) throw new Error('No Firebase user');

      const idToken = await firebaseUser.getIdToken(true);
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

      // Store tokens
      if (data.accessToken) {
        localStorage.setItem('accessToken', data.accessToken);
      }
      if (data.refreshToken) {
        localStorage.setItem('refreshToken', data.refreshToken);
      }

      /* --------------------------------
         🔒 SINGLE ROUTING TRUTH
         (Matches guard + backend)
      -------------------------------- */
      const user = data.user;

      if (!user) {
        throw new Error('User object missing from login response');
      }

      if (!user.onboarding_completed) {
        window.location.href = '/onboarding.html';
      } else if (!user.subscription_active) {
        window.location.href = '/plans.html';
      } else {
        window.location.href =
          user.plan_type === 'integrated'
            ? '/integration-dashboard.html'
            : '/dashboard.html';
      }

    } catch (err) {
      console.error('❌ Google login failed:', err);
      alert('Google login failed. Please try again.');
    }
  });
}

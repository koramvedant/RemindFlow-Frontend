// js/guard.js

/**
 * Auth guard
 * Enforces:
 * - token presence
 * - onboarding completion
 * - active subscription
 *
 * DB is the source of truth via /api/user/me
 */
export function requireAuth() {
  const token = localStorage.getItem('accessToken');
  const path = window.location.pathname;

  // -----------------------------
  // 1️⃣ No token → login
  // -----------------------------
  if (!token) {
    window.location.replace('/login.html');
    return;
  }

  // -----------------------------
  // 2️⃣ Public allowed pages
  // -----------------------------
  const allowedWithoutChecks = [
    '/onboarding.html',
    '/plans.html',
  ];

  if (allowedWithoutChecks.includes(path)) {
    return;
  }

  // -----------------------------
  // 3️⃣ Fetch user state (DB SOURCE OF TRUTH)
  // -----------------------------
  fetch('/api/user/me', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
    .then((res) => {
      if (!res.ok) {
        throw new Error('Unauthorized');
      }
      return res.json();
    })
    .then((data) => {
      const user = data?.user;

      if (!user) {
        throw new Error('Invalid user');
      }

      // -----------------------------
      // 4️⃣ Enforce onboarding
      // -----------------------------
      if (!user.onboarding_completed) {
        window.location.replace('/onboarding.html');
        return;
      }

      // -----------------------------
      // 5️⃣ Enforce plan selection
      // -----------------------------
      if (!user.subscription_active) {
        window.location.replace('/plans.html');
        return;
      }

      // ✅ All checks passed → allow page to load
    })
    .catch((err) => {
      console.error('Auth guard failed:', err);

      // Hard reset on auth failure
      localStorage.clear();
      window.location.replace('/login.html');
    });
}

/**
 * Optional helper
 */
export function logout() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  window.location.replace('/login.html');
}

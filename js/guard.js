// js/guard.js

/**
 * Auth guard (FINAL — cookie + bearer compatible)
 *
 * Responsibility:
 * - Verify authenticated session exists
 * - Identify logged-in principal
 *
 * NOT responsible for:
 * - onboarding enforcement
 * - plan enforcement
 * - business rules
 */
export function requireAuth() {
  const token = localStorage.getItem('accessToken');
  const path = window.location.pathname;

  // -----------------------------
  // 1️⃣ Allow public pages
  // -----------------------------
  const publicPages = ['/login.html'];
  if (publicPages.includes(path)) {
    return;
  }

  // -----------------------------
  // 2️⃣ Fetch identity (SOURCE OF TRUTH)
  // -----------------------------
  fetch('/api/user/me', {
    headers: token
      ? {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      : undefined,
    credentials: 'include', // cookie + bearer coexistence
  })
    .then((res) => {
      if (res.status === 401 || res.status === 403) {
        throw new Error('AUTH_INVALID');
      }

      if (!res.ok) {
        throw new Error('API_ERROR');
      }

      return res.json();
    })
    .then((data) => {
      // Accept BOTH response shapes
      const principal = data?.seller || data?.user;

      if (!principal) {
        console.warn(
          'Auth guard: identity missing in /api/user/me response',
          data
        );
        return;
      }

      // ✅ Authenticated → allow page to load
    })
    .catch((err) => {
      console.error('Auth guard failed:', err);

      if (err.message === 'AUTH_INVALID') {
        localStorage.removeItem('accessToken');
        window.location.replace('/login.html');
      }

      // Network / API errors → do NOT redirect
    });
}

/**
 * Logout helper (explicit user action)
 */
export function logout() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  window.location.replace('/login.html');
}

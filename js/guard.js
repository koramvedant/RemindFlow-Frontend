// js/guard.js

import { API_BASE } from './api.js';

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
  fetch(`${API_BASE}/api/user/me`, {
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
  const principal = data?.seller || data?.user;

  if (!principal) {
    console.warn(
      'Auth guard: identity missing in /api/user/me response',
      data
    );
    return;
  }

  // 🔥 PLAN / TRIAL EXPIRY CHECK (UI LEVEL ONLY)
  const now = new Date();
  let expired = false;

  if (principal.plan === 'trial') {
    if (!principal.trial_end || new Date(principal.trial_end) <= now) {
      expired = true;
    }
  } else {
    if (
      !principal.subscription_active ||
      !principal.plan_end ||
      new Date(principal.plan_end) <= now
    ) {
      expired = true;
    }
  }

  // Store globally for other scripts
  window.__USER_PLAN__ = principal;
  window.__PLAN_EXPIRED__ = expired;

  // Dispatch custom event so pages can react
  window.dispatchEvent(
    new CustomEvent('planStatusReady', {
      detail: { expired, principal },
    })
  );

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

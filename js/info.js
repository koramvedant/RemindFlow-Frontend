// public/info.js

// Backend URL (can be set globally in frontend)
const apiBase = window.REMINDFLOW_API_BASE || '';

// ---------------------- Pre-fill from OAuth ----------------------
async function prefillUser() {
  const nameInput = document.getElementById('name');
  const emailInput = document.getElementById('email');
  const phoneInput = document.getElementById('phone');
  const companyInput = document.getElementById('company');

  if (!nameInput && !emailInput && !phoneInput && !companyInput) return;

  try {
    const res = await fetch(`${apiBase}/api/user/me`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
      },
    });

    if (!res.ok) return;
    const data = await res.json();
    if (!data.success || !data.user) return;

    const user = data.user;

    if (nameInput) nameInput.value = user.name || '';
    if (emailInput) emailInput.value = user.email || '';
    if (phoneInput) phoneInput.value = user.phone || '';
    if (companyInput) companyInput.value = user.company_name || '';
  } catch (err) {
    console.warn('Prefill user error:', err);
  }
}

// ---------------------- Form Submit ----------------------
const infoForm = document.getElementById('infoForm');
infoForm?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const data = {
    name: document.getElementById('name')?.value || '',
    phone: document.getElementById('phone')?.value || '',
    company_name: document.getElementById('company')?.value || '',
  };

  try {
    const res = await fetch(`${apiBase}/api/user/update-profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
      },
      body: JSON.stringify(data),
    });

    const result = await res.json();

    if (result.success) {
      // Redirect to plans page after info completed
      window.location.href = '/plans.html';
    } else {
      alert(result.message || 'Failed to update profile.');
    }
  } catch (err) {
    console.error('Update profile error:', err);
    alert('Something went wrong. Please try again.');
  }
});

// ---------------------- Init ----------------------
prefillUser();

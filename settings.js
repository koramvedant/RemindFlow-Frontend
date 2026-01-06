// public/js/settings.js

/* -------------------------
   Section Toggles
------------------------- */
const toggles = document.querySelectorAll('.section-header[data-toggle]');

toggles.forEach((header) => {
  header.addEventListener('click', () => {
    const id = header.dataset.toggle;
    const body = document.getElementById(id);
    const arrow = header.querySelector('.arrow');

    if (!body) return;

    const isOpen = body.style.display === 'block';
    body.style.display = isOpen ? 'none' : 'block';
    arrow?.classList.toggle('open', !isOpen);
  });
});

/* -------------------------
   Load Settings
------------------------- */
async function loadSettings() {
  try {
    const res = await fetch('/api/settings', { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch settings');

    const { data } = await res.json();

    document.getElementById('name').value = data.name || '';
    document.getElementById('email').value = data.email || '';
    document.getElementById('company_name').value = data.company_name || '';
    document.getElementById('timezone').value = data.timezone || 'Asia/Kolkata';

    // WhatsApp toggle (UI = disable, backend = enable)
    document.getElementById('disable_whatsapp').checked =
      data.whatsapp_enabled === false;
  } catch (err) {
    console.warn('⚠️ Failed to load settings:', err);
  }
}

/* -------------------------
   Save Account Settings
------------------------- */
document.getElementById('saveAccount')?.addEventListener('click', async () => {
  const payload = {
    name: document.getElementById('name').value.trim(),
    company_name: document.getElementById('company_name').value.trim(),
    timezone: document.getElementById('timezone').value,
  };

  try {
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    });

    if (!res.ok) throw new Error('Failed to save account settings');
    alert('✅ Account settings saved');
  } catch (err) {
    console.error('❌ Account save error:', err);
    alert('❌ Failed to save account settings');
  }
});

/* -------------------------
   Save Communication Settings
------------------------- */
document.getElementById('saveCommunication')?.addEventListener('click', async () => {
  const disableWhatsapp = document.getElementById('disable_whatsapp').checked;

  const payload = {
    whatsapp_enabled: !disableWhatsapp,
  };

  try {
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    });

    if (!res.ok) throw new Error('Failed to save communication settings');
    alert('✅ Communication settings saved');
  } catch (err) {
    console.error('❌ Communication save error:', err);
    alert('❌ Failed to save communication settings');
  }
});

/* -------------------------
   Init
------------------------- */
loadSettings();

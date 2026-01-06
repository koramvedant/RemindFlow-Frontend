/* ---------------- Elements ---------------- */
const statusDot = document.getElementById('status-indicator');
const statusText = document.getElementById('status-text');
const lastSyncElem = document.getElementById('last-sync');

const connectBtn = document.getElementById('connect-btn');
const permissionsBtn = document.getElementById('permissions-btn');

const alertsDiv = document.getElementById('alerts');

/* ---------------- Modal ---------------- */
const permissionsModal = document.getElementById('permissions-modal');
const permissionsList = document.getElementById('permissions-list');
const closeModal = document.getElementById('close-modal');

/* ---------------- Initial State ---------------- */
let integrationStatus = {
  connected: false,
  lastSync: null,
  permissions: ['Read Invoices', 'Send Reminders', 'View Clients'], // Mock default
};

/* ---------------- Utilities ---------------- */
function updateUI() {
  if (!statusDot || !statusText || !lastSyncElem) return;

  if (integrationStatus.connected) {
    statusDot.style.backgroundColor = '#4caf50';
    statusText.textContent = 'Connected';
  } else {
    statusDot.style.backgroundColor = '#f44336';
    statusText.textContent = 'Disconnected';
  }

  lastSyncElem.textContent = integrationStatus.lastSync
    ? integrationStatus.lastSync.toLocaleString()
    : '—';
}

function showAlert(message, type = 'success') {
  if (!alertsDiv) return;

  const alert = document.createElement('div');
  alert.className = `alert alert-${type}`;
  alert.textContent = message;
  alertsDiv.appendChild(alert);

  setTimeout(() => {
    alert.classList.add('fade-out');
    setTimeout(() => alert.remove(), 300);
  }, 3000);
}

/* ---------------- Guards ---------------- */
function isDisabled(btn) {
  return !btn || btn.hasAttribute('disabled') || btn.classList.contains('disabled');
}

/* ---------------- Events ---------------- */
connectBtn?.addEventListener('click', () => {
  if (isDisabled(connectBtn)) return;

  if (statusText) statusText.textContent = 'Connecting…';

  // Simulate API call
  setTimeout(() => {
    integrationStatus.connected = true;
    integrationStatus.lastSync = new Date();
    updateUI();
    showAlert('Zoho connected successfully', 'success');
  }, 1200);
});

permissionsBtn?.addEventListener('click', () => {
  if (!permissionsModal || !permissionsList) return;

  permissionsList.innerHTML = '';

  integrationStatus.permissions.forEach((perm) => {
    const li = document.createElement('li');
    li.textContent = perm;
    permissionsList.appendChild(li);
  });

  permissionsModal.classList.add('show');
});

/* ---------------- Modal Close ---------------- */
closeModal?.addEventListener('click', () => {
  permissionsModal?.classList.remove('show');
});

window.addEventListener('click', (e) => {
  if (e.target === permissionsModal) {
    permissionsModal.classList.remove('show');
  }
});

/* ---------------- Init ---------------- */
updateUI();

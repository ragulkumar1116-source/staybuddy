/**
  StayBuddy - Shared Common Utilities
*/

// Apply Master Admin Dynamic Theme to CSS Variables
async function applyThemeSettings() {
  const theme = await DB.get('settings/theme');
  if (theme) {
    const root = document.documentElement;
    if (theme.primaryColor) root.style.setProperty('--primary-color', theme.primaryColor);
    if (theme.secondaryColor) root.style.setProperty('--secondary-color', theme.secondaryColor);
    if (theme.accentColor) root.style.setProperty('--accent-color', theme.accentColor);
    if (theme.bgColor) root.style.setProperty('--bg-color', theme.bgColor);
    if (theme.textColor) root.style.setProperty('--text-color', theme.textColor);
    if (theme.borderRadius) root.style.setProperty('--border-radius', theme.borderRadius);
    if (theme.fontFamily) root.style.setProperty('--font-family', theme.fontFamily);
  }
}

// Generate Initial-based Gradient Avatar HTML
function getAvatarHtml(name, size = '') {
  const safeName = name || "User";
  const parts = safeName.trim().split(' ');
  let initials = parts[0][0] || 'U';
  if (parts.length > 1 && parts[parts.length - 1][0]) {
    initials += parts[parts.length - 1][0];
  }
  initials = initials.toUpperCase();
  const sizeClass = size ? `user-avatar-${size}` : '';
  return `<div class="user-avatar ${sizeClass}">${initials}</div>`;
}

// Global Toast System
function showToast(message, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const toastId = 'toast_' + Date.now();
  const bgClass = type === 'success' ? 'bg-success text-white' : 
                   type === 'danger' || type === 'error' ? 'bg-danger text-white' : 
                   type === 'warning' ? 'bg-warning text-dark' : 'bg-primary text-white';

  const html = `
    <div id="${toastId}" class="toast align-items-center ${bgClass} border-0 show shadow-lg mb-2" role="alert" aria-live="assertive" aria-atomic="true">
      <div class="d-flex">
        <div class="toast-body font-weight-bold">
          <i class="bi bi-info-circle-fill me-2"></i> ${message}
        </div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
      </div>
    </div>
  `;
  container.insertAdjacentHTML('beforeend', html);

  setTimeout(() => {
    const el = document.getElementById(toastId);
    if (el) el.remove();
  }, 4000);
}

// Active User Session Management
function getCurrentUser() {
  try {
    return JSON.parse(sessionStorage.getItem('STAYBUDDY_ACTIVE_USER')) || null;
  } catch (e) {
    return null;
  }
}

function setCurrentUser(user) {
  sessionStorage.setItem('STAYBUDDY_ACTIVE_USER', JSON.stringify(user));
}

function logoutUser() {
  sessionStorage.removeItem('STAYBUDDY_ACTIVE_USER');
  if (typeof auth !== 'undefined' && auth && auth.signOut) {
    auth.signOut();
  }
  showToast("Logged out successfully.", "info");
  setTimeout(() => {
    window.location.href = "index.html";
  }, 600);
}

// Mode Switcher: Dual Capability (Guest & Host) for a Single User Account
function switchUserMode(targetMode) {
  const user = getCurrentUser();
  if (!user) {
    showToast("Please log in to switch modes.", "warning");
    window.location.href = "auth.html";
    return;
  }
  user.activeMode = targetMode;
  setCurrentUser(user);

  if (targetMode === 'HOST') {
    showToast("Switching to Host Mode...", "success");
    setTimeout(() => { window.location.href = "host.html"; }, 400);
  } else {
    showToast("Switching to Guest Mode...", "success");
    setTimeout(() => { window.location.href = "app.html"; }, 400);
  }
}

// SOS Emergency Trigger Modal System
async function triggerSOSAlert(bookingId = null, hostId = null) {
  const currentUser = getCurrentUser();
  if (!currentUser) {
    showToast("Please log in to use the 1-Tap SOS system.", "warning");
    window.location.href = "auth.html";
    return;
  }

  const sosData = {
    userId: currentUser.id,
    userName: currentUser.name,
    userEmail: currentUser.email,
    userCity: currentUser.city || "Unknown",
    bookingId: bookingId || "N/A",
    hostId: hostId || "N/A",
    status: "ACTIVE",
    timestamp: new Date().toISOString()
  };

  await DB.push('sosAlerts', sosData);

  // Show emergency confirmation modal
  let modalEl = document.getElementById('sosConfirmationModal');
  if (!modalEl) {
    const modalHtml = `
      <div class="modal fade" id="sosConfirmationModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content border-danger border-3">
            <div class="modal-header bg-danger text-white">
              <h5 class="modal-title fw-bold"><i class="bi bi-shield-slash-fill me-2"></i> SOS EMERGENCY ALERT DISPATCHED</h5>
              <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body text-center p-4">
              <i class="bi bi-exclamation-triangle-fill text-danger display-1 mb-3"></i>
              <h4 class="fw-bold text-danger mb-2">Emergency Signal Active</h4>
              <p class="lead mb-3">Your location, stay details, and identity have been immediately logged to Master Admin and platform safety dispatch.</p>
              <div class="p-3 bg-light rounded text-start mb-3 border">
                <small class="text-muted d-block">Emergency Helplines:</small>
                <strong>Police: 112 / 100</strong><br>
                <strong>Women Helpline: 1091</strong><br>
                <strong>StayBuddy 24/7 Desk: +91 98765 43210</strong>
              </div>
              <p class="text-muted small">Stay in a safe, well-lit location. Master Admin is reviewing your alert.</p>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
            </div>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    modalEl = document.getElementById('sosConfirmationModal');
  }

  const bsModal = new bootstrap.Modal(modalEl);
  bsModal.show();
  showToast("SOS Alert sent to Master Admin!", "danger");
}

// Initializer on Page Load
document.addEventListener("DOMContentLoaded", () => {
  applyThemeSettings();
});

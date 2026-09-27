/**
  StayBuddy - Master Admin Panel SPA Controller
*/

let currentAdmin = null;

document.addEventListener("DOMContentLoaded", async () => {
  currentAdmin = getCurrentUser();
  if (!currentAdmin || (currentAdmin.role !== "MASTER_ADMIN" && currentAdmin.role !== "ADMIN")) {
    showToast("Master Admin privileges required.", "error");
    setTimeout(() => { window.location.href = "auth.html"; }, 1000);
    return;
  }

  // Set Admin Header
  document.querySelectorAll('.admin-display-name').forEach(el => el.textContent = currentAdmin.name);

  // Bind Sidebar Nav
  document.querySelectorAll('.admin-nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const sec = link.getAttribute('data-section');
      switchAdminSection(sec);
    });
  });

  // Load initial Admin data
  await loadAdminStats();
  await loadWebsiteEditorForm();
  await loadDesignEditorForm();
  await loadImageManager();
  await loadFirebaseConfigForm();
  await loadUserManagementTable();
  await loadStayManagementTable();
  await loadBookingManagementTable();
  await loadMatchingWeightsForm();
  await loadFeatureFlagToggles();
  await loadSosAlertsCenter();
  await loadAdminLogsTable();

  switchAdminSection('dashboard');
});

// Firebase Server Config Handler
async function loadFirebaseConfigForm() {
  const config = typeof getFirebaseConfig === 'function' ? getFirebaseConfig() : {};

  if (document.getElementById('fbApiKey')) document.getElementById('fbApiKey').value = config.apiKey || '';
  if (document.getElementById('fbAuthDomain')) document.getElementById('fbAuthDomain').value = config.authDomain || '';
  if (document.getElementById('fbDatabaseUrl')) document.getElementById('fbDatabaseUrl').value = config.databaseURL || '';
  if (document.getElementById('fbProjectId')) document.getElementById('fbProjectId').value = config.projectId || '';
  if (document.getElementById('fbStorageBucket')) document.getElementById('fbStorageBucket').value = config.storageBucket || '';
  if (document.getElementById('fbMessagingSenderId')) document.getElementById('fbMessagingSenderId').value = config.messagingSenderId || '';
  if (document.getElementById('fbAppId')) document.getElementById('fbAppId').value = config.appId || '';

  const form = document.getElementById('firebaseConfigForm');
  if (!form) return;

  form.onsubmit = async (e) => {
    e.preventDefault();
    const newConfig = {
      apiKey: document.getElementById('fbApiKey').value.trim(),
      authDomain: document.getElementById('fbAuthDomain').value.trim(),
      databaseURL: document.getElementById('fbDatabaseUrl').value.trim(),
      projectId: document.getElementById('fbProjectId').value.trim(),
      storageBucket: document.getElementById('fbStorageBucket').value.trim(),
      messagingSenderId: document.getElementById('fbMessagingSenderId').value.trim(),
      appId: document.getElementById('fbAppId').value.trim()
    };

    if (typeof saveFirebaseProjectConfig === 'function') {
      saveFirebaseProjectConfig(newConfig);
    }
    await logAdminAction("FIREBASE_CONFIG_SAVE", "Firebase Server DB", "Saved live Firebase project keys.");
    showToast("Firebase Realtime Database credentials saved & connected!", "success");
  };
}

function switchAdminSection(sectionId) {
  document.querySelectorAll('.admin-section').forEach(sec => sec.classList.add('d-none'));
  const target = document.getElementById(`admin-section-${sectionId}`);
  if (target) {
    target.classList.remove('d-none');
  } else {
    document.getElementById('admin-section-dashboard').classList.remove('d-none');
  }

  document.querySelectorAll('.admin-nav-link').forEach(l => {
    if (l.getAttribute('data-section') === sectionId) {
      l.classList.add('active');
    } else {
      l.classList.remove('active');
    }
  });
}

// Log Master Admin Action
async function logAdminAction(action, target, description) {
  const logData = {
    adminId: currentAdmin.id,
    adminName: currentAdmin.name,
    action,
    target,
    description,
    timestamp: new Date().toISOString()
  };
  await DB.push('adminLogs', logData);
  loadAdminLogsTable();
}

// 1. Dashboard Stats
async function loadAdminStats() {
  const users = await DB.get('users') || {};
  const stays = await DB.get('stays') || {};
  const bookings = await DB.get('bookings') || {};
  const sosAlerts = await DB.get('sosAlerts') || {};

  document.getElementById('statTotalUsers').textContent = Object.keys(users).length;
  document.getElementById('statTotalStays').textContent = Object.keys(stays).length;
  document.getElementById('statTotalBookings').textContent = Object.keys(bookings).length;
  
  const activeSosCount = Object.values(sosAlerts).filter(a => a.status === 'ACTIVE').length;
  document.getElementById('statActiveSos').textContent = activeSosCount;
}

// 2. Website Content Editor (Page Editor & Company Branding)
async function loadWebsiteEditorForm() {
  const content = await DB.get('content') || {};
  const settings = await DB.get('settings') || {};
  const site = settings.site || {};
  const branding = settings.branding || {};
  const home = content.home || {};

  const form = document.getElementById('websiteEditorForm');
  if (!form) return;

  if (document.getElementById('editSiteName')) document.getElementById('editSiteName').value = site.name || 'StayBuddy';
  if (document.getElementById('editSiteTagline')) document.getElementById('editSiteTagline').value = site.tagline || '';
  if (document.getElementById('editLogoUrl')) document.getElementById('editLogoUrl').value = branding.logoUrl || '';
  if (document.getElementById('editContactEmail')) document.getElementById('editContactEmail').value = site.contactEmail || '';
  if (document.getElementById('editContactPhone')) document.getElementById('editContactPhone').value = site.contactPhone || '';
  if (document.getElementById('editContactAddress')) document.getElementById('editContactAddress').value = site.contactAddress || '';

  if (document.getElementById('editPageTitle')) document.getElementById('editPageTitle').value = home.title || '';
  if (document.getElementById('editPageSubtitle')) document.getElementById('editPageSubtitle').value = home.subtitle || '';
  if (document.getElementById('editBtn1Text')) document.getElementById('editBtn1Text').value = home.button1Text || '';
  if (document.getElementById('editBtn1Link')) document.getElementById('editBtn1Link').value = home.button1Link || '';
  if (document.getElementById('editBtn2Text')) document.getElementById('editBtn2Text').value = home.button2Text || '';
  if (document.getElementById('editBtn2Link')) document.getElementById('editBtn2Link').value = home.button2Link || '';
  if (document.getElementById('editFeat1Title')) document.getElementById('editFeat1Title').value = home.feature1Title || '';
  if (document.getElementById('editFeat1Desc')) document.getElementById('editFeat1Desc').value = home.feature1Desc || '';

  form.onsubmit = async (e) => {
    e.preventDefault();

    site.name = document.getElementById('editSiteName').value.trim();
    site.tagline = document.getElementById('editSiteTagline').value.trim();
    site.contactEmail = document.getElementById('editContactEmail').value.trim();
    site.contactPhone = document.getElementById('editContactPhone').value.trim();
    site.contactAddress = document.getElementById('editContactAddress').value.trim();

    branding.logoUrl = document.getElementById('editLogoUrl').value.trim();

    home.title = document.getElementById('editPageTitle').value;
    home.subtitle = document.getElementById('editPageSubtitle').value;
    home.button1Text = document.getElementById('editBtn1Text').value;
    home.button1Link = document.getElementById('editBtn1Link').value;
    home.button2Text = document.getElementById('editBtn2Text').value;
    home.button2Link = document.getElementById('editBtn2Link').value;
    home.feature1Title = document.getElementById('editFeat1Title').value;
    home.feature1Desc = document.getElementById('editFeat1Desc').value;

    await DB.set('settings/site', site);
    await DB.set('settings/branding', branding);
    await DB.set('content/home', home);

    if (typeof loadDynamicContent === 'function') {
      await loadDynamicContent();
    }

    await logAdminAction("BRANDING_EDIT", "Company Identity", `Updated company name to "${site.name}" & logo URL.`);
    showToast("Company name, logo URL & website branding saved live!", "success");
  };
}

// 3. Website Design & Theme Editor
async function loadDesignEditorForm() {
  const theme = await DB.get('settings/theme') || {};

  document.getElementById('themePrimary').value = theme.primaryColor || '#0d6efd';
  document.getElementById('themeSecondary').value = theme.secondaryColor || '#212529';
  document.getElementById('themeAccent').value = theme.accentColor || '#20c997';
  document.getElementById('themeBg').value = theme.bgColor || '#f8f9fa';
  document.getElementById('themeText').value = theme.textColor || '#212529';

  const form = document.getElementById('themeEditorForm');
  if (!form) return;

  form.onsubmit = async (e) => {
    e.preventDefault();
    const updatedTheme = {
      primaryColor: document.getElementById('themePrimary').value,
      secondaryColor: document.getElementById('themeSecondary').value,
      accentColor: document.getElementById('themeAccent').value,
      bgColor: document.getElementById('themeBg').value,
      textColor: document.getElementById('themeText').value,
      borderRadius: "12px",
      fontFamily: "'Outfit', sans-serif"
    };

    await DB.set('settings/theme', updatedTheme);
    applyThemeSettings();
    await logAdminAction("THEME_UPDATE", "Design System", "Modified platform theme colors.");
    showToast("Theme colors updated live!", "success");
  };
}

// 4. Image URL Manager
async function loadImageManager() {
  const branding = await DB.get('settings/branding') || {};

  document.getElementById('imgLogoUrl').value = branding.logoUrl || '';
  document.getElementById('imgBannerUrl').value = branding.bannerUrl || '';
  document.getElementById('imgAboutUrl').value = branding.aboutImageUrl || '';
  document.getElementById('imgSafetyUrl').value = branding.safetyImageUrl || '';

  const form = document.getElementById('imageManagerForm');
  if (!form) return;

  form.onsubmit = async (e) => {
    e.preventDefault();
    branding.logoUrl = document.getElementById('imgLogoUrl').value.trim();
    branding.bannerUrl = document.getElementById('imgBannerUrl').value.trim();
    branding.aboutImageUrl = document.getElementById('imgAboutUrl').value.trim();
    branding.safetyImageUrl = document.getElementById('imgSafetyUrl').value.trim();

    await DB.set('settings/branding', branding);

    if (typeof loadDynamicContent === 'function') {
      await loadDynamicContent();
    }

    await logAdminAction("IMAGE_URL_UPDATE", "Image Manager", "Updated site logo and banner URLs.");
    showToast("Image URLs saved & updated live!", "success");
  };
}

// 5. Reset Website System
async function confirmResetWebsite() {
  if (confirm("WARNING: This will reset website configuration, theme, and copy to default settings. User accounts, stays, bookings and reports will NOT be deleted. Proceed?")) {
    const localStore = new LocalDatabaseStore();
    localStore.resetToDefaults();
    await logAdminAction("WEBSITE_RESET", "Settings & Content", "Restored default CMS & Theme configuration.");
    showToast("Website configuration reset to default!", "info");
    setTimeout(() => { location.reload(); }, 1000);
  }
}

// 6. User Management Table
async function loadUserManagementTable() {
  const usersObj = await DB.get('users') || {};
  const users = Object.values(usersObj);

  const container = document.getElementById('usersTableBody');
  if (!container) return;

  container.innerHTML = users.map(u => `
    <tr>
      <td>
        <div class="d-flex align-items-center gap-2">
          ${getAvatarHtml(u.name, 'sm')}
          <div>
            <strong>${u.name}</strong><br>
            <small class="text-muted">${u.email}</small>
          </div>
        </div>
      </td>
      <td><span class="badge bg-secondary">${u.role}</span></td>
      <td>${u.city || 'NCR'}</td>
      <td>
        <span class="status-badge status-${u.status || (u.verified ? 'ACTIVE' : 'PENDING')}">
          ${u.status || (u.verified ? 'VERIFIED' : 'UNVERIFIED')}
        </span>
      </td>
      <td>
        <div class="d-flex align-items-center gap-1">
          <button onclick="toggleUserVerify('${u.id}')" class="btn btn-sm btn-outline-primary" title="Toggle Verification Badge">
            <i class="bi bi-patch-check-fill"></i> ${u.verified ? 'Verified' : 'Verify'}
          </button>
          <button onclick="updateUserStatus('${u.id}', '${u.status === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED'}')" class="btn btn-sm btn-outline-warning">
            ${u.status === 'SUSPENDED' ? 'Restore' : 'Suspend'}
          </button>
          <button onclick="deleteUserAdmin('${u.id}')" class="btn btn-sm btn-danger fw-bold" title="Permanently Delete User Account">
            <i class="bi bi-trash-fill me-1"></i> Delete
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

async function toggleUserVerify(userId) {
  const usersObj = await DB.get('users') || {};
  const user = usersObj[userId];
  if (!user) return;

  user.verified = !user.verified;
  await DB.set(`users/${userId}`, user);
  await logAdminAction("USER_VERIFY_TOGGLE", user.name, `Toggled verification to ${user.verified}`);
  showToast(`Verification status updated for ${user.name}`, "success");
  loadUserManagementTable();
}

async function updateUserStatus(userId, status) {
  await DB.update(`users/${userId}`, { status });
  await logAdminAction("USER_STATUS_CHANGE", userId, `Set user status to ${status}`);
  showToast(`User status set to ${status}`, "info");
  loadUserManagementTable();
}

async function deleteUserAdmin(userId) {
  const usersObj = await DB.get('users') || {};
  const user = usersObj[userId];
  const userName = user ? user.name : userId;

  if (confirm(`Are you sure you want to permanently delete user account "${userName}" (${userId})? This will delete the user account from the database server.`)) {
    await DB.set(`users/${userId}`, null);
    await logAdminAction("USER_DELETE", userName, `Permanently deleted user account ${userId}`);
    showToast(`User account "${userName}" deleted permanently!`, "info");
    await loadUserManagementTable();
    await loadAdminStats();
  }
}

// 7. Stay Management Table
async function loadStayManagementTable() {
  const staysObj = await DB.get('stays') || {};
  const stays = Object.values(staysObj);

  const container = document.getElementById('staysTableBody');
  if (!container) return;

  container.innerHTML = stays.map(s => `
    <tr>
      <td><strong>${s.title}</strong><br><small class="text-muted">${s.area}, ${s.city}</small></td>
      <td>${s.hostName}</td>
      <td>${s.roomType}</td>
      <td>₹${s.pricePerDay}/day</td>
      <td><span class="status-badge status-${s.status}">${s.status}</span></td>
      <td>
        <button onclick="updateStayStatus('${s.id}', 'ACTIVE')" class="btn btn-sm btn-success me-1">Approve</button>
        <button onclick="updateStayStatus('${s.id}', 'SUSPENDED')" class="btn btn-sm btn-warning me-1">Suspend</button>
        <button onclick="deleteStayAdmin('${s.id}')" class="btn btn-sm btn-danger">Delete</button>
      </td>
    </tr>
  `).join('');
}

async function updateStayStatus(stayId, status) {
  await DB.update(`stays/${stayId}`, { status });
  await logAdminAction("STAY_STATUS_CHANGE", stayId, `Changed stay status to ${status}`);
  showToast(`Stay listing status updated to ${status}`, "success");
  loadStayManagementTable();
}

async function deleteStayAdmin(stayId) {
  if (confirm("Delete this stay listing permanently?")) {
    await DB.set(`stays/${stayId}`, null);
    await logAdminAction("STAY_DELETE", stayId, "Permanently deleted stay listing.");
    showToast("Stay deleted.", "info");
    loadStayManagementTable();
  }
}

// 8. Bookings Audit
async function loadBookingManagementTable() {
  const bookObj = await DB.get('bookings') || {};
  const bookings = Object.values(bookObj);

  const container = document.getElementById('bookingsTableBody');
  if (!container) return;

  container.innerHTML = bookings.map(b => `
    <tr>
      <td><small>${b.id}</small></td>
      <td>${b.guestName}</td>
      <td>${b.hostName}</td>
      <td>${b.checkIn} to ${b.checkOut}</td>
      <td><span class="badge bg-primary">${b.status}</span></td>
    </tr>
  `).join('');
}

// 9. Matching Weights Configurator
async function loadMatchingWeightsForm() {
  const weights = await DB.get('matchingWeights') || {
    commonInterests: 40,
    sameCity: 20,
    languages: 15,
    ageCompatibility: 15,
    socialPreferences: 10
  };

  document.getElementById('weightInterests').value = weights.commonInterests;
  document.getElementById('weightCity').value = weights.sameCity;
  document.getElementById('weightLanguages').value = weights.languages;
  document.getElementById('weightAge').value = weights.ageCompatibility;
  document.getElementById('weightSocial').value = weights.socialPreferences;

  const form = document.getElementById('matchingWeightsForm');
  if (!form) return;

  form.onsubmit = async (e) => {
    e.preventDefault();
    const w1 = parseInt(document.getElementById('weightInterests').value) || 0;
    const w2 = parseInt(document.getElementById('weightCity').value) || 0;
    const w3 = parseInt(document.getElementById('weightLanguages').value) || 0;
    const w4 = parseInt(document.getElementById('weightAge').value) || 0;
    const w5 = parseInt(document.getElementById('weightSocial').value) || 0;

    const sum = w1 + w2 + w3 + w4 + w5;
    if (sum !== 100) {
      showToast(`Total algorithm weight must equal exactly 100%! Current sum: ${sum}%`, "error");
      return;
    }

    const updatedWeights = {
      commonInterests: w1,
      sameCity: w2,
      languages: w3,
      ageCompatibility: w4,
      socialPreferences: w5
    };

    await DB.set('matchingWeights', updatedWeights);
    await logAdminAction("MATCHING_WEIGHTS_UPDATE", "Algorithm", `Updated matching weights to sum 100%`);
    showToast("Social matching algorithm weights saved!", "success");
  };
}

// 10. SOS Emergency Center
async function loadSosAlertsCenter() {
  const alertsObj = await DB.get('sosAlerts') || {};
  const alerts = Object.values(alertsObj);

  const container = document.getElementById('sosAlertsContainer');
  if (!container) return;

  if (alerts.length === 0) {
    container.innerHTML = `<p class="text-muted">No SOS alerts recorded.</p>`;
    return;
  }

  container.innerHTML = alerts.map(a => `
    <div class="card mb-3 border-danger border-2 p-3">
      <div class="d-flex justify-content-between align-items-center">
        <div>
          <h6 class="fw-bold text-danger mb-1"><i class="bi bi-shield-slash-fill"></i> SOS ALERT: ${a.userName}</h6>
          <small class="text-muted">User: ${a.userEmail} | City: ${a.userCity} | Time: ${new Date(a.timestamp).toLocaleString()}</small>
        </div>
        <div>
          <span class="badge ${a.status === 'ACTIVE' ? 'bg-danger' : 'bg-success'} p-2 me-2">${a.status}</span>
          ${a.status === 'ACTIVE' ? `
            <button onclick="resolveSosAlert('${a.id}')" class="btn btn-sm btn-success fw-bold">Resolve SOS</button>
          ` : ''}
        </div>
      </div>
    </div>
  `).join('');
}

async function resolveSosAlert(alertId) {
  await DB.update(`sosAlerts/${alertId}`, { status: "RESOLVED" });
  await logAdminAction("SOS_RESOLVE", alertId, "Resolved active SOS emergency alert.");
  showToast("SOS Alert marked as RESOLVED.", "success");
  loadSosAlertsCenter();
  loadAdminStats();
}

// 11. Feature Flags Management
async function loadFeatureFlagToggles() {
  const flags = await DB.get('featureFlags') || {};
  const menu = await DB.get('menuVisibility') || {};

  document.querySelectorAll('.feature-flag-toggle').forEach(input => {
    const flagKey = input.getAttribute('data-flag');
    if (flags[flagKey] !== undefined) input.checked = flags[flagKey];
    input.onchange = async () => {
      flags[flagKey] = input.checked;
      await DB.set('featureFlags', flags);
      await logAdminAction("FEATURE_FLAG_TOGGLE", flagKey, `Set ${flagKey} to ${input.checked}`);
      showToast(`Feature '${flagKey}' updated.`, "info");
    };
  });

  document.querySelectorAll('.menu-toggle').forEach(input => {
    const menuKey = input.getAttribute('data-menu');
    if (menu[menuKey] !== undefined) input.checked = menu[menuKey];
    input.onchange = async () => {
      menu[menuKey] = input.checked;
      await DB.set('menuVisibility', menu);
      await logAdminAction("MENU_TOGGLE", menuKey, `Set menu '${menuKey}' to ${input.checked}`);
      showToast(`Menu '${menuKey}' updated.`, "info");
    };
  });
}

// 12. Admin Logs Audit Table
async function loadAdminLogsTable() {
  const logsObj = await DB.get('adminLogs') || {};
  const logs = Object.values(logsObj).reverse();

  const container = document.getElementById('adminLogsTableBody');
  if (!container) return;

  container.innerHTML = logs.map(l => `
    <tr>
      <td><small>${new Date(l.timestamp).toLocaleString()}</small></td>
      <td><strong>${l.adminName || 'Admin'}</strong></td>
      <td><span class="badge bg-dark">${l.action}</span></td>
      <td>${l.target}</td>
      <td class="small text-secondary">${l.description}</td>
    </tr>
  `).join('');
}

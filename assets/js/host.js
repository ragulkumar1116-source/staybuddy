/**
  StayBuddy - Host Application SPA Controller
*/

let currentHost = null;

document.addEventListener("DOMContentLoaded", async () => {
  currentHost = getCurrentUser();
  if (!currentHost) {
    showToast("Please log in to access StayBuddy Host Portal.", "warning");
    setTimeout(() => { window.location.href = "auth.html"; }, 800);
    return;
  }

  // Set host profile header UI
  document.querySelectorAll('.host-display-name').forEach(el => el.textContent = currentHost.name);
  document.querySelectorAll('.host-avatar-container').forEach(el => el.innerHTML = getAvatarHtml(currentHost.name, 'sm'));

  // Host Nav SPA Bindings
  document.querySelectorAll('.host-nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const sec = link.getAttribute('data-section');
      switchHostSection(sec);
    });
  });

  // Bind Add Stay Form
  const addForm = document.getElementById('addStayForm');
  if (addForm) {
    addForm.addEventListener('submit', handleAddStay);
  }

  await loadHostStays();
  await loadHostRequests();
  await loadHostGuests();
  await loadHostReviews();
  await loadHostNotifications();
  await loadHostProfileForm();
  await loadHostDashboardStats();

  switchHostSection('dashboard');
});

function switchHostSection(sectionId) {
  document.querySelectorAll('.host-section').forEach(sec => sec.classList.add('d-none'));
  const target = document.getElementById(`host-section-${sectionId}`);
  if (target) {
    target.classList.remove('d-none');
  } else {
    document.getElementById('host-section-dashboard').classList.remove('d-none');
  }

  document.querySelectorAll('.host-nav-link').forEach(l => {
    if (l.getAttribute('data-section') === sectionId) {
      l.classList.add('active');
    } else {
      l.classList.remove('active');
    }
  });
}

// Add New Stay Listing
async function handleAddStay(e) {
  e.preventDefault();

  const title = document.getElementById('stayTitle').value.trim();
  const city = document.getElementById('stayCity').value.trim();
  const area = document.getElementById('stayArea').value.trim();
  const roomType = document.getElementById('stayRoomType').value;
  const pricePerDay = parseFloat(document.getElementById('stayPrice').value) || 250;
  const description = document.getElementById('stayDescription').value.trim();
  const rules = document.getElementById('stayRules').value.trim();

  // Selected Amenities
  const amenities = [];
  document.querySelectorAll('.stay-amenity-check:checked').forEach(c => amenities.push(c.value));

  const newStay = {
    id: "stay_" + Date.now(),
    hostId: currentHost.id,
    hostName: currentHost.name,
    title,
    city,
    area,
    roomType,
    pricePerDay,
    amenities,
    rules,
    description,
    status: "ACTIVE", // Auto-active or pending admin review
    created: new Date().toISOString().split('T')[0]
  };

  await DB.push('stays', newStay);
  showToast("New stay listing created successfully!", "success");
  document.getElementById('addStayForm').reset();
  await loadHostStays();
  switchHostSection('myStays');
}

// Load Host's Listed Stays
async function loadHostStays() {
  const staysObj = await DB.get('stays') || {};
  const myStays = Object.values(staysObj).filter(s => s.hostId === currentHost.id);

  const container = document.getElementById('hostStaysContainer');
  if (!container) return;

  if (myStays.length === 0) {
    container.innerHTML = `
      <div class="col-12 text-center py-4">
        <i class="bi bi-house-add text-muted display-4"></i>
        <h6 class="mt-3 text-muted">You haven't listed any stays yet.</h6>
      </div>
    `;
    return;
  }

  container.innerHTML = myStays.map(s => `
    <div class="col-md-6 mb-3">
      <div class="card h-100 p-3 border shadow-sm">
        <div class="d-flex justify-content-between align-items-center mb-2">
          <span class="badge bg-primary">${s.roomType}</span>
          <span class="fw-bold text-success">₹${s.pricePerDay}/day</span>
        </div>
        <h5 class="fw-bold mb-1">${s.title}</h5>
        <p class="small text-muted mb-2"><i class="bi bi-geo-alt-fill text-danger"></i> ${s.area}, ${s.city}</p>
        <p class="small text-secondary line-clamp-2">${s.description}</p>
        <div class="d-flex justify-content-between align-items-center mt-auto pt-2 border-top">
          <small class="text-muted">Status: <strong class="text-success">${s.status}</strong></small>
          <button onclick="deleteHostStay('${s.id}')" class="btn btn-sm btn-outline-danger">Delete</button>
        </div>
      </div>
    </div>
  `).join('');
}

async function deleteHostStay(stayId) {
  if (confirm("Are you sure you want to remove this stay listing?")) {
    await DB.set(`stays/${stayId}`, null);
    showToast("Stay listing removed.", "info");
    loadHostStays();
  }
}

// Load Guest Requests for Host
async function loadHostRequests() {
  const reqObj = await DB.get('stayRequests') || {};
  const myRequests = Object.values(reqObj).filter(r => r.hostId === currentHost.id);

  const container = document.getElementById('hostRequestsContainer');
  if (!container) return;

  if (myRequests.length === 0) {
    container.innerHTML = `<p class="text-muted">No pending guest stay requests.</p>`;
    return;
  }

  container.innerHTML = myRequests.map(r => `
    <div class="card mb-3 border p-3">
      <div class="d-flex justify-content-between align-items-center">
        <div>
          <h6 class="fw-bold mb-1">${r.guestName} (${r.guestEmail})</h6>
          <small class="text-muted">Listing: ${r.stayTitle} | Dates: ${r.checkIn} to ${r.checkOut} (${r.guests} guest/s)</small>
        </div>
        <div>
          ${r.status === 'REQUESTED' ? `
            <button onclick="updateRequestStatus('${r.id}', 'ACCEPTED')" class="btn btn-sm btn-success fw-bold me-1">Accept</button>
            <button onclick="updateRequestStatus('${r.id}', 'REJECTED')" class="btn btn-sm btn-danger fw-bold">Reject</button>
          ` : `<span class="badge bg-secondary">${r.status}</span>`}
        </div>
      </div>
    </div>
  `).join('');
}

async function updateRequestStatus(reqId, status) {
  const reqObj = await DB.get('stayRequests') || {};
  const req = reqObj[reqId];
  if (!req) return;

  req.status = status;
  await DB.set(`stayRequests/${reqId}`, req);

  if (status === 'ACCEPTED') {
    // Create confirmed booking entry
    const bookingData = {
      id: "book_" + Date.now(),
      stayId: req.stayId,
      stayTitle: req.stayTitle,
      hostId: req.hostId,
      hostName: currentHost.name,
      guestId: req.guestId,
      guestName: req.guestName,
      checkIn: req.checkIn,
      checkOut: req.checkOut,
      guests: req.guests,
      status: "CONFIRMED",
      created: new Date().toISOString()
    };
    await DB.push('bookings', bookingData);
    showToast(`Stay request accepted! Booking confirmed for ${req.guestName}.`, "success");
  } else {
    showToast("Stay request rejected.", "info");
  }

  await loadHostRequests();
  await loadHostGuests();
  await loadHostDashboardStats();
}

// Load Current Guests (Deduplicated)
async function loadHostGuests() {
  const bookObj = await DB.get('bookings') || {};
  const allBookings = Object.values(bookObj).filter(b => b && b.hostId === currentHost.id);

  // Deduplicate by booking ID or stayId+guestId+checkIn
  const uniqueMap = new Map();
  allBookings.forEach(b => {
    const key = b.id || `${b.stayId}_${b.guestId}_${b.checkIn}`;
    if (!uniqueMap.has(key)) {
      uniqueMap.set(key, b);
    }
  });
  const myBookings = Array.from(uniqueMap.values());

  const container = document.getElementById('hostGuestsContainer');
  if (!container) return;

  if (myBookings.length === 0) {
    container.innerHTML = `<p class="text-muted">No confirmed or current guests.</p>`;
    return;
  }

  container.innerHTML = myBookings.map(b => `
    <div class="card mb-3 border p-3">
      <div class="d-flex justify-content-between align-items-center">
        <div>
          <h6 class="fw-bold mb-1">${b.guestName}</h6>
          <small class="text-muted">Stay: <strong>${b.stayTitle || 'Stay'}</strong> | Dates: ${b.checkIn} to ${b.checkOut} | Status: <strong class="text-primary">${b.status}</strong></small>
        </div>
        <div>
          ${b.status === 'CONFIRMED' ? `
            <button onclick="updateBookingStatus('${b.id}', 'CHECKED_IN')" class="btn btn-sm btn-primary">Check In</button>
          ` : b.status === 'CHECKED_IN' ? `
            <button onclick="updateBookingStatus('${b.id}', 'CHECKED_OUT')" class="btn btn-sm btn-warning">Check Out</button>
          ` : `<span class="badge bg-secondary">${b.status}</span>`}
        </div>
      </div>
    </div>
  `).join('');
}

async function updateBookingStatus(bookingId, status) {
  await DB.update(`bookings/${bookingId}`, { status });
  showToast(`Guest status updated to ${status}.`, "success");
  loadHostGuests();
}

// Load Host Reviews
async function loadHostReviews() {
  const revObj = await DB.get('reviews') || {};
  const myReviews = Object.values(revObj).filter(r => r.hostId === currentHost.id);

  const container = document.getElementById('hostReviewsContainer');
  if (!container) return;

  if (myReviews.length === 0) {
    container.innerHTML = `<p class="text-muted">No guest reviews received yet.</p>`;
    return;
  }

  container.innerHTML = myReviews.map(r => `
    <div class="card mb-2 p-3 border">
      <div class="d-flex justify-content-between">
        <h6 class="fw-bold">${r.userName}</h6>
        <span class="text-warning">${'⭐'.repeat(r.rating || 5)}</span>
      </div>
      <p class="small text-secondary mb-0">${r.comment}</p>
    </div>
  `).join('');
}

// Host Notifications System
async function loadHostNotifications() {
  const notifObj = await DB.get('notifications') || {};
  const hostNotifs = Object.values(notifObj).filter(n => n && n.userId === currentHost.id).reverse();

  const badgeEl = document.getElementById('hostNotifBadge');
  const container = document.getElementById('hostNotificationsContainer');

  const unreadCount = hostNotifs.filter(n => !n.read).length;
  if (badgeEl) {
    if (unreadCount > 0) {
      badgeEl.textContent = unreadCount;
      badgeEl.classList.remove('d-none');
    } else {
      badgeEl.classList.add('d-none');
    }
  }

  if (!container) return;

  if (hostNotifs.length === 0) {
    container.innerHTML = `
      <div class="text-center py-5 text-muted">
        <i class="bi bi-bell-slash display-4"></i>
        <h6 class="mt-3 fw-bold">No Host Notifications</h6>
        <p class="small mb-0">Guest stay requests, bookings, and reviews will be logged here.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = hostNotifs.map(n => {
    const iconClass = n.type === 'SUCCESS' ? 'bi-check-circle-fill text-success' :
                      n.type === 'WARNING' ? 'bi-exclamation-triangle-fill text-warning' :
                      n.type === 'DANGER' ? 'bi-shield-slash-fill text-danger' : 'bi-info-circle-fill text-primary';
    const bgClass = n.read ? 'bg-light text-secondary' : 'bg-white border-primary shadow-sm';

    return `
      <div class="card mb-3 p-3 border ${bgClass}">
        <div class="d-flex align-items-start gap-3">
          <i class="bi ${iconClass} fs-3"></i>
          <div class="flex-grow-1">
            <div class="d-flex justify-content-between align-items-center mb-1">
              <h6 class="fw-bold mb-0 ${n.read ? 'text-dark' : 'text-primary'}">${n.title}</h6>
              <small class="text-muted">${new Date(n.timestamp).toLocaleString()}</small>
            </div>
            <p class="small mb-0 text-secondary">${n.message}</p>
          </div>
          ${!n.read ? `<span class="badge bg-primary rounded-pill">New</span>` : ''}
        </div>
      </div>
    `;
  }).join('');
}

async function markHostNotificationsRead() {
  const notifObj = await DB.get('notifications') || {};
  for (let [key, n] of Object.entries(notifObj)) {
    if (n && n.userId === currentHost.id && !n.read) {
      await DB.update(`notifications/${key}`, { read: true });
    }
  }
  showToast("All host notifications marked as read.", "success");
  await loadHostNotifications();
}

// Host Profile & Security Handler
async function loadHostProfileForm() {
  if (!currentHost) return;

  if (document.getElementById('editHostName')) document.getElementById('editHostName').value = currentHost.name || '';
  if (document.getElementById('editHostEmail')) document.getElementById('editHostEmail').value = currentHost.email || '';
  if (document.getElementById('editHostPhone')) document.getElementById('editHostPhone').value = currentHost.phone || '';
  if (document.getElementById('editHostCity')) document.getElementById('editHostCity').value = currentHost.city || 'Bengaluru';
  if (document.getElementById('editHostAddress')) document.getElementById('editHostAddress').value = currentHost.address || '';
  if (document.getElementById('editHostBio')) document.getElementById('editHostBio').value = currentHost.bio || '';

  const form = document.getElementById('hostProfileForm');
  if (!form) return;

  form.onsubmit = async (e) => {
    e.preventDefault();

    const name = document.getElementById('editHostName').value.trim();
    const email = document.getElementById('editHostEmail').value.trim();
    const phone = document.getElementById('editHostPhone').value.trim();
    const city = document.getElementById('editHostCity').value.trim();
    const address = document.getElementById('editHostAddress').value.trim();
    const bio = document.getElementById('editHostBio').value.trim();

    const newPassword = document.getElementById('editHostPassword').value.trim();
    const confirmPassword = document.getElementById('editHostConfirmPassword').value.trim();

    if (newPassword || confirmPassword) {
      if (newPassword !== confirmPassword) {
        showToast("New passwords do not match!", "danger");
        return;
      }
      if (newPassword.length < 6) {
        showToast("Password must be at least 6 characters long.", "warning");
        return;
      }
    }

    const updatedHost = {
      ...currentHost,
      name,
      email,
      phone,
      city,
      address,
      bio
    };

    if (newPassword) {
      updatedHost.password = newPassword;
      if (typeof firebase !== 'undefined' && firebase.auth && firebase.auth().currentUser) {
        try {
          await firebase.auth().currentUser.updatePassword(newPassword);
          console.log("🔥 Firebase Auth: Host password updated on server!");
        } catch (authErr) {
          console.warn("Firebase Auth Password Update Notice:", authErr.message);
        }
      }
    }

    await DB.set(`users/${currentHost.id}`, updatedHost);
    setCurrentUser(updatedHost);
    currentHost = updatedHost;

    document.querySelectorAll('.host-display-name').forEach(el => el.textContent = currentHost.name);
    document.querySelectorAll('.host-avatar-container').forEach(el => el.innerHTML = getAvatarHtml(currentHost.name, 'sm'));

    showToast("Host profile & security settings saved!", "success");

    if (document.getElementById('editHostPassword')) document.getElementById('editHostPassword').value = '';
    if (document.getElementById('editHostConfirmPassword')) document.getElementById('editHostConfirmPassword').value = '';
  };
}

// Host Modal for Writing Reviews for Guests
async function openHostAddReviewModal() {
  const bookObj = await DB.get('bookings') || {};
  const myBookings = Object.values(bookObj).filter(b => b.hostId === currentHost.id);

  let modalEl = document.getElementById('hostReviewModal');
  if (modalEl) modalEl.remove();

  const guestOptions = myBookings.length > 0 
    ? myBookings.map(b => `<option value="${b.guestName}">${b.guestName} (${b.stayTitle})</option>`).join('')
    : `<option value="">No past guests recorded (type guest name below)</option>`;

  const html = `
    <div class="modal fade" id="hostReviewModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title fw-bold"><i class="bi bi-star-fill text-warning me-2"></i> Write Guest Review & Rating</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <form id="submitHostReviewForm">
              <div class="mb-3">
                <label class="form-label fw-bold">Select Guest from Bookings</label>
                <select id="hostRevGuestSelect" class="form-select mb-2" onchange="document.getElementById('hostRevGuestName').value = this.value">
                  ${guestOptions}
                </select>
                <input type="text" id="hostRevGuestName" class="form-control" placeholder="Type guest name..." required>
              </div>

              <div class="mb-3">
                <label class="form-label fw-bold">Star Rating</label>
                <select id="hostRevRating" class="form-select">
                  <option value="5">⭐⭐⭐⭐⭐ (5/5 - Excellent Guest)</option>
                  <option value="4">⭐⭐⭐⭐ (4/5 - Good Guest)</option>
                  <option value="3">⭐⭐⭐ (3/5 - Average)</option>
                  <option value="2">⭐⭐ (2/5 - Poor)</option>
                  <option value="1">⭐ (1/5 - Unsafe / Not Recommended)</option>
                </select>
              </div>

              <div class="mb-3">
                <label class="form-label fw-bold">Review Comment / House Feedback</label>
                <textarea id="hostRevComment" class="form-control" rows="3" placeholder="Describe the guest's behavior, cleanliness, and house rule compliance..." required></textarea>
              </div>

              <button type="submit" class="btn btn-primary w-100 fw-bold">Publish Review</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', html);
  const bsModal = new bootstrap.Modal(document.getElementById('hostReviewModal'));
  bsModal.show();

  document.getElementById('submitHostReviewForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const guestName = document.getElementById('hostRevGuestName').value.trim();
    const rating = parseInt(document.getElementById('hostRevRating').value);
    const comment = document.getElementById('hostRevComment').value.trim();

    await DB.push('reviews', {
      hostId: currentHost.id,
      userName: `Host Review for ${guestName}`,
      rating,
      comment,
      date: new Date().toISOString().split('T')[0]
    });

    showToast(`Guest review published for ${guestName}!`, "success");
    bsModal.hide();
    loadHostReviews();
  });
}

// Host Dashboard Stats, Approved Bookings Table & Activity Logs
async function loadHostDashboardStats() {
  const staysObj = await DB.get('stays') || {};
  const myStays = Object.values(staysObj).filter(s => s && s.hostId === currentHost.id);

  const reqObj = await DB.get('stayRequests') || {};
  const myReqs = Object.values(reqObj).filter(r => r && r.hostId === currentHost.id);
  const approvedReqs = myReqs.filter(r => r.status === 'ACCEPTED' || r.status === 'CONFIRMED');

  const bookObj = await DB.get('bookings') || {};
  const myBookings = Object.values(bookObj).filter(b => b && b.hostId === currentHost.id);

  const revObj = await DB.get('reviews') || {};
  const myReviews = Object.values(revObj).filter(r => r && r.hostId === currentHost.id);

  if (document.getElementById('hostStatStays')) document.getElementById('hostStatStays').textContent = myStays.length;
  if (document.getElementById('hostStatApproved')) document.getElementById('hostStatApproved').textContent = approvedReqs.length;
  if (document.getElementById('hostStatGuests')) document.getElementById('hostStatGuests').textContent = myBookings.length;
  if (document.getElementById('hostStatReviews')) document.getElementById('hostStatReviews').textContent = myReviews.length;

  // Render Pending Guest Stay Requests on Host Dashboard
  const pendingContainer = document.getElementById('hostDashboardPendingRequests');
  if (pendingContainer) {
    const pendingReqs = myReqs.filter(r => r.status === 'REQUESTED');
    if (pendingReqs.length === 0) {
      pendingContainer.innerHTML = `<div class="text-muted text-center py-3"><i class="bi bi-check2-all text-success me-1"></i> No pending guest stay requests right now.</div>`;
    } else {
      pendingContainer.innerHTML = pendingReqs.map(r => `
        <div class="card mb-2 p-3 border border-warning bg-light rounded-3">
          <div class="d-flex justify-content-between align-items-center">
            <div class="d-flex align-items-center gap-3">
              ${getAvatarHtml(r.guestName || 'Guest', 'sm')}
              <div>
                <h6 class="fw-bold mb-0">${r.guestName} <small class="text-muted">(${r.guestEmail || ''})</small></h6>
                <small class="text-secondary">Stay: <strong>${r.stayTitle}</strong> | Dates: <strong>${r.checkIn}</strong> to <strong>${r.checkOut}</strong> (${r.guests || 1} guest)</small>
              </div>
            </div>
            <div class="d-flex gap-2">
              <button onclick="handleAcceptRequest('${r.id}', 'ACCEPTED')" class="btn btn-sm btn-success fw-bold px-3"><i class="bi bi-check-circle-fill me-1"></i> Accept</button>
              <button onclick="handleAcceptRequest('${r.id}', 'REJECTED')" class="btn btn-sm btn-outline-danger fw-bold"><i class="bi bi-x-circle me-1"></i> Reject</button>
            </div>
          </div>
        </div>
      `).join('');
    }
  }

  // Render Approved Requests & Bookings Table on Host Dashboard (Deduplicated)
  const tableBody = document.getElementById('hostApprovedBookingsTable');
  if (tableBody) {
    // Deduplicate bookings and approved requests by stayId + guestId + checkIn
    const uniqueItemsMap = new Map();
    myBookings.forEach(b => {
      const key = b.id || `${b.stayId}_${b.guestId}_${b.checkIn}`;
      uniqueItemsMap.set(key, b);
    });
    approvedReqs.forEach(r => {
      const key = r.id || `${r.stayId}_${r.guestId}_${r.checkIn}`;
      const alreadyHasBooking = myBookings.some(b => b.stayId === r.stayId && b.guestId === r.guestId && b.checkIn === r.checkIn);
      if (!alreadyHasBooking) {
        uniqueItemsMap.set(key, r);
      }
    });
    const combinedList = Array.from(uniqueItemsMap.values());

    if (combinedList.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="5" class="text-center text-muted py-4">No approved stay requests or active bookings yet.</td></tr>`;
    } else {
      tableBody.innerHTML = combinedList.map(item => `
        <tr>
          <td><strong>${item.stayTitle}</strong></td>
          <td>
            <div class="d-flex align-items-center gap-2">
              ${getAvatarHtml(item.guestName || 'Guest', 'sm')}
              <div>
                <strong>${item.guestName || 'Guest'}</strong><br>
                <small class="text-muted">${item.guestEmail || ''}</small>
              </div>
            </div>
          </td>
          <td><small>${item.checkIn} to ${item.checkOut}</small></td>
          <td><span class="badge bg-success">${item.status || 'CONFIRMED'}</span></td>
          <td>
            ${item.status === 'CONFIRMED' ? `
              <button onclick="updateBookingStatus('${item.id}', 'CHECKED_IN')" class="btn btn-sm btn-primary">Check In</button>
            ` : item.status === 'CHECKED_IN' ? `
              <button onclick="updateBookingStatus('${item.id}', 'CHECKED_OUT')" class="btn btn-sm btn-warning">Check Out</button>
            ` : `<span class="badge bg-secondary">${item.status}</span>`}
          </td>
        </tr>
      `).join('');
    }
  }

  // Render Host Activity Logs Feed
  const logsContainer = document.getElementById('hostActivityLogsContainer');
  if (logsContainer) {
    const notifObj = await DB.get('notifications') || {};
    const hostLogs = Object.values(notifObj).filter(n => n && n.userId === currentHost.id).reverse();

    if (hostLogs.length === 0) {
      logsContainer.innerHTML = `<p class="text-muted mb-0">No recent activity logs recorded.</p>`;
    } else {
      logsContainer.innerHTML = hostLogs.slice(0, 5).map(l => `
        <div class="p-2 border-bottom d-flex justify-content-between align-items-center">
          <div>
            <strong class="text-dark">${l.title}</strong> - <span class="small text-secondary">${l.message}</span>
          </div>
          <small class="text-muted">${new Date(l.timestamp).toLocaleTimeString()}</small>
        </div>
      `).join('');
    }
  }
}

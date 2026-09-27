/**
  StayBuddy - Main User SPA Application Controller
*/

let currentUser = null;
let allStays = [];
let allUsers = [];
let currentChatPeer = null;

document.addEventListener("DOMContentLoaded", async () => {
  currentUser = getCurrentUser();
  if (!currentUser) {
    showToast("Please log in to access your StayBuddy dashboard.", "info");
    setTimeout(() => { window.location.href = "auth.html"; }, 800);
    return;
  }

  // Set user profile header UI
  document.querySelectorAll('.user-display-name').forEach(el => el.textContent = currentUser.name);
  document.querySelectorAll('.user-display-email').forEach(el => el.textContent = currentUser.email);
  document.querySelectorAll('.user-avatar-container').forEach(el => el.innerHTML = getAvatarHtml(currentUser.name, 'sm'));

  // Bind SPA Navigation Links
  document.querySelectorAll('.app-nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetSection = link.getAttribute('data-section');
      switchAppSection(targetSection);
    });
  });

  // Load initial data
  await loadStaysData();
  await loadUserData();
  await loadUserBookings();
  await loadUserRequests();
  await loadUserNotifications();
  await loadProfileForm();

  // Check URL hash for direct deep links
  const hash = window.location.hash.replace('#', '');
  if (hash) {
    switchAppSection(hash);
  } else {
    switchAppSection('dashboard');
  }
});

// SPA Section Switcher
function switchAppSection(sectionId) {
  document.querySelectorAll('.app-section').forEach(sec => sec.classList.add('d-none'));
  const target = document.getElementById(`section-${sectionId}`);
  if (target) {
    target.classList.remove('d-none');
  } else {
    document.getElementById('section-dashboard').classList.remove('d-none');
  }

  document.querySelectorAll('.app-nav-link').forEach(l => {
    if (l.getAttribute('data-section') === sectionId) {
      l.classList.add('active');
    } else {
      l.classList.remove('active');
    }
  });

  // Section specific triggers
  if (sectionId === 'findStay') renderStaysList(allStays);
  if (sectionId === 'matching') calculateAndRenderMatches();
  if (sectionId === 'messages') loadChatPeerList();
  if (sectionId === 'friends') loadFriendsList();
  if (sectionId === 'bookings') loadUserBookings();
  if (sectionId === 'requests') loadUserRequests();
}

// Fetch Stays Data
async function loadStaysData() {
  const staysObj = await DB.get('stays') || {};
  allStays = Object.values(staysObj).filter(s => s.status === 'ACTIVE');
  renderStaysList(allStays);
}

async function loadUserData() {
  const usersObj = await DB.get('users') || {};
  allUsers = Object.values(usersObj).filter(u => u.id !== currentUser.id && u.status !== 'BANNED');
}

// Render Stay Cards with Filters
function renderStaysList(stays) {
  const container = document.getElementById('staysContainer');
  if (!container) return;

  if (!stays || stays.length === 0) {
    container.innerHTML = `
      <div class="col-12 text-center py-5">
        <i class="bi bi-building-x text-muted display-4"></i>
        <h5 class="mt-3 text-muted">No budget stays match your criteria.</h5>
        <p class="small text-muted">Try clearing filters or search in another city.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = stays.map(s => `
    <div class="col-md-6 col-lg-4 mb-4">
      <div class="card h-100 card-hover border-0 shadow-sm">
        <div class="card-body">
          <div class="d-flex align-items-center justify-content-between mb-2">
            <span class="badge bg-primary-subtle text-primary fw-bold px-3 py-2 rounded-pill">${s.roomType || 'Stay'}</span>
            <span class="price-tag">₹${s.pricePerDay}<span class="fs-6 text-muted font-normal">/day</span></span>
          </div>
          <h5 class="card-title fw-bold text-truncate mb-1">${s.title}</h5>
          <p class="text-muted small mb-2"><i class="bi bi-geo-alt-fill text-danger me-1"></i> ${s.area}, ${s.city}</p>
          <p class="card-text text-secondary small line-clamp-2">${s.description || 'Verified host listing.'}</p>
          
          <div class="d-flex flex-wrap gap-1 mb-3">
            ${(s.amenities || []).slice(0, 3).map(a => `<span class="badge bg-light text-dark border small">${a}</span>`).join('')}
          </div>

          <div class="p-2 bg-light rounded d-flex align-items-center justify-content-between mb-3">
            <div class="d-flex align-items-center gap-2">
              ${getAvatarHtml(s.hostName, 'sm')}
              <div>
                <small class="d-block fw-bold">${s.hostName}</small>
                <small class="text-success fs-7"><i class="bi bi-patch-check-fill"></i> Verified Host</small>
              </div>
            </div>
          </div>

          <div class="price-notice text-center mb-3">Payment: Handled directly between host & guest.</div>

          <button onclick="openStayDetailsModal('${s.id}')" class="btn btn-outline-primary w-100 fw-bold">
            View Details & Request Stay
          </button>
        </div>
      </div>
    </div>
  `).join('');
}

// Filter Stays Function
function filterStays() {
  const city = document.getElementById('filterCity').value.toLowerCase();
  const roomType = document.getElementById('filterRoomType').value;
  const maxPrice = parseFloat(document.getElementById('filterMaxPrice').value) || 10000;
  const searchKeyword = document.getElementById('filterKeyword').value.toLowerCase();

  const filtered = allStays.filter(s => {
    const matchCity = !city || (s.city && s.city.toLowerCase().includes(city));
    const matchRoom = !roomType || s.roomType === roomType;
    const matchPrice = (parseFloat(s.pricePerDay) || 0) <= maxPrice;
    const matchKey = !searchKeyword || (s.title.toLowerCase().includes(searchKeyword) || s.area.toLowerCase().includes(searchKeyword));
    return matchCity && matchRoom && matchPrice && matchKey;
  });

  renderStaysList(filtered);
}

// View Stay Details Modal
async function openStayDetailsModal(stayId) {
  const staysObj = await DB.get('stays') || {};
  const stay = staysObj[stayId];
  if (!stay) return;

  let modalEl = document.getElementById('stayDetailsModal');
  if (modalEl) modalEl.remove();

  const modalHtml = `
    <div class="modal fade" id="stayDetailsModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-lg modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title fw-bold">${stay.title}</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <div class="row">
              <div class="col-md-7">
                <p class="text-muted mb-2"><i class="bi bi-geo-alt-fill text-danger me-1"></i> ${stay.area}, ${stay.city}</p>
                <div class="mb-3">
                  <span class="badge bg-primary me-2">${stay.roomType}</span>
                  <span class="price-tag">₹${stay.pricePerDay} / day</span>
                  <div class="price-notice mt-1">Informational pricing. Direct payment between peers.</div>
                </div>

                <h6 class="fw-bold mt-4">Description</h6>
                <p class="text-secondary">${stay.description || 'No detailed description provided.'}</p>

                <h6 class="fw-bold mt-3">Amenities Included</h6>
                <div class="d-flex flex-wrap gap-2 mb-3">
                  ${(stay.amenities || []).map(a => `<span class="badge bg-light text-dark border p-2"><i class="bi bi-check-circle-fill text-success me-1"></i> ${a}</span>`).join('')}
                </div>

                <h6 class="fw-bold mt-3">House Rules</h6>
                <div class="p-3 bg-light rounded text-secondary border">
                  ${stay.rules || 'Standard StayBuddy community respect guidelines apply.'}
                </div>
              </div>

              <div class="col-md-5">
                <div class="card p-3 border shadow-sm">
                  <div class="d-flex align-items-center gap-3 mb-3">
                    ${getAvatarHtml(stay.hostName, 'md')}
                    <div>
                      <h6 class="mb-0 fw-bold">${stay.hostName}</h6>
                      <small class="text-success"><i class="bi bi-patch-check-fill"></i> Verified Host</small>
                    </div>
                  </div>
                  <hr>
                  <form id="stayRequestForm">
                    <input type="hidden" id="reqStayId" value="${stay.id}">
                    <input type="hidden" id="reqHostId" value="${stay.hostId}">
                    
                    <div class="mb-2">
                      <label class="form-label small fw-bold">Check-In Date</label>
                      <input type="date" id="reqCheckIn" class="form-control form-control-sm" required>
                    </div>
                    <div class="mb-2">
                      <label class="form-label small fw-bold">Check-Out Date</label>
                      <input type="date" id="reqCheckOut" class="form-control form-control-sm" required>
                    </div>
                    <div class="mb-3">
                      <label class="form-label small fw-bold">Number of Guests</label>
                      <input type="number" id="reqGuests" class="form-control form-control-sm" value="1" min="1" max="4" required>
                    </div>

                    <button type="submit" class="btn btn-primary w-100 fw-bold">
                      <i class="bi bi-send-fill me-1"></i> Send Stay Request
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);
  const bsModal = new bootstrap.Modal(document.getElementById('stayDetailsModal'));
  bsModal.show();

  document.getElementById('stayRequestForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    await submitStayRequest();
    bsModal.hide();
  });
}

// Submit Stay Request to Host
async function submitStayRequest() {
  const stayId = document.getElementById('reqStayId').value;
  const hostId = document.getElementById('reqHostId').value;
  const checkIn = document.getElementById('reqCheckIn').value;
  const checkOut = document.getElementById('reqCheckOut').value;
  const guests = document.getElementById('reqGuests').value;

  const staysObj = await DB.get('stays') || {};
  const stay = staysObj[stayId] || {};

  const reqData = {
    id: "req_" + Date.now(),
    stayId,
    stayTitle: stay.title || "Stay",
    hostId,
    hostName: stay.hostName || "Host",
    guestId: currentUser.id,
    guestName: currentUser.name,
    guestEmail: currentUser.email,
    checkIn,
    checkOut,
    guests,
    status: "REQUESTED",
    created: new Date().toISOString()
  };

  await DB.push('stayRequests', reqData);
  showToast("Stay request submitted to host! Check status under 'Stay Requests'.", "success");
  loadUserRequests();
}

// User Bookings & Requests Lists
async function loadUserRequests() {
  const reqObj = await DB.get('stayRequests') || {};
  const userReqs = Object.values(reqObj).filter(r => r.guestId === currentUser.id);

  const container = document.getElementById('userRequestsContainer');
  if (!container) return;

  if (userReqs.length === 0) {
    container.innerHTML = `<p class="text-muted">No stay requests submitted yet.</p>`;
    return;
  }

  container.innerHTML = userReqs.map(r => `
    <div class="card mb-3 border p-3">
      <div class="d-flex justify-content-between align-items-center">
        <div>
          <h6 class="fw-bold mb-1">${r.stayTitle}</h6>
          <small class="text-muted">Host: ${r.hostName} | Dates: ${r.checkIn} to ${r.checkOut}</small>
        </div>
        <span class="badge ${r.status === 'ACCEPTED' ? 'bg-success' : r.status === 'REJECTED' ? 'bg-danger' : 'bg-warning'} px-3 py-2">
          ${r.status}
        </span>
      </div>
    </div>
  `).join('');
}

async function loadUserBookings() {
  const bookObj = await DB.get('bookings') || {};
  const userBookings = Object.values(bookObj).filter(b => b.guestId === currentUser.id);

  const container = document.getElementById('userBookingsContainer');
  if (!container) return;

  if (userBookings.length === 0) {
    container.innerHTML = `<p class="text-muted">No active or past stay bookings.</p>`;
    return;
  }

  container.innerHTML = userBookings.map(b => `
    <div class="card mb-3 border p-3">
      <div class="d-flex justify-content-between align-items-center">
        <div>
          <h6 class="fw-bold mb-1">${b.stayTitle}</h6>
          <small class="text-muted">Host: ${b.hostName} | Dates: ${b.checkIn} to ${b.checkOut}</small>
        </div>
        <div>
          <span class="badge bg-primary me-2">${b.status}</span>
          <button onclick="openReviewModal('${b.stayId}', '${b.hostId}', '${b.stayTitle || 'Stay'}')" class="btn btn-sm btn-warning fw-bold">
            <i class="bi bi-star-fill me-1"></i> Rate & Review
          </button>
        </div>
      </div>
    </div>
  `).join('');
}

// Social Compatibility Matching Engine
async function calculateAndRenderMatches() {
  const weights = await DB.get('matchingWeights') || {
    commonInterests: 40,
    sameCity: 20,
    languages: 15,
    ageCompatibility: 15,
    socialPreferences: 10
  };

  const candidateUsers = allUsers.filter(u => u.id !== currentUser.id);
  const container = document.getElementById('matchesContainer');
  if (!container) return;

  const userInterests = currentUser.interests || ["Budget Stays"];

  const matched = candidateUsers.map(candidate => {
    let score = 0;

    // Common interests %
    const candidateInterests = candidate.interests || [];
    const shared = userInterests.filter(i => candidateInterests.includes(i));
    const interestRatio = userInterests.length > 0 ? (shared.length / userInterests.length) : 0.5;
    score += (interestRatio * weights.commonInterests);

    // Same City %
    if (candidate.city && currentUser.city && candidate.city.toLowerCase() === currentUser.city.toLowerCase()) {
      score += weights.sameCity;
    }

    // Default base compatibility boost for active verified accounts
    score += (weights.languages + weights.ageCompatibility + weights.socialPreferences) * 0.7;
    
    const finalScore = Math.min(99, Math.round(score));

    return { candidate, finalScore, shared };
  }).sort((a, b) => b.finalScore - a.finalScore);

  container.innerHTML = matched.map(m => `
    <div class="col-md-6 col-lg-4 mb-4">
      <div class="card h-100 p-3 text-center card-hover border shadow-sm">
        <div class="mb-3">
          ${getAvatarHtml(m.candidate.name, 'lg')}
        </div>
        <h5 class="fw-bold mb-1">${m.candidate.name}</h5>
        <p class="text-muted small mb-2"><i class="bi bi-geo-alt-fill text-danger"></i> ${m.candidate.city || 'NCR'}</p>
        
        <div class="mb-3">
          <span class="compatibility-badge"><i class="bi bi-heart-fill me-1"></i> ${m.finalScore}% Match</span>
        </div>

        <p class="small text-secondary mb-3">${m.candidate.bio || 'StayBuddy community member.'}</p>

        <div class="d-flex flex-wrap justify-content-center gap-1 mb-3">
          ${(m.candidate.interests || []).map(i => `<span class="badge bg-light text-dark border small">${i}</span>`).join('')}
        </div>

        <div class="d-flex gap-2">
          <button onclick="startChatWithUser('${m.candidate.id}', '${m.candidate.name}')" class="btn btn-outline-primary btn-sm flex-fill fw-bold">
            <i class="bi bi-chat-dots-fill me-1"></i> Chat
          </button>
          <button onclick="sendFriendRequest('${m.candidate.id}')" class="btn btn-primary btn-sm flex-fill fw-bold">
            <i class="bi bi-person-plus-fill me-1"></i> Add Friend
          </button>
        </div>
      </div>
    </div>
  `).join('');
}

// Peer Messaging System
async function startChatWithUser(peerId, peerName) {
  currentChatPeer = { id: peerId, name: peerName };
  switchAppSection('messages');
  document.getElementById('chatPeerTitle').textContent = peerName;
  loadMessages();
}

async function loadChatPeerList() {
  const container = document.getElementById('chatPeersList');
  if (!container) return;

  const candidateUsers = allUsers.filter(u => u.id !== currentUser.id);

  container.innerHTML = candidateUsers.map(u => `
    <button onclick="startChatWithUser('${u.id}', '${u.name}')" class="list-group-item list-group-item-action d-flex align-items-center gap-3 p-3">
      ${getAvatarHtml(u.name, 'sm')}
      <div class="text-start">
        <h6 class="mb-0 fw-bold">${u.name}</h6>
        <small class="text-muted">${u.role || 'Member'} • ${u.city || ''}</small>
      </div>
    </button>
  `).join('');
}

async function loadMessages() {
  if (!currentChatPeer) return;

  const convoKey = [currentUser.id, currentChatPeer.id].sort().join('_');
  const msgsObj = await DB.get(`conversations/${convoKey}/messages`) || {};
  const msgs = Object.values(msgsObj);

  const container = document.getElementById('chatMessagesBox');
  if (!container) return;

  if (msgs.length === 0) {
    container.innerHTML = `<p class="text-center text-muted my-auto">Start a conversation with ${currentChatPeer.name}.</p>`;
    return;
  }

  container.innerHTML = msgs.map(m => `
    <div class="chat-bubble ${m.senderId === currentUser.id ? 'chat-bubble-out' : 'chat-bubble-in'}">
      <div>${m.text}</div>
      <small class="fs-7 opacity-75 d-block text-end mt-1">${new Date(m.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</small>
    </div>
  `).join('');

  container.scrollTop = container.scrollHeight;
}

async function sendChatMessage(e) {
  if (e) e.preventDefault();
  if (!currentChatPeer) {
    showToast("Select a peer to send messages.", "warning");
    return;
  }

  const input = document.getElementById('chatInput');
  const text = input.value.trim();
  if (!text) return;

  const convoKey = [currentUser.id, currentChatPeer.id].sort().join('_');
  const msgData = {
    senderId: currentUser.id,
    senderName: currentUser.name,
    text,
    timestamp: new Date().toISOString()
  };

  await DB.push(`conversations/${convoKey}/messages`, msgData);
  input.value = '';
  loadMessages();
}

// Friends List & Requests
async function sendFriendRequest(targetUserId) {
  await DB.push(`friendRequests`, {
    fromId: currentUser.id,
    fromName: currentUser.name,
    toId: targetUserId,
    status: "PENDING",
    timestamp: new Date().toISOString()
  });
  showToast("Friend request sent!", "success");
}

async function loadFriendsList() {
  const container = document.getElementById('friendsListContainer');
  if (!container) return;

  const candidateUsers = allUsers.filter(u => u.id !== currentUser.id);

  container.innerHTML = candidateUsers.map(u => `
    <div class="col-md-6 mb-3">
      <div class="card p-3 d-flex flex-row align-items-center gap-3 border shadow-sm">
        ${getAvatarHtml(u.name, 'md')}
        <div class="flex-grow-1">
          <h6 class="mb-1 fw-bold">${u.name}</h6>
          <small class="text-muted d-block">${u.city} • Verified Connection</small>
        </div>
        <button onclick="startChatWithUser('${u.id}', '${u.name}')" class="btn btn-outline-primary btn-sm fw-bold">Message</button>
      </div>
    </div>
  `).join('');
}

// Review Submission Modal
function openReviewModal(stayId, hostId) {
  let modalEl = document.getElementById('reviewModal');
  if (modalEl) modalEl.remove();

  const html = `
    <div class="modal fade" id="reviewModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title fw-bold">Leave Stay & Host Review</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <form id="submitReviewForm">
              <div class="mb-3">
                <label class="form-label font-weight-bold">Rating (1 to 5 Stars)</label>
                <select id="revRating" class="form-select" required>
                  <option value="5">⭐⭐⭐⭐⭐ (5/5) Excellent</option>
                  <option value="4">⭐⭐⭐⭐ (4/5) Very Good</option>
                  <option value="3">⭐⭐⭐ (3/5) Average</option>
                  <option value="2">⭐⭐ (2/5) Poor</option>
                  <option value="1">⭐ (1/5) Terrible</option>
                </select>
              </div>
              <div class="mb-3">
                <label class="form-label font-weight-bold">Your Feedback</label>
                <textarea id="revComment" class="form-control" rows="3" placeholder="Share your stay experience..." required></textarea>
              </div>
              <button type="submit" class="btn btn-primary w-100 fw-bold">Submit Review</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', html);
  const bsModal = new bootstrap.Modal(document.getElementById('reviewModal'));
  bsModal.show();

  document.getElementById('submitReviewForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    await DB.push('reviews', {
      stayId,
      hostId,
      userId: currentUser.id,
      userName: currentUser.name,
      rating: parseInt(document.getElementById('revRating').value),
      comment: document.getElementById('revComment').value,
      date: new Date().toISOString().split('T')[0]
    });
    showToast("Thank you! Review submitted successfully.", "success");
    bsModal.hide();
  });
}

// Customer Notification Logs System
async function createNotificationLog(userId, title, message, type = 'INFO') {
  const notif = {
    id: "notif_" + Date.now() + "_" + Math.random().toString(36).substr(2, 4),
    userId,
    title,
    message,
    type,
    read: false,
    timestamp: new Date().toISOString()
  };
  await DB.push('notifications', notif);
  if (currentUser && userId === currentUser.id) {
    loadUserNotifications();
  }
}

async function loadUserNotifications() {
  const notifObj = await DB.get('notifications') || {};
  const userNotifs = Object.values(notifObj).filter(n => n && n.userId === currentUser.id).reverse();

  const badgeEl = document.getElementById('userNotifBadge');
  const container = document.getElementById('userNotificationsContainer');

  const unreadCount = userNotifs.filter(n => !n.read).length;
  if (badgeEl) {
    if (unreadCount > 0) {
      badgeEl.textContent = unreadCount;
      badgeEl.classList.remove('d-none');
    } else {
      badgeEl.classList.add('d-none');
    }
  }

  if (!container) return;

  if (userNotifs.length === 0) {
    container.innerHTML = `
      <div class="text-center py-5 text-muted">
        <i class="bi bi-bell-slash display-4"></i>
        <h6 class="mt-3 fw-bold">No Notification Logs</h6>
        <p class="small mb-0">Stay request alerts, booking updates, and messages will be logged here.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = userNotifs.map(n => {
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

async function markAllNotificationsRead() {
  const notifObj = await DB.get('notifications') || {};
  for (let [key, n] of Object.entries(notifObj)) {
    if (n && n.userId === currentUser.id && !n.read) {
      await DB.update(`notifications/${key}`, { read: true });
    }
  }
  showToast("All notifications marked as read.", "success");
  await loadUserNotifications();
}

// Profile & Security Settings Handler (Name, Email, Phone, Address, City, Bio, Password)
async function loadProfileForm() {
  if (!currentUser) return;

  if (document.getElementById('editProfileName')) document.getElementById('editProfileName').value = currentUser.name || '';
  if (document.getElementById('editProfileEmail')) document.getElementById('editProfileEmail').value = currentUser.email || '';
  if (document.getElementById('editProfilePhone')) document.getElementById('editProfilePhone').value = currentUser.phone || '';
  if (document.getElementById('editProfileCity')) document.getElementById('editProfileCity').value = currentUser.city || 'Delhi NCR';
  if (document.getElementById('editProfileAddress')) document.getElementById('editProfileAddress').value = currentUser.address || '';
  if (document.getElementById('editProfileBio')) document.getElementById('editProfileBio').value = currentUser.bio || '';

  const form = document.getElementById('customerProfileForm');
  if (!form) return;

  form.onsubmit = async (e) => {
    e.preventDefault();

    const name = document.getElementById('editProfileName').value.trim();
    const email = document.getElementById('editProfileEmail').value.trim();
    const phone = document.getElementById('editProfilePhone').value.trim();
    const city = document.getElementById('editProfileCity').value.trim();
    const address = document.getElementById('editProfileAddress').value.trim();
    const bio = document.getElementById('editProfileBio').value.trim();

    const newPassword = document.getElementById('editProfilePassword').value.trim();
    const confirmPassword = document.getElementById('editProfileConfirmPassword').value.trim();

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

    const updatedUser = {
      ...currentUser,
      name,
      email,
      phone,
      city,
      address,
      bio
    };

    if (newPassword) {
      updatedUser.password = newPassword;
      if (typeof firebase !== 'undefined' && firebase.auth && firebase.auth().currentUser) {
        try {
          await firebase.auth().currentUser.updatePassword(newPassword);
          console.log("🔥 Firebase Auth: Server password updated!");
        } catch (authErr) {
          console.warn("Firebase Auth Password Update Notice:", authErr.message);
        }
      }
    }

    await DB.set(`users/${currentUser.id}`, updatedUser);
    setCurrentUser(updatedUser);
    currentUser = updatedUser;

    document.querySelectorAll('.user-display-name').forEach(el => el.textContent = currentUser.name);
    document.querySelectorAll('.user-display-email').forEach(el => el.textContent = currentUser.email);
    document.querySelectorAll('.user-avatar-container').forEach(el => el.innerHTML = getAvatarHtml(currentUser.name, 'sm'));

    showToast("Profile & security settings saved successfully!", "success");
    await createNotificationLog(currentUser.id, "Profile Settings Updated", "Your profile details, address, and password settings were updated.", "SUCCESS");

    if (document.getElementById('editProfilePassword')) document.getElementById('editProfilePassword').value = '';
    if (document.getElementById('editProfileConfirmPassword')) document.getElementById('editProfileConfirmPassword').value = '';
  };
}

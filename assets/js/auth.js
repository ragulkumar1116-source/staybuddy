/**
  StayBuddy - Firebase Authentication & User Access Controller
  Integrates Firebase Auth (firebase.auth()) directly with Firebase Realtime Database (/users)
*/

document.addEventListener("DOMContentLoaded", () => {
  const registerForm = document.getElementById("registerForm");
  const loginForm = document.getElementById("loginForm");
  const forgotForm = document.getElementById("forgotForm");

  // Handle User Registration
  if (registerForm) {
    registerForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = document.getElementById("regName").value.trim();
      const email = document.getElementById("regEmail").value.trim();
      const password = document.getElementById("regPassword").value.trim();
      const role = document.getElementById("regRole").value; // USER, HOST, or MASTER_ADMIN
      const city = document.getElementById("regCity").value.trim() || "Delhi NCR";
      const bio = document.getElementById("regBio").value.trim() || "Excited to join StayBuddy!";

      if (!name || !email || !password) {
        showToast("Please fill all required fields.", "warning");
        return;
      }

      if (password.length < 6) {
        showToast("Password must be at least 6 characters long.", "warning");
        return;
      }

      // Check feature flag for registration
      const regEnabled = await DB.get(`featureFlags/${role === 'HOST' ? 'hostRegistration' : 'userRegistration'}`);
      if (regEnabled === false) {
        showToast(`Registration for ${role} is currently paused by Master Admin.`, "error");
        return;
      }

      let userUid = "usr_" + Date.now();

      // 1. Create User in Firebase Authentication Server (showing in Firebase Console ➔ Authentication ➔ Users tab)
      if (typeof firebase !== 'undefined' && firebase.auth) {
        try {
          const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
          if (userCredential && userCredential.user) {
            userUid = userCredential.user.uid;
            console.log("🔥 Firebase Auth Success: Registered in Firebase Console Authentication Users tab! UID:", userUid);
          }
        } catch (authErr) {
          console.warn("Firebase Auth Register Notice:", authErr.code, authErr.message);
          if (authErr.code === 'auth/email-already-in-use') {
            showToast("An account with this email already exists in Firebase Authentication.", "danger");
            return;
          } else if (authErr.code === 'auth/operation-not-allowed') {
            showToast("Please enable Email/Password provider in Firebase Console ➔ Authentication ➔ Sign-in method tab.", "warning");
          }
        }
      }

      // 2. Check if user already exists in Realtime Database
      const users = await DB.get("users") || {};
      const existing = Object.values(users).filter(Boolean).find(u => u && u.email && u.email.toLowerCase() === email.toLowerCase());
      if (existing && existing.id !== userUid) {
        showToast("An account with this email already exists.", "danger");
        return;
      }

      const newUser = {
        id: userUid,
        name,
        email,
        password, // stored for credentials lookup
        role,
        verified: true, // auto-verified for quick peer demo access
        status: "ACTIVE",
        city,
        bio,
        interests: ["Budget Stays", "Travel", "Networking"],
        joined: new Date().toISOString().split('T')[0]
      };

      // 3. Save User Profile to Firebase Realtime Database (/users/{userId})
      await DB.set(`users/${newUser.id}`, newUser);
      setCurrentUser(newUser);

      showToast(`Welcome to StayBuddy, ${name}! Account created in Firebase Auth as ${role}.`, "success");

      setTimeout(() => {
        if (role === "MASTER_ADMIN" || role === "ADMIN") {
          window.location.href = "admin.html";
        } else if (role === "HOST") {
          window.location.href = "host.html";
        } else {
          window.location.href = "app.html";
        }
      }, 1000);
    });
  }

  // Handle User Login
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = document.getElementById("loginEmail").value.trim();
      const password = document.getElementById("loginPassword").value.trim();

      if (!email || !password) {
        showToast("Please enter email and password.", "warning");
        return;
      }

      let authenticatedUid = null;

      // 1. Authenticate with Firebase Authentication Server
      if (typeof firebase !== 'undefined' && firebase.auth) {
        try {
          const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
          if (userCredential && userCredential.user) {
            authenticatedUid = userCredential.user.uid;
            console.log("🔥 Firebase Auth Success: Signed in on Firebase Authentication Server! UID:", authenticatedUid);
          }
        } catch (authErr) {
          console.warn("Firebase Auth Login Notice:", authErr.code, authErr.message);
        }
      }

      // 2. Fetch User Record from Realtime Database
      const users = await DB.get("users") || {};
      let user = null;
      
      if (authenticatedUid && users[authenticatedUid]) {
        user = users[authenticatedUid];
      } else {
        user = Object.values(users).filter(Boolean).find(u => u && u.email && u.email.toLowerCase() === email.toLowerCase());
      }

      if (!user) {
        showToast("No account found with this email.", "danger");
        return;
      }

      // 3. Verify Password
      if (user.password && user.password !== password) {
        showToast("Incorrect password. Please try again.", "danger");
        return;
      }

      if (user.status === "BANNED" || user.status === "SUSPENDED") {
        showToast(`Your account has been ${user.status.toLowerCase()} by Master Admin. Contact support.`, "error");
        return;
      }

      setCurrentUser(user);
      showToast(`Signed in successfully as ${user.role}!`, "success");

      setTimeout(() => {
        if (user.role === "MASTER_ADMIN" || user.role === "ADMIN") {
          window.location.href = "admin.html";
        } else if (user.role === "HOST") {
          window.location.href = "host.html";
        } else {
          window.location.href = "app.html";
        }
      }, 800);
    });
  }

  // Handle Forgot Password
  if (forgotForm) {
    forgotForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = document.getElementById("forgotEmail").value.trim();

      if (typeof firebase !== 'undefined' && firebase.auth) {
        try {
          await firebase.auth().sendPasswordResetEmail(email);
          showToast(`Password reset link sent to ${email} via Firebase Auth!`, "success");
        } catch (authErr) {
          showToast(`Password reset requested for ${email}.`, "info");
        }
      } else {
        showToast(`Password reset link sent to ${email} (if registered).`, "info");
      }
      document.getElementById("forgotSuccessMsg").classList.remove("d-none");
    });
  }
});

/**
  StayBuddy - Direct Firebase Realtime Database Engine
  Direct Cloud Sync for all User Data, Registrations, Stays & Settings
*/

// Retrieve custom saved Firebase configuration or default active project config
function getFirebaseConfig() {
  try {
    const saved = localStorage.getItem('STAYBUDDY_FIREBASE_CONFIG');
    if (saved) return JSON.parse(saved);
  } catch (e) {}

  return {
    apiKey: "AIzaSyAG6SUjgU8Fw444Hp4cm99-Tgv_snPzjeg",
    authDomain: "hotel-city-park.firebaseapp.com",
    databaseURL: "https://hotel-city-park-default-rtdb.firebaseio.com",
    projectId: "hotel-city-park",
    storageBucket: "hotel-city-park.firebasestorage.app",
    messagingSenderId: "229533997685",
    appId: "1:229533997685:web:be1d34c42f72e40616b63c",
    measurementId: "G-8KQMDT535G"
  };
}

let db = null;
let auth = null;
let isFirebaseConnected = false;

function initFirebaseBackend() {
  const config = getFirebaseConfig();
  try {
    if (typeof firebase !== 'undefined') {
      if (!firebase.apps.length) {
        firebase.initializeApp(config);
      }
      db = firebase.database();
      auth = firebase.auth();
      
      // Monitor Realtime Server Connection
      db.ref('.info/connected').on('value', (snap) => {
        if (snap.val() === true) {
          isFirebaseConnected = true;
          console.log("🔥 Firebase Realtime Database: CONNECTED TO CLOUD SERVER!");
        } else {
          isFirebaseConnected = false;
          console.warn("⚠️ Firebase Realtime Database: Connecting to server...");
        }
      });
    }
  } catch (e) {
    console.error("Firebase Backend Init Error:", e);
    isFirebaseConnected = false;
  }
}

initFirebaseBackend();

// Function for Master Admin to update Firebase project keys anytime
function saveFirebaseProjectConfig(newConfig) {
  localStorage.setItem('STAYBUDDY_FIREBASE_CONFIG', JSON.stringify(newConfig));
  if (typeof firebase !== 'undefined' && firebase.apps.length) {
    try {
      firebase.app().delete().then(() => {
        firebase.initializeApp(newConfig);
        db = firebase.database();
        auth = firebase.auth();
      });
    } catch (e) {
      location.reload();
    }
  }
}

// In-Memory & LocalStorage Backup Store
class LocalDatabaseStore {
  constructor() {
    this.storageKey = "STAYBUDDY_LOCAL_DB";
    if (!localStorage.getItem(this.storageKey)) {
      this.resetToDefaults();
    }
  }

  getData() {
    try {
      return JSON.parse(localStorage.getItem(this.storageKey)) || {};
    } catch (e) {
      return {};
    }
  }

  setData(data) {
    localStorage.setItem(this.storageKey, JSON.stringify(data));
  }

  get(path) {
    const data = this.getData();
    const parts = path.split('/').filter(Boolean);
    let curr = data;
    for (let part of parts) {
      if (curr && curr[part] !== undefined) {
        curr = curr[part];
      } else {
        return null;
      }
    }
    return curr;
  }

  set(path, val) {
    const data = this.getData();
    const parts = path.split('/').filter(Boolean);
    let curr = data;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!curr[parts[i]]) curr[parts[i]] = {};
      curr = curr[parts[i]];
    }
    curr[parts[parts.length - 1]] = val;
    this.setData(data);
  }

  push(path, val) {
    const key = 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
    val.id = key;
    this.set(`${path}/${key}`, val);
    return key;
  }

  resetToDefaults() {
    const defaultDB = {
      settings: {
        site: {
          name: "StayBuddy",
          tagline: "Affordable Stays. Trusted People. Better Connections.",
          description: "Verified budget stay & social connection platform for students and working professionals.",
          contactEmail: "support@staybuddy.com",
          contactPhone: "+91 98765 43210",
          contactAddress: "Tech Hub, Sector 62, Noida, NCR, India",
          footerText: "StayBuddy - Connecting trusted peers for budget stays across top cities.",
          copyright: "© 2026 StayBuddy Technologies Inc. All Rights Reserved."
        },
        branding: {
          logoUrl: "",
          bannerUrl: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1600&q=80",
          aboutImageUrl: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1200&q=80",
          safetyImageUrl: "https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?auto=format&fit=crop&w=1200&q=80"
        },
        theme: {
          primaryColor: "#0d6efd",
          secondaryColor: "#212529",
          accentColor: "#20c997",
          bgColor: "#f8f9fa",
          textColor: "#212529",
          borderRadius: "12px",
          fontFamily: "'Outfit', sans-serif"
        }
      },
      featureFlags: {
        userRegistration: true,
        hostRegistration: true,
        stayRequests: true,
        chat: true,
        friends: true,
        matching: true,
        reviews: true,
        reports: true,
        sos: true,
        maintenanceMode: false
      },
      menuVisibility: {
        home: true,
        findStay: true,
        friends: true,
        matching: true,
        becomeHost: true,
        safety: true,
        about: true,
        contact: true
      },
      matchingWeights: {
        commonInterests: 40,
        sameCity: 20,
        languages: 15,
        ageCompatibility: 15,
        socialPreferences: 10
      },
      content: {
        home: {
          title: "Find Budget Stays with Verified Peers",
          subtitle: "Connect with friendly hosts, share spaces safely, and save money while building authentic social connections.",
          bannerUrl: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1600&q=80",
          button1Text: "Find a Stay",
          button1Link: "app.html#findStay",
          button2Text: "Become a Host",
          button2Link: "host.html",
          feature1Title: "Verified Profiles",
          feature1Desc: "Peer-to-peer verification and community trust badges ensure maximum safety.",
          feature2Title: "Affordable Daily Rates",
          feature2Desc: "Informational pricing starting at ₹250/day directly settled between guest and host.",
          feature3Title: "Social Matching",
          feature3Desc: "Find room hosts or guests who share your hobbies, languages, and lifestyle."
        },
        about: {
          title: "About StayBuddy",
          subtitle: "Empowering students and young professionals with trusted budget accommodation.",
          description: "StayBuddy was founded to eliminate exorbitant rent deposits and isolated stay experiences. We empower verified students and professionals to share spaces, cut living costs, and build meaningful friendships."
        },
        safety: {
          title: "Safety & Community Trust",
          subtitle: "Your safety is our absolute top priority.",
          rules: "1. Always verify peer identity before check-in.\n2. Keep all platform communications inside StayBuddy chat.\n3. Utilize our 1-Tap SOS Emergency button during urgent situations."
        },
        legal: {
          terms: "By accessing StayBuddy, you agree to treat hosts and guests with mutual respect. Commercial listings are strictly prohibited.",
          privacy: "Your personal data is encrypted and never sold to third parties.",
          guidelines: "No harassment, illegal activities, or unsafe listing conditions.",
          safetyPolicy: "StayBuddy provides 24/7 SOS alert routing to emergency contacts and platform admins.",
          cancellationPolicy: "Direct agreement between host and guest. We recommend informing host 24 hours prior.",
          disclaimer: "StayBuddy is a peer platform. Stay pricing is informational only and settled directly between peers."
        }
      },
      users: {},
      hosts: {},
      stays: {},
      availability: {},
      stayRequests: {},
      bookings: {},
      conversations: {},
      messages: {},
      friendRequests: {},
      matches: {},
      reviews: {},
      reports: {},
      blocks: {},
      notifications: {},
      sosAlerts: {},
      cities: {
        "bengaluru": "Bengaluru",
        "ncr": "Delhi NCR",
        "mumbai": "Mumbai",
        "pune": "Pune",
        "hyderabad": "Hyderabad"
      },
      areas: {
        "indiranagar": "Indiranagar",
        "hsr": "HSR Layout",
        "koramangala": "Koramangala",
        "sector62": "Sector 62, Noida"
      },
      adminLogs: []
    };

    this.setData(defaultDB);
  }
}

const localDB = new LocalDatabaseStore();

// Universal Realtime Database Direct Helper
const DB = {
  async get(path) {
    if (db) {
      try {
        const snapshot = await db.ref(path).once('value');
        if (snapshot.exists()) {
          const val = snapshot.val();
          localDB.set(path, val);
          return val;
        }
      } catch (e) {
        console.warn(`Firebase DB Read Warning at /${path}:`, e.message);
      }
    }
    return localDB.get(path);
  },

  async set(path, val) {
    localDB.set(path, val);
    if (db) {
      try {
        await db.ref(path).set(val);
        console.log(`🔥 Firebase Server DB Set Success: /${path}`);
      } catch (e) {
        console.error(`Firebase DB Set Error at /${path}:`, e.message);
      }
    }
  },

  async push(path, val) {
    let key = localDB.push(path, val);
    if (db) {
      try {
        const newRef = db.ref(`${path}/${key}`);
        await newRef.set(val);
        console.log(`🔥 Firebase Server DB Push Success: /${path}/${key}`);
      } catch (e) {
        console.error(`Firebase DB Push Error at /${path}:`, e.message);
      }
    }
    return key;
  },

  async update(path, val) {
    const curr = (await this.get(path)) || {};
    Object.assign(curr, val);
    localDB.set(path, curr);
    if (db) {
      try {
        await db.ref(path).update(val);
        console.log(`🔥 Firebase Server DB Update Success: /${path}`);
      } catch (e) {
        console.error(`Firebase DB Update Error at /${path}:`, e.message);
      }
    }
  }
};

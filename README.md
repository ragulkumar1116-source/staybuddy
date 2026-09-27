# StayBuddy

> **Affordable Stays. Trusted People. Better Connections.**

StayBuddy is a verified peer-to-peer budget stay and social connection platform built for college students and working professionals. It combines temporary budget stay listings with host management, direct peer-to-peer stay requests, compatibility matching, real-time messaging, safety reporting, and an emergency SOS system.

---

## 🌟 Key Features

1. **Public Marketing Portal (`index.html`)**: Fully dynamic content-driven website featuring Home, About, How It Works, Safety, Find Stay, Become Host, Friends, Matching, FAQ, and Contact.
2. **Single-Page App Architecture (`app.html`)**: Complete User SPA featuring stay discovery, filters, instant requests, direct messaging, social compatibility matching, ratings/reviews, and SOS alert system.
3. **Host Management SPA (`host.html`)**: Host dashboard to create listings, set room types, amenities, rules, process incoming stay requests, and view current guest logs.
4. **Master Admin Panel (`admin.html`)**: Centralized CMS & Design System Editor enabling instant customization of colors, typography, image URLs, page content, feature flags, menu visibilities, moderation, and logs without code edits.
5. **Zero Photo Uploads & Zero Payment Gateways**: Uses gradient initial-based avatars, icons, and Master-Admin managed image URLs. Payment is handled directly between guest and host; stay prices are purely informational.
6. **Role-Based Security**: Complete role enforcement (`USER`, `HOST`, `ADMIN`, `MASTER_ADMIN`) via Firebase Realtime Database Security Rules.

---

## 📁 File Structure (22 Files Total)

```text
staybuddy/
│
├── index.html              # Public website
├── auth.html               # Auth portal (Login, Register, Forgot Password)
├── app.html                # User SPA
├── host.html               # Host SPA
├── admin.html              # Master Admin Panel SPA
├── legal.html              # Dynamic legal documents
│
├── assets/
│   ├── css/
│   │   ├── style.css       # Platform design system & dynamic CSS vars
│   │   └── admin.css       # Master Admin styles
│   │
│   └── js/
│       ├── firebase.js     # Firebase config, state manager & seed data
│       ├── common.js       # Shared utilities, toast alerts & theme loader
│       ├── content.js      # Dynamic CMS page loader
│       ├── auth.js         # Auth state controller
│       ├── app.js          # User SPA router, search & match calculator
│       ├── host.js         # Host SPA router & stay listing manager
│       └── admin.js        # Master Admin CMS, Theme & Reset controller
│
├── functions/
│   ├── index.js            # Cloud Functions logic
│   └── package.json        # Cloud Functions dependencies
│
├── firebase.json           # Firebase Hosting config
├── database.rules.json     # Security rules
├── .firebaserc             # Firebase target
├── package.json            # Root dependencies
└── README.md               # Documentation
```

---

## 🚀 Getting Started

1. Open `assets/js/firebase.js` to insert your Firebase project API keys.
2. To run locally, serve the directory using any HTTP server:
   ```bash
   npx serve .
   ```
3. **Creating Accounts**:
   - Navigate to `auth.html` to register new accounts.
   - Roles available during registration: **Stay Guest (USER)**, **Host (HOST)**, and **Master Admin (MASTER_ADMIN)**.
   - Logging in with a `MASTER_ADMIN` role grants immediate access to `/admin.html`.

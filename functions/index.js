/**
 * StayBuddy - Firebase Cloud Functions
 * Optional backend logic for notifications, emergency alerts, and administrative cleanups.
 */

const functions = require("firebase-functions");
const admin = require("firebase-admin");

if (!admin.apps.length) {
  admin.initializeApp();
}

// Log security audit for Master Admin operations
exports.onAdminLogCreated = functions.database
  .ref("/adminLogs/{logId}")
  .onCreate((snapshot, context) => {
    const logData = snapshot.val();
    console.log(`[ADMIN AUDIT LOG ${context.params.logId}]`, logData);
    return null;
  });

// Handle SOS Emergency Alert notification dispatch
exports.onSosAlertCreated = functions.database
  .ref("/sosAlerts/{alertId}")
  .onCreate((snapshot, context) => {
    const alert = snapshot.val();
    console.log(`[CRITICAL SOS ALERT TRIPPED] User: ${alert.userId}, Status: ACTIVE`);
    return null;
  });

// Handles push notifications while the SmartTrack tab is in the background
// or closed. Firebase config values below are safe to expose client-side —
// they identify the project, they aren't secrets (the security boundary is
// server-side Firebase Auth/Security Rules, not hiding this file). A service
// worker can't read Vite env vars, so these are duplicated from .env here —
// keep them in sync if the Firebase project ever changes.
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyA6svw4R2dGwuQ04nxmTClaPxcb06ASGes',
  authDomain: 'smart-track-erp.firebaseapp.com',
  projectId: 'smart-track-erp',
  storageBucket: 'smart-track-erp.firebasestorage.app',
  messagingSenderId: '1005680546695',
  appId: '1:1005680546695:web:cfca66049da7ca53e63922',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification || {};
  self.registration.showNotification(title || 'SmartTrack', {
    body: body || '',
    icon: '/favicon.svg',
    data: payload.data,
  });
});

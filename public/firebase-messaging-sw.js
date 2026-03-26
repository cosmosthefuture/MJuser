importScripts(
  "https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js"
);
importScripts(
  "https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js"
);

firebase.initializeApp({
  apiKey: "AIzaSyBwqoaRRKZQFmC9SHS12P-btED_5aD8gFE",
  authDomain: "give-credit-development.firebaseapp.com",
  projectId: "give-credit-development",
  storageBucket: "give-credit-development.firebasestorage.app",
  messagingSenderId: "421812139254",
  appId: "1:421812139254:web:f952e34171a1efdad628d7",
  measurementId: "G-ZQ7F7P9W37",
});

const messaging = firebase.messaging();

// Background message handler
messaging.onBackgroundMessage((payload) => {
  console.log("Received background message: ", payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: "/firebase-logo.png",
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

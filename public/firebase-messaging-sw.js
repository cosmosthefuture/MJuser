// // Minimal service worker for Firebase Messaging token registration.
// // It intentionally avoids external imports to prevent network failures during registration.
// self.addEventListener("push", (event) => {
//   if (!event.data) return;
//   const payload = event.data.json();
//   const title = payload.notification?.title || "Notification";
//   const options = {
//     body: payload.notification?.body,
//     icon: payload.notification?.icon,
//     data: payload.data,
//   };
//   event.waitUntil(self.registration.showNotification(title, options));
// });
importScripts(
  "https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js",
);
importScripts(
  "https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js",
);

firebase.initializeApp({
  apiKey: "AIzaSyAw70nbhyIPjXdHqoNTtijo24UqcFGK4Z4",
  authDomain: "gameproject-1888a.firebaseapp.com",
  projectId: "gameproject-1888a",
  storageBucket: "gameproject-1888a.firebasestorage.app",
  messagingSenderId: "1082791119378",
  appId: "1:1082791119378:web:f24b1cc4f0d42766afe6cb",
  measurementId: "G-SY12EBQFEL",
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

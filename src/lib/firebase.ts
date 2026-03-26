import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import type { Messaging } from "firebase/messaging";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

let app: ReturnType<typeof initializeApp> | null = null;
let analytics: ReturnType<typeof getAnalytics> | null = null;
let messaging: Messaging | null = null;

// Initialize Firebase only on client side
if (typeof window !== "undefined") {
  app = initializeApp(firebaseConfig);
  try {
    analytics = getAnalytics(app);
  } catch {
    analytics = null;
  }
}

export { app, analytics, messaging };

async function getMessagingIfSupported(): Promise<Messaging | null> {
  if (typeof window === "undefined") return null;
  if (!app) return null;
  if (messaging) return messaging;

  const { isSupported, getMessaging } = await import("firebase/messaging");
  const supported = await isSupported();
  if (!supported) return null;

  messaging = getMessaging(app);
  return messaging;
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    console.log("FCM: Notifications not supported");
    return false;
  }

  if (Notification.permission === "granted") {
    console.log("FCM: Permission already granted");
    return true;
  }

  if (Notification.permission === "denied") {
    console.log("FCM: Permission denied");
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    console.log("FCM: Permission result:", permission);
    return permission === "granted";
  } catch (error) {
    console.error("FCM: Error requesting permission:", error);
    return false;
  }
}

export async function getFCMToken(): Promise<string | null> {
  const messagingInstance = await getMessagingIfSupported();
  if (!messagingInstance) return null;

  try {
    console.log("Attempting to get FCM token...");

    // Request permission first
    const hasPermission = await requestNotificationPermission();
    if (!hasPermission) {
      console.log("FCM: No notification permission");
      return null;
    }

    // Try without service worker registration first
    const { getToken } = await import("firebase/messaging");
    const token = await getToken(messagingInstance, {
      vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY || undefined,
    });
    console.log("FCM Token obtained:", token);
    return token;
  } catch (error) {
    console.error("Error getting FCM token:", error);

    // If it fails due to service worker, try with manual registration
    if (error instanceof Error && error.message.includes("service worker")) {
      console.log("FCM: Trying with manual service worker registration...");
      try {
        const registration = await registerServiceWorker();
        if (registration) {
          const { getToken } = await import("firebase/messaging");
          const token = await getToken(messagingInstance, {
            vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY || undefined,
            serviceWorkerRegistration: registration,
          });
          console.log("FCM Token obtained with manual registration:", token);
          return token;
        }
      } catch (swError) {
        console.error(
          "FCM: Manual service worker registration also failed:",
          swError
        );
      }
    }

    return null;
  }
}

async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    console.log("FCM: Service workers not supported");
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register(
      "/firebase-messaging-sw.js",
      {
        scope: "/",
      }
    );
    console.log("FCM: Service worker registered successfully");
    return registration;
  } catch (error) {
    console.error("FCM: Service worker registration failed:", error);
    return null;
  }
}

export function onMessageListener() {
  return new Promise(async (resolve) => {
    const messagingInstance = await getMessagingIfSupported();
    if (!messagingInstance) {
      resolve(null);
      return;
    }

    const { onMessage } = await import("firebase/messaging");
    onMessage(messagingInstance, (payload) => {
      resolve(payload);
    });
  });
}

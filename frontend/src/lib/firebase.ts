import { initializeApp } from 'firebase/app'
import { getMessaging, getToken, isSupported } from 'firebase/messaging'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string,
}

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY as string

let app: ReturnType<typeof initializeApp> | undefined

function getFirebaseApp() {
  if (!app) app = initializeApp(firebaseConfig)
  return app
}

/** A stable per-browser id, since a browser has no natural device identifier
 * the way a phone does — persisted so the same browser always upserts the
 * same fcm_tokens row (POST /auth/fcm-tokens is keyed on user_id+device_id)
 * instead of piling up a new row every login. */
function getWebDeviceId(): string {
  const key = 'smarttrack_web_device_id'
  let id = localStorage.getItem(key)
  if (!id) {
    id = `web-${crypto.randomUUID()}`
    localStorage.setItem(key, id)
  }
  return id
}

/**
 * Requests notification permission and returns this browser's FCM token, or
 * undefined if push isn't available/granted — never throws, since this runs
 * right after login and must never block or break sign-in.
 */
export async function requestFcmToken(): Promise<{ token: string; deviceId: string } | undefined> {
  try {
    if (!(await isSupported())) return undefined
    if (!firebaseConfig.apiKey || !VAPID_KEY) return undefined

    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return undefined

    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js')
    const messaging = getMessaging(getFirebaseApp())
    const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: registration })
    if (!token) return undefined

    return { token, deviceId: getWebDeviceId() }
  } catch (err) {
    console.error('Failed to get FCM token', err)
    return undefined
  }
}

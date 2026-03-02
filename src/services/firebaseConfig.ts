import { initializeApp, getApps, type FirebaseApp } from 'firebase/app'
import { initializeAuth, getAuth as getAuthDefault, type Auth } from 'firebase/auth'
import { getDatabase, type Database } from 'firebase/database'
import AsyncStorage from '@react-native-async-storage/async-storage'

// getReactNativePersistence is only in the RN-specific entry point types,
// but available at runtime via the react-native package.json condition
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { getReactNativePersistence } = require('firebase/auth')

const firebaseConfig = {
  apiKey: 'AIzaSyCRtaBl5rlqCA0j3tyh6O6S9vqFoTNajrY',
  authDomain: 'onegoshop.firebaseapp.com',
  databaseURL: 'https://onegoshop-default-rtdb.europe-west1.firebasedatabase.app',
  projectId: 'onegoshop',
  storageBucket: 'onegoshop.firebasestorage.app',
  messagingSenderId: '528311074416',
  appId: '1:528311074416:web:2f2f47239e8949278dfeb5',
  measurementId: 'G-BPZBNXD960',
}

let app: FirebaseApp | null = null
let auth: Auth | null = null
let db: Database | null = null

export function getFirebaseApp(): FirebaseApp {
  if (!app) {
    const existing = getApps()
    app = existing.length > 0 ? existing[0]! : initializeApp(firebaseConfig)
  }
  return app
}

export function getFirebaseAuth(): Auth {
  if (!auth) {
    try {
      // Use initializeAuth with AsyncStorage persistence so anonymous UID survives app restarts
      auth = initializeAuth(getFirebaseApp(), {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        persistence: getReactNativePersistence(AsyncStorage),
      })
    } catch {
      // Already initialized (e.g. hot reload) — fall back to getAuth
      auth = getAuthDefault(getFirebaseApp())
    }
  }
  return auth
}

export function getFirebaseDb(): Database {
  if (!db) {
    db = getDatabase(getFirebaseApp())
  }
  return db
}

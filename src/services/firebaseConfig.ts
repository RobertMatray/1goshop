import { initializeApp, getApps, type FirebaseApp } from 'firebase/app'
import { getAuth, type Auth } from 'firebase/auth'
import { getDatabase, type Database } from 'firebase/database'

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
    auth = getAuth(getFirebaseApp())
  }
  return auth
}

export function getFirebaseDb(): Database {
  if (!db) {
    db = getDatabase(getFirebaseApp())
  }
  return db
}

// Firebase SDK v10 (CDN module version)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, setPersistence, browserLocalPersistence, indexedDBLocalPersistence } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyC1vcbD5ov1pgQvdb6CAIBFT4zi2mCwFxc",
  authDomain: "strokes-a0b62.firebaseapp.com",
  projectId: "strokes-a0b62",
  storageBucket: "strokes-a0b62.firebasestorage.app",
  messagingSenderId: "13565861697",
  appId: "1:13565861697:web:54b8064f372730d3458bc0",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Get auth and firestore instances
export const auth = getAuth(app);
export const db = getFirestore(app);

// iOS PWAスタンドアロンモードではIndexedDBが不安定なため、localStorageベースの永続化を使用
const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
if (isStandalone) {
  setPersistence(auth, browserLocalPersistence)
    .then(() => console.log('[INFO] Auth persistence set to browserLocalPersistence (PWA mode)'))
    .catch(() => {
      console.warn('[WARNING] browserLocalPersistence failed, trying indexedDB');
      return setPersistence(auth, indexedDBLocalPersistence);
    })
    .catch((err) => console.error('[ERROR] Auth persistence setup failed:', err));
}

console.log("[SUCCESS] Firebase initialized");
console.log("[INFO] Project ID:", firebaseConfig.projectId);
console.log("[INFO] Standalone mode:", isStandalone);

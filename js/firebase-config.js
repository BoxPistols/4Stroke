// Firebase SDK v10 (CDN module version)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, setPersistence, browserLocalPersistence, indexedDBLocalPersistence } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { ENV_CONFIG } from "./env-config.generated.js";

// Firebase configuration (from .env via env-config.generated.js)
const firebaseConfig = ENV_CONFIG.FIREBASE;

// Firebase 設定が有効かチェック (apiKey が空なら無効)
const isConfigValid = !!(firebaseConfig && firebaseConfig.apiKey);

// Initialize Firebase (only if config is valid)
let app = null;
let auth = null;
let db = null;

if (isConfigValid) {
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);

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
  } catch (e) {
    console.error("[ERROR] Firebase initialization failed:", e.message);
    app = null;
    auth = null;
    db = null;
  }
} else {
  console.warn("[WARNING] Firebase config missing - running in local-only mode");
  console.warn("[INFO] Set FIREBASE_* env vars and run `npm run generate:config` to enable Firebase");
}

export { app, auth, db };

/**
 * Firebase が利用可能かどうか
 */
export function isFirebaseAvailable() {
  return !!app;
}

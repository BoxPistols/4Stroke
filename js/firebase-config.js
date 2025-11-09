// Firebase SDK v10 (CDN モジュール版)
// 認証とFirestoreに必要なモジュールをインポート
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Firebase設定情報（Firebaseコンソールから取得）
// このファイルをコピーして firebase-config.js を作成してください
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.firebasestorage.app",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Firebaseアプリを初期化
const app = initializeApp(firebaseConfig);

// 認証サービスのインスタンスを取得
export const auth = getAuth(app);

// Firestoreデータベースのインスタンスを取得
export const db = getFirestore(app);

console.log('Firebase初期化完了 ✅');
console.log('プロジェクトID:', firebaseConfig.projectId);

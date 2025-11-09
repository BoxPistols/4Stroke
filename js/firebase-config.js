// Firebase SDK v10 (CDN モジュール版)
// 認証とFirestoreに必要なモジュールをインポート
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Firebase設定情報（Firebaseコンソールから取得）
const firebaseConfig = {
  apiKey: "AIzaSyC1vcbD5ov1pgQvdb6CAIBFT4zi2mCwFxc",
  authDomain: "strokes-a0b62.firebaseapp.com",
  projectId: "strokes-a0b62",
  storageBucket: "strokes-a0b62.firebasestorage.app",
  messagingSenderId: "13565861697",
  appId: "1:13565861697:web:54b8064f372730d3458bc0"
};

// Firebaseアプリを初期化
const app = initializeApp(firebaseConfig);

// 認証サービスのインスタンスを取得
export const auth = getAuth(app);

// Firestoreデータベースのインスタンスを取得
export const db = getFirestore(app);

console.log('Firebase初期化完了 ✅');
console.log('プロジェクトID:', firebaseConfig.projectId);

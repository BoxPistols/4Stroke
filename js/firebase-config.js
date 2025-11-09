// Firebase SDK v10 (CDN module version)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
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

console.log("[SUCCESS] Firebase initialized");
console.log("[INFO] Project ID:", firebaseConfig.projectId);

// firebase-config.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-app.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js";

console.log('🔥 firebase-config.js loaded');

/* ------------------ Firebase Config ------------------ */
const firebaseConfig = {
  apiKey: "AIzaSyBCd4f4pN9S4aL6kayiBindXsknTq5--6Y",

  // ✅ MUST be Firebase default auth domain (NOT your custom domain)
  authDomain: "remindflow-137b8.firebaseapp.com",

  projectId: "remindflow-137b8",
  storageBucket: "remindflow-137b8.appspot.com",
  messagingSenderId: "115844931800",
  appId: "1:115844931800:web:d79311e9da71ea222177ad",
};

/* ------------------ Initialize Firebase ------------------ */
const app = initializeApp(firebaseConfig);

/* ------------------ Export Auth & Provider ------------------ */
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();

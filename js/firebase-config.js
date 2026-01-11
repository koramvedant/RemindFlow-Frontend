// /js/firebase-config.js

console.log('🔥 firebase-config.js loaded');

/* ------------------ Firebase Config ------------------ */
const firebaseConfig = {
  apiKey: "AIzaSyBCd4f4pN9S4aL6kayiBindXsknTq5--6Y",

  // ✅ MUST be Firebase default auth domain
  authDomain: "remindflow-137b8.firebaseapp.com",

  projectId: "remindflow-137b8",
  storageBucket: "remindflow-137b8.appspot.com",
  messagingSenderId: "115844931800",
  appId: "1:115844931800:web:d79311e9da71ea222177ad",
};

/* ------------------ Initialize Firebase ------------------ */
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

/* ------------------ Auth Configuration ------------------ */
firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL);

/* ------------------ Google Provider (for Google login flow) ------------------ */
window.googleProvider = new firebase.auth.GoogleAuthProvider();

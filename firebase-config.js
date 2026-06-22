/* ============================================================
   MITS LMS — Firebase Configuration (LIVE)
   Project: mits-d5a16
   ============================================================ */

const firebaseConfig = {
  apiKey:            "AIzaSyC61mfQLpLEPEs8cPi3YEQN7aDjTnR2s-0",
  authDomain:        "mits-d5a16.firebaseapp.com",
  databaseURL:       "https://mits-d5a16-default-rtdb.firebaseio.com",
  projectId:         "mits-d5a16",
  storageBucket:     "mits-d5a16.firebasestorage.app",
  messagingSenderId: "219840209664",
  appId:             "1:219840209664:web:ccd26a91fcc539c6a7c9e5",
  measurementId:     "G-W851X64L11"
};

// Initialize Firebase (compat SDK — works with existing <script> tags, no ES modules needed)
firebase.initializeApp(firebaseConfig);

// Global references used throughout all pages
const db      = firebase.firestore();
const auth    = firebase.auth();
const storage = firebase.storage();

// Configure short retry timeouts (10 seconds) to avoid hanging indefinitely if Storage is blocked/unreachable
storage.setMaxUploadRetryTime(10000);
storage.setMaxOperationRetryTime(10000);

console.log("🔥 Firebase connected — project: mits-d5a16");

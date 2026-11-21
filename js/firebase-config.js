import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { 
    getAuth, 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword,
    signOut,           
    onAuthStateChanged,
    sendPasswordResetEmail
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { 
    getFirestore, 
    collection, 
    addDoc, 
    getDocs, 
    query, 
    where, 
    orderBy,
    deleteDoc,
    doc,
    updateDoc,
    setDoc,
    getDoc
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import {
    initializeAppCheck,
    ReCaptchaEnterpriseProvider,
    ReCaptchaV3Provider
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app-check.js';

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyA8H1z1L2u0MS4yDd_Sb5kHaXcN-ni1oZs",
    authDomain: "expense-tracker-app-fb8cc.firebaseapp.com",
    projectId: "expense-tracker-app-fb8cc",
    storageBucket: "expense-tracker-app-fb8cc.firebasestorage.app",
    messagingSenderId: "60645129978",
    appId: "1:60645129978:web:4394c7718acc46a6d01343"
};

// Initialize Core Firebase Services
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ===== FIREBASE APP CHECK HARDENING =====
// App Check protects backend resources from abuse (e.g. bots, scrapers).
// For local testing, debug tokens can be set in self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
let appCheck = null;

try {
    // When running in localhost/dev, enable debug token if requested
    if (typeof window !== 'undefined' && (location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
        self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
    }

    // App Check reCAPTCHA Enterprise / v3 site key (configured in Firebase Console)
    const recaptchaSiteKey = window.__RECAPTCHA_SITE_KEY__ || null;

    if (recaptchaSiteKey && typeof initializeAppCheck === 'function') {
        appCheck = initializeAppCheck(app, {
            provider: new ReCaptchaEnterpriseProvider(recaptchaSiteKey),
            isTokenAutoRefreshEnabled: true
        });
    }
} catch (error) {
    // Graceful fallback: App Check will be active once reCAPTCHA site key is registered in Console
    console.warn("App Check not initialized:", error.message);
}

export { 
    app, 
    auth, 
    db,
    appCheck,
    
    // Auth Functions
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    sendPasswordResetEmail,
    
    // Firestore Functions
    collection,
    addDoc,
    getDocs,
    query,
    where,
    orderBy,
    deleteDoc,
    doc,
    updateDoc,
    setDoc,
    getDoc
};

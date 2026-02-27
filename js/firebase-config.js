import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { 
    getAuth, 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword,
    signOut,           // ← ADD THIS - for logout
    onAuthStateChanged // ← ADD THIS - for auth state monitoring
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
    setDoc,           // ← For creating user profiles
    getDoc            // ← For getting single documents
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

// Your Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyA8H1z1L2u0MS4yDd_Sb5kHaXcN-ni1oZs",
    authDomain: "expense-tracker-app-fb8cc.firebaseapp.com",
    projectId: "expense-tracker-app-fb8cc",
    storageBucket: "expense-tracker-app-fb8cc.firebasestorage.app",
    messagingSenderId: "60645129978",
    appId: "1:60645129978:web:4394c7718acc46a6d01343"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// EXPORT EVERYTHING your app needs
export { 
    // App instances
    app, 
    auth, 
    db,
    
    // AUTH FUNCTIONS
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,              // ← NOW EXPORTED - this fixes your error
    onAuthStateChanged,
    
    // FIRESTORE FUNCTIONS
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


// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDtsQR3vxFkt2pJbsJv1kCreTogGRGDK-8",
    authDomain: "nerowellne.firebaseapp.com",
    projectId: "nerowellne",
    storageBucket: "nerowellne.firebasestorage.app",
    messagingSenderId: "334202131444",
    appId: "1:334202131444:web:dabdfcb209d85d1112dfa1",
    measurementId: "G-2M5QCKF720"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;
const db = getFirestore(app);
const auth = getAuth(app);

export { app, analytics, db, auth };
export default app;


// Import the functions you need from the SDKs you need
import { initializeApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";
// import { getAnalytics, Analytics } from "firebase/analytics"; // Uncomment if you plan to use Firebase Analytics

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyD6Q-a21OKorFz8tKJgpVkx9L8DTqKSfHQ",
  authDomain: "skrbarackholka.firebaseapp.com",
  projectId: "skrbarackholka",
  storageBucket: "skrbarackholka.firebasestorage.app",
  messagingSenderId: "294946515979",
  appId: "1:294946515979:web:86769e1ff8cf2880beab0e",
  measurementId: "G-PH7NWS64C9"
};

// Initialize Firebase
let app: FirebaseApp;
let authInstance: Auth;
let dbInstance: Firestore;
// let analyticsInstance: Analytics; // Uncomment if you plan to use Firebase Analytics

try {
  app = initializeApp(firebaseConfig);
  authInstance = getAuth(app);
  dbInstance = getFirestore(app);
  // analyticsInstance = getAnalytics(app); // Uncomment if you plan to use Firebase Analytics
  console.log("Firebase initialized successfully!");
} catch (error: any) {
  console.error("CRITICAL Firebase Initialization Error in firebase.ts:", error.message, error.code, error);
  console.error("This usually means your firebaseConfig object in firebase.ts is incorrect or incomplete. PLEASE DOUBLE-CHECK IT AGAINST YOUR FIREBASE PROJECT SETTINGS.");
  alert("CRITICAL Firebase Initialization Error. Check console for details. Your firebaseConfig in firebase.ts is likely incorrect.");
  // Fallback to dummy objects if initialization fails to prevent app crashing immediately in other parts,
  // though Firebase functionality will NOT work.
  app = {} as FirebaseApp; 
  authInstance = {} as Auth;
  dbInstance = {} as Firestore;
  // analyticsInstance = {} as Analytics; // Uncomment if you plan to use Firebase Analytics
}

// Rename exports to avoid conflict with imported names if they were also named 'auth' or 'db'
export { app, authInstance as auth, dbInstance as db };
// export { analyticsInstance as analytics }; // Uncomment if you plan to use Firebase Analytics

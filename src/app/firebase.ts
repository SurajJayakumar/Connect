// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";
import { getFirestore }             from 'firebase/firestore';
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBQ77d59lJ9wGFtJ6Ul-bTqKsRI02sZiQk",
  authDomain: "connect-59807.firebaseapp.com",
  projectId: "connect-59807",
  storageBucket: "connect-59807.firebasestorage.app",
  messagingSenderId: "103163345801",
  appId: "1:103163345801:web:b9090ab1709b80139a7f58",
  measurementId: "G-3HM0DFRDJQ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
const analytics = getAnalytics(app);
export const db   = getFirestore(app);

// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";


const firebaseConfig = {
    apiKey: "AIzaSyAhNy0UGKNbDs1lYx7oXXfqIsqtgn_ETuI",
    authDomain: "ass1-e2105.firebaseapp.com",
    projectId: "ass1-e2105",
    storageBucket: "ass1-e2105.firebasestorage.app",
    messagingSenderId: "1093944935195",
    appId: "1:1093944935195:web:9bd29bcc262852cebf49be",
    measurementId: "G-5B2YWDD3H7"
  };

  export const app = initializeApp(firebaseConfig);
  export const auth = getAuth(app);
  export const db = getFirestore(app);
  export const functions = getFunctions(app, "australia-southeast1");
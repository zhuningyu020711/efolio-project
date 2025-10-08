// src/firebase.js
import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'


const firebaseConfig = {
    apiKey: "AIzaSyAcR8eRn__ruZ8_kEr10TuPCLrqEgmQDfQ",
    authDomain: "efolio-project.firebaseapp.com",
    projectId: "efolio-project",
    storageBucket: "efolio-project.firebasestorage.app",
    messagingSenderId: "298508974584",
    appId: "1:298508974584:web:c9eed82da549c867e7fe0d",
    measurementId: "G-7SP85RRG5G"
}

export const firebaseApp = initializeApp(firebaseConfig)
export const auth = getAuth(firebaseApp)

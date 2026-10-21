import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyC6GWhe9P15xx83k5K28jZWralPLujashY",
    authDomain: "alquiler-e895f.firebaseapp.com",
    projectId: "alquiler-e895f",
    storageBucket: "alquiler-e895f.firebasestorage.app",
    messagingSenderId: "613397993695",
    appId: "1:613397993695:web:f78d6ab7689458a67af16a"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
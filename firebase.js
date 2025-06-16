// firebase.js  (MODULAR v10)
// 1) Load Firebase (modular API)
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.5.0/firebase-app.js';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
  } from 'https://www.gstatic.com/firebasejs/10.5.0/firebase-auth.js';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  onSnapshot,
  deleteDoc
  } from 'https://www.gstatic.com/firebasejs/10.5.0/firebase-firestore.js';


// 2) Tu configuración (pégala exacta de la consola)
const firebaseConfig = {
      apiKey: "AIzaSyA-EY3-EISZdoThqVepYYA9rlCI30Qt8ZE",
      authDomain: "taska-65c33.firebaseapp.com",
      projectId: "taska-65c33",
      storageBucket: "taska-65c33.appspot.com",
      messagingSenderId: "287205600078",
      appId: "1:287205600078:web:25b211ff3764cbfe304c1f",
      measurementId: "G-RM9DCQ136H"
      };

const app      = initializeApp(firebaseConfig);
export const auth     = getAuth(app);
export const db       = getFirestore(app);
export const provider = new GoogleAuthProvider();
export {
  signInWithPopup,
  signOut,
  onSnapshot,
  collection,
  doc,
  setDoc,
  deleteDoc
  };


export function initAuth(onLogin, onLogout) {
      onAuthStateChanged(auth, user => {
            if (user) onLogin(user);
            else      onLogout();
            });
      }

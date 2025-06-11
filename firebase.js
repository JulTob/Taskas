// firebase.js
// ————————————————
// Firebase initialization using compat libraries

import firebase from 'https://www.gstatic.com/firebasejs/10.5.0/firebase-app-compat.js';
import 'https://www.gstatic.com/firebasejs/10.5.0/firebase-auth-compat.js';
import 'https://www.gstatic.com/firebasejs/10.5.0/firebase-firestore-compat.js';


const firebaseConfig = {
  apiKey: "AIzaSyA-EY3-EISZdoThqVepYYA9rlCI30Qt8ZE",
  authDomain: "taska-65c33.firebaseapp.com",
  projectId: "taska-65c33",
  storageBucket: "taska-65c33.appspot.com",
  messagingSenderId: "287205600078",
  appId: "1:287205600078:web:25b211ff3764cbfe304c1f",
  measurementId: "G-RM9DCQ136H"
  };

firebase.initializeApp(firebaseConfig);

export const auth = firebase.auth();
export const db = firebase.firestore();
export const provider = new firebase.auth.GoogleAuthProvider();

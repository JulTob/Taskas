// firebase-init.js
// —————————————————————————————————
// 1) Carga y configura Firebase (ya lo tienes en index.html)
// 2) Exporta los objetos que usarás en la app

// (En index.html ya incluyes los <script src="…firebase-compat.js">)

// Inicialización
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

// Exports
export const auth     = firebase.auth();
export const db       = firebase.firestore();
export const provider = new firebase.auth.GoogleAuthProvider();
export let collRef    = null;

// Función para suscribirse al estado de auth
export function initAuth(onLogin, onLogout) {
  auth.onAuthStateChanged(user => {
    if (user) {
      collRef = db.collection('users').doc(user.uid).collection('tasks');
      onLogin(user, collRef);
    } else {
      collRef = null;
      onLogout();
    }
  });
}

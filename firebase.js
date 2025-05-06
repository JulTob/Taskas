// firebase.js
// ————————————————
// 1) Carga las libs (usa compat o modular, aquí compat para mantener tu versión):
importScripts(
  "https://www.gstatic.com/firebasejs/10.5.0/firebase-app-compat.js",
  "https://www.gstatic.com/firebasejs/10.5.0/firebase-auth-compat.js",
  "https://www.gstatic.com/firebasejs/10.5.0/firebase-firestore-compat.js"
);

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
firebase.initializeApp(firebaseConfig);

// 3) Exports
export const auth     = firebase.auth();
export const db       = firebase.firestore();
export const provider = new firebase.auth.GoogleAuthProvider();

/**
 * Inicializa el listener de auth. Recibe dos callbacks:
 * onLogin(user), onLogout()
 */
export function initAuth(onLogin, onLogout) {
  auth.onAuthStateChanged(user => {
    if (user) {
      // al entrar, pasamos el user
      onLogin(user);
    } else {
      onLogout();
    }
  });
}

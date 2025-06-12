// firebase.js
// ————————————————
// 1) Carga las libs (usa compat o modular, aquí compat para mantener tu versión):
import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/10.5.0/firebase-app.js';
import { getAuth, GoogleAuthProvider } from 'https://www.gstatic.com/firebasejs/10.5.0/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.5.0/firebase-firestore.js';

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

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

export { auth, db, provider };

// 3) Inicializa la app y exporta los servicios
firebase.initializeApp(firebaseConfig);

export const auth     = firebase.auth();
export const db       = firebase.firestore();
export const provider = new firebase.auth.GoogleAuthProvider();

/** Helper: high-level auth listener.
 *  @param {Function} onLogin   called with `user`
 *  @param {Function} onLogout  called with no args
 */

export function initAuth(onLogin, onLogout) {
  auth.onAuthStateChanged(user => {
    if (user) onLogin(user);
    else       onLogout();
  });
}





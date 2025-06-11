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

// ---------- Firebase ----------
// (colócalo antes que el resto para que collRef exista)
const auth     = firebase.auth();
const db       = firebase.firestore();
const provider = new firebase.auth.GoogleAuthProvider();

let collRef = null;               // /users/{uid}/tasks

const loginBtn  = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');

loginBtn.onclick  = () => auth.signInWithPopup(provider);
logoutBtn.onclick = () => auth.signOut();

/* === estado de autenticación === */
auth.onAuthStateChanged(user => {
  if (!user) {
    // logout → limpia UI
    logoutBtn.classList.add('hidden');
    loginBtn.classList.remove('hidden');
    form.classList.add('hidden');
    taskList.length = 0;
    renderTasks();
    return;
  }

  // login OK
  loginBtn.classList.add('hidden');
  logoutBtn.classList.remove('hidden');
  form.classList.remove('hidden');

  collRef = db.collection('users').doc(user.uid).collection('tasks');

  collRef.onSnapshot(snap => {
    taskList.length = 0;
    snap.forEach(doc => taskList.push({ id: doc.id, ...doc.data() }));
    renderTasks();
  });
});


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

// app.js
// —————————————————————————————————
import { auth, provider, initAuth, collRef } from './firebase-init.js';

// DOM refs
const loginBtn      = document.getElementById('loginBtn');
const logoutBtn     = document.getElementById('logoutBtn');
const form          = document.getElementById('task-form');
const taskContainer = document.getElementById('task-container');
// … y el resto de inputs …

let taskList = [];

// Inicializa el login/logout
loginBtn.onclick  = () => auth.signInWithPopup(provider);
logoutBtn.onclick = () => auth.signOut();

initAuth(
  user => {
    // onLogin
    loginBtn.classList.add('hidden');
    logoutBtn.classList.remove('hidden');
    form.classList.remove('hidden');
    // Suscribe al snapshot
    collRef.onSnapshot(snap => {
      taskList = [];
      snap.forEach(doc => taskList.push({ id: doc.id, ...doc.data() }));
      renderTasks();
    });
  },
  () => {
    // onLogout
    logoutBtn.classList.add('hidden');
    loginBtn.classList.remove('hidden');
    form.classList.add('hidden');
    taskList = [];
    renderTasks();
  }
);

// Resto de tu código: setDefaultFormValues, renderTasks, toggleSubtaskPanel…
form.addEventListener('submit', e => {
  // …
  saveTasks();
});

// Guarda usando collRef
function saveTasks() {
  if (!collRef) return;
  taskList.forEach(t => collRef.doc(t.id.toString()).set(t));
}

// …flattenTasks, getTaskByPath, renderTasks, toggleSubtaskPanel…

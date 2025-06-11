// front.js
// —————————————————————————————————
// Lógica de UI y gestión de tareas (importa Firebase desde firebase.js)

import { auth, provider, initAuth, collRef } from './firebase.js';

// — 1. Referencias al DOM —
const loginBtn      = document.getElementById('loginBtn');
const logoutBtn     = document.getElementById('logoutBtn');
const form          = document.getElementById('task-form');
const taskContainer = document.getElementById('task-container');

const titleInput    = document.getElementById('title');
const dateInput     = document.getElementById('deadline');
const timeInput     = document.getElementById('time');
const durationInput = document.getElementById('duration');
const notesInput    = document.getElementById('notes');

// — 2. Estado local de la app —
let taskList = [];

// — 3. Valores por defecto —
function setDefaultFormValues() {
  titleInput.value    = 'Taskeo';
  const t             = new Date();
  t.setDate(t.getDate() + 1);
  dateInput.value     = t.toISOString().split('T')[0];
  timeInput.value     = '17:00';
  durationInput.value = '30';
}

// — 4. Inicialización UI al cargar —
window.addEventListener('DOMContentLoaded', () => {
  setDefaultFormValues();
  renderTasks();  // mostrará “No hay tareas…” hasta hacer login
});

// — 5. Botones de login/logout —
loginBtn.onclick  = () => {
  auth.signInWithPopup(provider)
      .catch(err => console.error('Error login:', err));
};
logoutBtn.onclick = () => auth.signOut();

// — 6. Manejo de estado de autenticación —
initAuth(
  user => {
    // On login
    loginBtn.classList.add('hidden');
    logoutBtn.classList.remove('hidden');
    form.classList.remove('hidden');

    // Sincroniza en tiempo real la colección del usuario
    collRef.onSnapshot(snap => {
      taskList = [];
      snap.forEach(doc => taskList.push({ id: doc.id, ...doc.data() }));
      renderTasks();
    });
  },
  () => {
    // On logout
    logoutBtn.classList.add('hidden');
    loginBtn.classList.remove('hidden');
    form.classList.add('hidden');
    taskList = [];
    renderTasks();
  }
);

// — 7. Crear / Guardar nueva tarea —
form.addEventListener('submit', e => {
  e.preventDefault();

  const task = {
    id        : Date.now(),
    title     : titleInput.value.trim(),
    deadline  : dateInput.value,
    time      : timeInput.value,
    priority  : form.elements['priority'].value,
    duration  : parseInt(durationInput.value, 10) || 30,
    notes     : notesInput.value.trim(),
    completed : false,
    timeSpent : 0,
    subtasks  : []
  };

  taskList.push(task);
  saveTasks();
  form.reset();
  setDefaultFormValues();
  renderTasks();
});

// — 8. Guardar en Firestore —
function saveTasks() {
  if (!collRef) return;  // aún no hay sesión
  taskList.forEach(t =>
    collRef.doc(t.id.toString()).set(t)
  );
}

// — 9. Helpers jerárquicos —
function flattenTasks(tasks, level = 0, path = []) {
  return tasks.reduce((acc, t, i) => {
    acc.push({ task: t, level, path: [...path, i] });
    if (t.subtasks.length) {
      acc.push(...flattenTasks(t.subtasks, level + 1, [...path, i]));
    }
    return acc;
  }, []);
}
function getTaskByPath(path) {
  return path.reduce(
    (cursor, idx) => cursor.subtasks[idx],
    { subtasks: taskList }
  );
}

// — 10. Renderizar tabla de tareas —
function renderTasks() {
  taskContainer.innerHTML = '';

  const flat = flattenTasks(taskList);
  if (!flat.length) {
    taskContainer.innerHTML = '<p class="text-gray-500">No hay tareas aún.</p>';
    return;
  }

  const table = document.createElement('table');
  table.className = 'w-full table-auto bg-white rounded shadow overflow-hidden';
  table.innerHTML = `
    <thead class="bg-gray-200 text-left">
      <tr>
        <th class="p-2">Título</th>
        <th class="p-2">Prioridad</th>
        <th class="p-2">Fecha</th>
        <th class="p-2">Hora</th>
        <th class="p-2">Duración</th>
        <th class="p-2">Subtareas</th>
        <th class="p-2">Notas</th>
      </tr>
    </thead>
    <tbody class="divide-y"></tbody>
  `;
  const tbody = table.querySelector('tbody');

  flat.forEach(({ task, level, path }) => {
    const row = document.createElement('tr');
    row.className = 'cursor-pointer hover:bg-gray-50';

    const noteIcon = task.notes
      ? `<span title="${task.notes.replace(/"/g,'&quot;')}">✏️</span>`
      : '—';

    row.innerHTML = `
      <td class="p-2 font-semibold" style="padding-left:${level*1.5}rem">
        ${task.title}
      </td>
      <td class="p-2">${task.priority}</td>
      <td class="p-2">${task.deadline || '—'}</td>
      <td class="p-2">${task.time || '—'}</td>
      <td class="p-2">${task.duration} min</td>
      <td class="p-2">${task.subtasks.length}</td>
      <td class="p-2">${noteIcon}</td>
    `;

    tbody.appendChild(row);
  });

  taskContainer.appendChild(table);
}

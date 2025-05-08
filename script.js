// Taskas – gestor con Google login y Firestore
// --------------------------------------------
// --------- 0 - Memoria y referencias ----------
const taskList      = [];

const form          = document.getElementById('task-form');
const taskContainer = document.getElementById('task-container');

const titleInput    = document.getElementById('title');
const dateInput     = document.getElementById('deadline');
const timeInput     = document.getElementById('time');
const durationInput = document.getElementById('duration');
const notesInput    = document.getElementById('notes');
const parentSelect  = document.getElementById('parentSelect');


// --------- 1 - Firebase ----------
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
    refreshTaskOptions()
    renderDepsChips();
    });
  });


// ---------- Valores por defecto ----------
function setDefaultFormValues() {
  titleInput.value   = 'Taskeo';
  const t            = new Date();
  t.setDate(t.getDate() + 1);
  dateInput.value    = t.toISOString().split('T')[0];
  timeInput.value    = '17:00';
  durationInput.value = '30';
  }

// ---------- Al cargar ----------
window.addEventListener('DOMContentLoaded', () => {
  setDefaultFormValues();
  renderTasks();           // mostrará “No hay tareas…” hasta hacer login
  refreshTaskOptions();
  renderDepsChips()
  });

// ---------- 1. Crear tarea ----------
form.addEventListener('submit', e => {
  e.preventDefault();

  const task = {
    id        : Date.now(),
    title     : titleInput.value.trim(),
    deadline  : dateInput.value,
    time      : timeInput.value,
    priority  : form.elements['priority'].value,
    duration  : durationInput.value || 30,
    notes     : notesInput.value.trim(),
    completed : false,
    timeSpent : 0,
    subtasks  : [],
    parentId  : parentSelect.value ? Number(parentSelect.value) : null,
    dependsOn : [...selectedDeps],
    };

  if (task.parentId) {
    const parent = findTaskById(task.parentId);      // helper
    parent.subtasks.push(task);
  } else {
    taskList.push(task);                             // raíz
    }
  saveTasks();
  form.reset();
  setDefaultFormValues();
  refreshTaskOptions();
  renderTasks();
});

// ---------- 2. Helpers ----------
function flattenTasks(tasks, lvl = 0, path = []) {
  return tasks.reduce((a, t, i) => {
    a.push({ task: t, level: lvl, path: [...path, i] });
    if (t.subtasks.length) a.push(...flattenTasks(t.subtasks, lvl+1, [...path,i]));
    return a;
  }, []);
}
function getTaskByPath(path) {
  return path.reduce((cur, idx) => cur.subtasks[idx], { subtasks: taskList });
}

// ---------- 3. Renderizar tabla ----------
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
      <tr><th class="p-2 w-6"></th>
          <th class="p-2">Título</th><th class="p-2">Prioridad</th>
          <th class="p-2">Fecha Límite</th><th class="p-2">Hora</th>
          <th class="p-2">Duración</th><th class="p-2">Subtareas</th>
          <th class="p-2">Depende</th>
          <th class="p-2">Notas</th></tr>
          <th class="p-2 w-6"></th>
    </thead><tbody class="divide-y"></tbody>`;
  const tbody = table.querySelector('tbody');

  flat.forEach(({ task, level, path }) => {
    const row = document.createElement('tr');
    row.className = 'cursor-pointer hover:bg-gray-50';
    const noteIcon = task.notes ? '✏️' : '—';

    row.innerHTML = `
      <td class="p-2 text-center">
         🔴
         </td>
      <td class="p-2 font-semibold" style="padding-left:${level*1.6}rem">
        ${task.title}
        </td>
      <td class="p-2">${task.priority}</td>
      <td class="p-2">${task.deadline || '—'}</td>
      <td class="p-2">${task.time || '—'}</td>
      <td class="p-2">${task.duration} min</td>
      <td class="p-2">${task.subtasks.length}</td>
      <td class="p-2">${task.dependsOn?.length ? task.dependsOn.length : '—'}</td>
      <td class="p-2 text-center">${noteIcon}</td>
      <td class="p-2 text-center">
        <button class="text-brand-700 hover:text-red-700" title="Borrar">
          🗑️
          </button>
          </td>`;
    const deleteBtn = row.querySelector('button');
    deleteBtn.onclick = (ev) => {
      ev.stopPropagation();
      if (!confirm(`¿Borrar “${task.title}” y sus subtareas?`)) return;
      removeTaskByPath(path);
      saveTasks();
      renderTasks();
      refreshTaskOptions();
      };

    const titleCell = row.firstElementChild;
    titleCell.contentEditable = true;
    titleCell.addEventListener('blur', () => {
      const newTitle = titleCell.textContent.trim();
      if (newTitle && newTitle !== task.title) {
        task.title = newTitle;
        saveTasks();
        renderTasks();
        refreshTaskOptions();
        }
      
      });

    row.addEventListener('click', ev => {
      if (ev.target !== titleCell) toggleSubtaskPanel(path);
    });

    tbody.appendChild(row);
  });

  taskContainer.appendChild(table);
}

// ---------- 4. Panel nota ----------
function toggleSubtaskPanel(path) {
  const task = getTaskByPath(path);
  document.getElementById('subpanel')?.remove();

  const panel = document.createElement('div');
  panel.id = 'subpanel';
  panel.className = 'bg-white p-4 mb-4 border rounded shadow';

  panel.innerHTML = `
    <h2 class="font-semibold mb-2">Nota de “${task.title}”</h2>
    <textarea id="note-edit" rows="3"
              class="w-full p-2 border rounded mb-2">${task.notes}</textarea>
    <button id="save-note" class="bg-blue-500 text-white px-4 py-2 rounded mb-4">
      Guardar nota
      </button>
    <h2 class="font-semibold mb-2">Subtareas</h2>
    <ul id="sub-list" class="mb-2 list-disc ml-6"></ul>
    `;

  const ul = panel.querySelector('#sub-list');
  task.subtasks.forEach(st => {
    const li = document.createElement('li');
    li.textContent = st.title;
    ul.appendChild(li);
  });

  panel.querySelector('#save-note').onclick = () => {
    task.notes = panel.querySelector('#note-edit').value.trim();
    saveTasks();
  };


  taskContainer.appendChild(panel);
}

// ---------- 5. Persistencia (Firestore) ----------
function saveTasks() {
  if (!collRef) return;
  taskList.forEach(t => collRef.doc(t.id.toString()).set(t));
  }

// --- Parentaje y Dependencia ---
function refreshTaskOptions() {
  renderDepsChips();
  // llena los select con todas las tareas raíz (o todas, según prefieras)
  const parentSel = document.getElementById('parentSelect');
  if (!parentSel) return;

  // limpia
  parentSel.querySelectorAll('option:not([value=""])').forEach(o => o.remove());

  flattenTasks(taskList).forEach(({ task, level }) => {
      const label = '‒'.repeat(level) + ' ' + task.title;
      // opción padre
      const optP = new Option(label, task.id);
      parentSel.add(optP);
      // opción dependencias
      const optD = new Option(label, task.id);
      });
    }

function findTaskById(id, cursor = taskList) {
      for (const t of cursor) {
        if (t.id === id) return t;
        const found = findTaskById(id, t.subtasks);
        if (found) return found;
        }
      return null;
    }

let selectedDeps = [];

function renderDepsChips() {
      const container = document.getElementById('depsChips');
      if (!container) return;
    
      container.innerHTML = '';  // Limpia
    
      flattenTasks(taskList).forEach(({ task }) => {
            const chip = document.createElement('button');
            chip.textContent = task.title;
            chip.className = `
              px-3 py-1 rounded-full border text-sm transition
              ${selectedDeps.includes(task.id)
                ? 'bg-brand-600 text-white border-brand-600'
                : 'bg-white text-brand-800 border-brand-400 hover:bg-brand-100'}
              `;
        
            chip.onclick = () => {
              if (selectedDeps.includes(task.id)) {
                selectedDeps = selectedDeps.filter(id => id !== task.id);
                } 
              else {
                selectedDeps.push(task.id);
                }
              renderDepsChips();
              };
        
            container.appendChild(chip);
            });
      }

function removeTaskByPath(path, cursor = taskList) {
    const idx = path[0];
    if (path.length === 1) {
      cursor.splice(idx, 1);           // elimina en este nivel
      } 
    else {
      removeTaskByPath(path.slice(1), cursor[idx].subtasks);
      }
    }

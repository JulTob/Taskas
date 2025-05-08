// Taskas – gestor con Google login y Firestore
// --------------------------------------------
// --------- 0 - Memoria y referencias ----------
const taskList      = [];

const taskContainer = document.getElementById('task-container');

/*
const form          = document.getElementById('task-form');
const titleInput    = document.getElementById('title');
const dateInput     = document.getElementById('deadline');
const timeInput     = document.getElementById('time');
const durationInput = document.getElementById('duration');
const notesInput    = document.getElementById('notes');
const parentSelect  = document.getElementById('parentSelect');
*/

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
  titleInput.value   = '';
  const t            = new Date();
  t.setDate(t.getDate() + 1);
  dateInput.value    = t.toISOString().split('T')[0];
  timeInput.value    = '17:00';
  durationInput.value = '30';
  }

// ---------- Al cargar ----------
window.addEventListener('DOMContentLoaded', () => {
  renderTasks();           // mostrará “No hay tareas…” hasta hacer login
  refreshTaskOptions();
  // Asigna correctamente el botón para crear tareas
  const newBtn = document.getElementById('new-task-btn');
  newBtn.onclick = () => showTaskModal({ mode: 'create' });
});

// ------ Ventanita Modal -------
function showTaskModal({ mode = 'edit', task = null, path = null }) {
  document.getElementById('task-modal')?.remove();

  const isNew = mode === 'create';

  // si no hay tarea (modo create), crea una nueva vacía
  if (!task) {
    task = {
      id: Date.now(),
      title: '',
      deadline: '',
      time: '',
      duration: 30,
      priority: 'Media',
      notes: '',
      completed: false,
      timeSpent: 0,
      subtasks: [],
      parentId: null,
      dependsOn: []
      };
    }

  const modal = document.createElement('div');
  modal.id = 'task-modal';
  modal.className = `
    fixed inset-0 z-50 flex items-center justify-center
    bg-black/40 backdrop-blur-sm
  `;

  const panel = document.createElement('div');
  panel.className = 'bg-white w-full max-w-xl p-6 rounded shadow-lg border border-brand-200 relative';

  const allOptions = flattenTasks(taskList)
    .filter(({ task: t }) => t.id !== task.id)
    .map(({ task: t, level }) => {
      const indent = '‒'.repeat(level);
      return `<option value="${t.id}" ${t.id === task.parentId ? 'selected' : ''}>
                ${indent} ${t.title}
              </option>`;
    }).join('');

  const depChips = flattenTasks(taskList)
    .filter(({ task: t }) => t.id !== task.id)
    .map(({ task: t }) => {
      const selected = task.dependsOn.includes(t.id);
      return `
        <button data-depid="${t.id}"
                class="px-3 py-1 rounded-full border text-sm transition
                  ${selected
                    ? 'bg-brand-600 text-white border-brand-600'
                    : 'bg-white text-brand-800 border-brand-400 hover:bg-brand-100'}">
          ${t.title}
        </button>`;
    }).join('');

  panel.innerHTML = `
    <h2 class="font-dpica text-2xl mb-4">${isNew ? '➕ Nueva Tarea' : `Editar “${task.title}”`}</h2>

    <label class="block mb-2">
      <input id="edit-title" class="w-full p-2 border rounded font-pica"
             placeholder="Título..." value="${task.title}" />
    </label>

    <div class="flex flex-col sm:flex-row gap-3 mb-2">
      <input id="edit-deadline" type="date" class="flex-1 p-2 border rounded"
             value="${task.deadline || ''}" />
      <input id="edit-time" type="time" class="flex-1 p-2 border rounded"
             value="${task.time || ''}" />
      <input id="edit-duration" type="number" class="flex-1 p-2 border rounded"
             value="${task.duration}" min="5" step="5" />
    </div>

    <select id="edit-priority" class="w-full p-2 border rounded mb-2">
      <option value="Alta" ${task.priority === 'Alta' ? 'selected' : ''}>Alta</option>
      <option value="Media" ${task.priority === 'Media' ? 'selected' : ''}>Media</option>
      <option value="Baja" ${task.priority === 'Baja' ? 'selected' : ''}>Baja</option>
    </select>

    <label class="block mb-2">
      <span class="font-semibold text-sm">Tarea Padre</span>
      <select id="edit-parent" class="w-full p-2 border rounded mt-1">
        <option value="">— raíz —</option>
        ${allOptions}
      </select>
    </label>

    <label class="block mb-2">
      <span class="font-semibold text-sm">Dependencias</span>
      <div id="edit-deps" class="flex flex-wrap gap-2 mt-1">${depChips}</div>
    </label>

    <label class="block mb-4">
      <input id="edit-completed" type="checkbox" class="mr-2" ${task.completed ? 'checked' : ''}>
      <span class="text-sm">Completada</span>
    </label>

    <textarea id="edit-notes" rows="3" class="w-full p-2 border rounded mb-4"
              placeholder="Notas...">${task.notes}</textarea>

    <div class="flex justify-end gap-2">
      <button id="cancel-task-edits" class="bg-gray-300 hover:bg-gray-400 px-4 py-2 rounded">
        ✖ Cancelar
      </button>
      <button id="save-task-edits" class="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded">
        💾 Guardar
      </button>
    </div>
  `;

  modal.appendChild(panel);
  document.body.appendChild(modal);

  // DEPENDENCIAS (chip toggle)
  const depContainer = panel.querySelector('#edit-deps');
  depContainer.querySelectorAll('button[data-depid]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = Number(btn.dataset.depid);
      if (task.dependsOn.includes(id)) {
        task.dependsOn = task.dependsOn.filter(d => d !== id);
      } else {
        task.dependsOn.push(id);
      }
      modal.remove();
      showTaskModal({ mode, task, path }); // recargar con nuevo estado
    });
  });

  panel.querySelector('#cancel-task-edits').onclick = () => modal.remove();

  panel.querySelector('#save-task-edits').onclick = () => {
    const newData = {
      title:     panel.querySelector('#edit-title').value.trim(),
      deadline:  panel.querySelector('#edit-deadline').value || null,
      time:      panel.querySelector('#edit-time').value || null,
      duration:  parseInt(panel.querySelector('#edit-duration').value, 10) || 30,
      priority:  panel.querySelector('#edit-priority').value,
      notes:     panel.querySelector('#edit-notes').value.trim(),
      completed: panel.querySelector('#edit-completed').checked,
      parentId:  panel.querySelector('#edit-parent').value
                  ? Number(panel.querySelector('#edit-parent').value)
                  : null,
      dependsOn: task.dependsOn
    };

    if (mode === 'edit') {
      // si ha cambiado de padre, mover
      if (newData.parentId !== task.parentId) {
        removeTaskByPath(path);
        const newParent = findTaskById(newData.parentId);
        if (newParent) newParent.subtasks.push(task);
        else taskList.push(task);
      }
      Object.assign(task, newData);
    } else {
      // nueva tarea
      Object.assign(task, newData);
      if (task.parentId) {
        const parent = findTaskById(task.parentId);
        parent?.subtasks.push(task);
      } else {
        taskList.push(task);
      }
    }

    updateTaskField(task, 'dummy', null);
    modal.remove();
    renderTasks();
    refreshTaskOptions();
  };
}

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
  console.log(flat)
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
    const marker = getMarker(task);


    row.innerHTML = `
      <td class="p-2 text-center">${marker}</td>
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

    const titleCell = row.children[1];
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
      if (ev.target !== titleCell) showTaskModal({ mode: 'edit', task, path });
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

  // opciones para tareas padres y dependencias
  const allOptions = flattenTasks(taskList)
    .filter(({ task: t }) => t.id !== task.id)  // no puede depender de sí misma
    .map(({ task: t, level }) => {
      const indent = '‒'.repeat(level);
      return `<option value="${t.id}" ${t.id === task.parentId ? 'selected' : ''}>
                ${indent} ${t.title}
              </option>`;
    }).join('');

  const depChips = flattenTasks(taskList)
    .filter(({ task: t }) => t.id !== task.id)
    .map(({ task: t }) => {
      const selected = task.dependsOn.includes(t.id);
      return `
        <button data-depid="${t.id}"
                class="px-3 py-1 rounded-full border text-sm transition
                  ${selected
                    ? 'bg-brand-600 text-white border-brand-600'
                    : 'bg-white text-brand-800 border-brand-400 hover:bg-brand-100'}">
          ${t.title}
        </button>`;
    }).join('');

  panel.innerHTML = `
    <h2 class="font-semibold mb-4">Editar “${task.title}”</h2>

    <label class="block mb-2">
      <span class="font-semibold">Título</span>
      <input id="edit-title" class="w-full p-2 border rounded" value="${task.title}" />
    </label>

    <div class="flex flex-col sm:flex-row gap-3 mb-2">
      <label class="flex-1">
        <span class="font-semibold">Fecha límite</span>
        <input id="edit-deadline" type="date" class="w-full p-2 border rounded"
               value="${task.deadline || ''}" />
      </label>
      <label class="flex-1">
        <span class="font-semibold">Hora</span>
        <input id="edit-time" type="time" class="w-full p-2 border rounded"
               value="${task.time || ''}" />
      </label>
      <label class="flex-1">
        <span class="font-semibold">Duración</span>
        <input id="edit-duration" type="number" class="w-full p-2 border rounded"
               value="${task.duration}" min="5" step="5" />
      </label>
    </div>

    <label class="block mb-2">
      <span class="font-semibold">Prioridad</span>
      <select id="edit-priority" class="w-full p-2 border rounded">
        <option value="Alta" ${task.priority === 'Alta' ? 'selected' : ''}>Alta</option>
        <option value="Media" ${task.priority === 'Media' ? 'selected' : ''}>Media</option>
        <option value="Baja" ${task.priority === 'Baja' ? 'selected' : ''}>Baja</option>
      </select>
    </label>

    <label class="block mb-2">
      <span class="font-semibold">Tarea Padre</span>
      <select id="edit-parent" class="w-full p-2 border rounded">
        <option value="">— raíz —</option>
        ${allOptions}
      </select>
    </label>

    <label class="block mb-2">
      <span class="font-semibold">Dependencias</span>
      <div id="edit-deps" class="flex flex-wrap gap-2 mt-1">${depChips}</div>
    </label>

    <label class="block mb-4">
      <input id="edit-completed" type="checkbox" class="mr-2" ${task.completed ? 'checked' : ''}>
      <span class="font-semibold">Completada</span>
    </label>

    <label class="block mb-4">
      <span class="font-semibold">Notas</span>
      <textarea id="edit-notes" rows="3" class="w-full p-2 border rounded">${task.notes}</textarea>
    </label>

    <button id="save-task-edits"
            class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded mr-2">
      💾 Guardar
    </button>
    <button id="cancel-task-edits"
            class="bg-gray-300 hover:bg-gray-400 px-4 py-2 rounded">
      ✖ Cancelar
    </button>
  `;

  // toggle de dependencias
  const depContainer = panel.querySelector('#edit-deps');
  depContainer.querySelectorAll('button[data-depid]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = Number(btn.dataset.depid);
      if (task.dependsOn.includes(id)) {
        task.dependsOn = task.dependsOn.filter(d => d !== id);
      } else {
        task.dependsOn.push(id);
      }
      showTaskModal({ mode: 'edit', task, path });
    });
  });

  panel.querySelector('#save-task-edits').onclick = () => {
    const newData = {
      title:     panel.querySelector('#edit-title').value.trim(),
      deadline:  panel.querySelector('#edit-deadline').value || null,
      time:      panel.querySelector('#edit-time').value || null,
      duration:  parseInt(panel.querySelector('#edit-duration').value, 10) || 30,
      priority:  panel.querySelector('#edit-priority').value,
      notes:     panel.querySelector('#edit-notes').value.trim(),
      completed: panel.querySelector('#edit-completed').checked,
      parentId:  panel.querySelector('#edit-parent').value
                  ? Number(panel.querySelector('#edit-parent').value)
                  : null,
      dependsOn: task.dependsOn  // ya se modificó en vivo con los botones
    };

    if (mode === 'edit') {
  // actualizas los datos de la tarea original
  Object.assign(task, newData);
  updateTaskField(task, 'dummy', null);
} else {
  // creas nueva tarea en el array adecuado
  if (newData.parentId) {
    const parent = findTaskById(newData.parentId);
    parent?.subtasks.push(task);
  } else {
    taskList.push(task);
  }
  updateTaskField(task, 'dummy', null);
}

    
    // si ha cambiado de padre, hay que moverlo
    if (newData.parentId !== task.parentId) {
      removeTaskByPath(path);
      const newParent = findTaskById(newData.parentId);
      if (newParent) {
        newParent.subtasks.push(task);
      } else {
        taskList.push(task);
      }
    }

    Object.assign(task, newData);
    updateTaskField(task, 'dummy', null);
    renderTasks();
    panel.remove();
    refreshTaskOptions();
  };

  panel.querySelector('#cancel-task-edits').onclick = () => {
    panel.remove();
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

function getMarker(task) {
      const today = new Date();
      const deadline = task.deadline ? new Date(task.deadline) : null;
    
      if (!deadline) {
        if (task.priority === 'Baja') return '🟣';
        return '🔵';
      }
    
      const diffTime = deadline - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
      if (diffDays < 0) return '⚫️'; // Fecha pasada
      if (diffDays === 0 && task.priority === 'Alta') return '🔴';
      if (diffDays === 0) return '🟠';
      if (diffDays <= 3 && task.priority === 'Alta') return '🟠';
      if (diffDays <= 3) return '🟡';
      if (diffDays <= 7 && task.priority === 'Alta') return '🟡';
      if (diffDays <= 7) return '🟢';
      if (diffDays <= 30 && task.priority === 'Alta') return '🟢';
      if (diffDays <= 30) return '🔵';
      if (task.priority === 'Baja') return '🟣';
    
      return '🔵';
      }

function updateTaskField(task, field, value) {
  if (field !== 'dummy') task[field] = value;
  if (collRef) {
    collRef.doc(task.id.toString()).set(task);
  }
}


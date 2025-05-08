// Taskas – gestor con Google login y Firestore
// --------------------------------------------

// 0) Datos en memoria y referencias
const taskList      = [];
const taskContainer = document.getElementById('task-container');

// 1) Firebase
const auth     = firebase.auth();
const db       = firebase.firestore();
const provider = new firebase.auth.GoogleAuthProvider();
let collRef = null;

// 2) Botones de login/logout
const loginBtn  = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
loginBtn.onclick  = () => auth.signInWithPopup(provider);
logoutBtn.onclick = () => auth.signOut();

// 3) Estado de autenticación
auth.onAuthStateChanged(user => {
  if (!user) {
    // Sin usuario → mostramos botón login y limpiamos lista
    logoutBtn.classList.add('hidden');
    loginBtn.classList.remove('hidden');
    taskList.length = 0;
    renderTasks();
    return;
  }
  // Usuario OK → ocultamos login y mostramos logout
  loginBtn.classList.add('hidden');
  logoutBtn.classList.remove('hidden');
  // Referencia Firestore y snapshot
  collRef = db.collection('users').doc(user.uid).collection('tasks');
  collRef.onSnapshot(snap => {
    taskList.length = 0;
    snap.forEach(doc => taskList.push({ id: doc.id, ...doc.data() }));
    renderTasks();
  });
});

// 4) Al cargar pagina
window.addEventListener('DOMContentLoaded', () => {
  renderTasks();
  // Botón nueva tarea
  const newBtn = document.getElementById('new-task-btn');
  newBtn.onclick = () => showTaskModal({ mode: 'create' });
});

// 5) Mostrar/editar en modal
function showTaskModal({ mode = 'edit', task = null, path = null }) {
  document.getElementById('task-modal')?.remove();
  const isNew = mode === 'create';
  if (!task) {
    task = {
      id: Date.now(), title:'', deadline:'', time:'', duration:30,
      priority:'Media', notes:'', completed:false,
      subtasks:[], parentId:null, dependsOn:[]
    };
  }

  const modal = document.createElement('div');
  modal.id = 'task-modal';
  modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/40';

  const panel = document.createElement('div');
  panel.className = 'bg-white w-full max-w-xl p-6 rounded shadow-lg';

  const options = flattenTasks(taskList)
    .filter(({ task:t }) => t.id !== task.id)
    .map(({ task:t, level }) => {
      const indent = '‒'.repeat(level);
      return `<option value="${t.id}" ${t.id===task.parentId?'selected':''}>${indent} ${t.title}</option>`;
    }).join('');

  const deps = flattenTasks(taskList)
    .filter(({ task:t }) => t.id !== task.id)
    .map(({ task:t }) => {
      const sel = task.dependsOn.includes(t.id) ? 'bg-brand-600 text-white' : '';
      return `<button data-depid="${t.id}" class="px-3 py-1 rounded-full border ${sel}">${t.title}</button>`;
    }).join('');

  panel.innerHTML = `
    <h2 class="text-2xl mb-4">${isNew?'➕ Nueva Tarea':`Editar “${task.title}”`}</h2>
    <input id="edit-title" class="w-full p-2 border rounded mb-2" placeholder="Título..." value="${task.title}" />
    <div class="flex gap-2 mb-2">
      <input id="edit-deadline" type="date" value="${task.deadline||''}" class="flex-1 p-2 border rounded" />
      <input id="edit-time"     type="time"  value="${task.time||''}"     class="flex-1 p-2 border rounded" />
      <input id="edit-duration" type="number" value="${task.duration}"    class="flex-1 p-2 border rounded" min="5" step="5" />
    </div>
    <select id="edit-priority" class="w-full p-2 border rounded mb-2">
      <option value="Alta" ${task.priority==='Alta'?'selected':''}>Alta</option>
      <option value="Media" ${task.priority==='Media'?'selected':''}>Media</option>
      <option value="Baja" ${task.priority==='Baja'?'selected':''}>Baja</option>
    </select>
    <select id="edit-parent" class="w-full p-2 border rounded mb-2">
      <option value="">— raíz —</option>${options}
    </select>
    <div class="mb-2"><span>Dependencias:</span><div id="edit-deps" class="flex flex-wrap gap-2 mt-1">${deps}</div></div>
    <label class="flex items-center mb-2">
      <input id="edit-completed" type="checkbox" class="mr-2" ${task.completed?'checked':''} /> Completada
    </label>
    <textarea id="edit-notes" rows="3" class="w-full p-2 border rounded mb-4" placeholder="Notas...">${task.notes}</textarea>
    <div class="flex justify-end gap-2">
      <button id="cancel-task-edits" class="px-4 py-2 border rounded">✖ Cancelar</button>
      <button id="save-task-edits"   class="px-4 py-2 bg-brand-600 text-white rounded">💾 Guardar</button>
    </div>
  `;

  modal.append(panel);
  document.body.append(modal);

  // Toggle deps
  panel.querySelectorAll('#edit-deps button').forEach(btn => {
    btn.onclick = () => {
      const id = +btn.dataset.depid;
      task.dependsOn = task.dependsOn.includes(id)
        ? task.dependsOn.filter(d=>d!==id)
        : [...task.dependsOn, id];
      modal.remove();
      showTaskModal({mode,task,path});
    };
  });

  panel.querySelector('#cancel-task-edits').onclick = () => modal.remove();
  panel.querySelector('#save-task-edits').onclick = () => {
    const newData = {
      title:     panel.querySelector('#edit-title').value.trim(),
      deadline:  panel.querySelector('#edit-deadline').value||null,
      time:      panel.querySelector('#edit-time').value||null,
      duration:  +panel.querySelector('#edit-duration').value||30,
      priority:  panel.querySelector('#edit-priority').value,
      notes:     panel.querySelector('#edit-notes').value.trim(),
      completed: panel.querySelector('#edit-completed').checked,
      parentId:  panel.querySelector('#edit-parent').value? +panel.querySelector('#edit-parent').value : null,
      dependsOn: task.dependsOn
    };
    // Si edición, mueve subtarea si cambia parent
    if (mode==='edit' && newData.parentId!==task.parentId) {
      removeTaskByPath(path);
      const np = findTaskById(newData.parentId);
      np ? np.subtasks.push(task) : taskList.push(task);
    }
    Object.assign(task, newData);
    // Si es nuevo y no edit, ya está en memoria
    if (mode==='create') {
      taskList.push(task);
    }
    updateTaskField(task);
    modal.remove();
    renderTasks();
  };
}

// 6) Dibuja la tabla
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
    <thead class="bg-gray-200">
      <tr>
        <th>●</th><th>Título</th><th>Prioridad</th>
        <th>Fecha</th><th>Hora</th><th>Duración</th><th>Notas</th>
      </tr>
    </thead><tbody></tbody>
  `;
  const tbody = table.querySelector('tbody');
  flat.forEach(({task,level,path})=>{
    const row = document.createElement('tr');
    row.className = 'hover:bg-gray-50 cursor-pointer';
    row.innerHTML = `
      <td>${getMarker(task)}</td>
      <td style="padding-left:${level*1.5}rem">${task.title}</td>
      <td>${task.priority}</td>
      <td>${task.deadline||'—'}</td>
      <td>${task.time||'—'}</td>
      <td>${task.duration}m</td>
      <td>${task.notes? '✏️':''}</td>
    `;
    row.onclick = () => showTaskModal({mode:'edit',task,path});
    tbody.append(row);
  });
  taskContainer.append(table);
}

// Resto de helpers: flattenTasks, getMarker, removeTaskByPath, findTaskById, updateTaskField...
// (idénticos a tu versión anterior)

// script.js (reestructurado con modelo plano usando parentId)

// -------- 1. Inicialización de Firebase --------
function initFirebase(config) {
  firebase.initializeApp(config);
  return {
    auth: firebase.auth(),
    db: firebase.firestore(),
    provider: new firebase.auth.GoogleAuthProvider()
  };
}


// -------- 2. Módulo de Tareas --------
const TaskModule = {
  list: [],

  add(task) {
    this.list.push(task);
  },

  clear() {
    this.list.length = 0;
  },

  getById(id) {
    return this.list.find(t => t.id.toString() === id.toString());
  },

  flatten() {
    const out = [];
    function rec(parentId = null, level = 0, path = []) {
      TaskModule.list
        .filter(t => (t.parentId ?? null) == parentId)
        .sort((a, b) => a.deadline.localeCompare(b.deadline))
        .forEach((t, i) => {
          const currentPath = [...path, i];
          out.push({ task: t, level, path: currentPath });
          rec(t.id, level + 1, currentPath);
        });
    }
    rec();
    return out;
  }
};


// -------- 3. Render de tareas --------
function renderTasks(ui) {
  const { taskContainer } = ui;
  taskContainer.innerHTML = '';
  const flat = TaskModule.flatten();
  if (!flat.length) {
    taskContainer.innerHTML = '<p class="text-gray-500">No hay tareas.</p>';
    return;
  }

  const table = document.createElement('table');
  table.className = 'w-full table-auto bg-white rounded shadow';
  table.innerHTML = `
    <thead class="bg-gray-200">
      <tr>
        <th class="p-2">Título</th>
        <th class="p-2">Prioridad</th>
        <th class="p-2">Fecha</th>
        <th class="p-2">Hora</th>
        <th class="p-2">Duración</th>
        <th class="p-2">Acciones</th>
      </tr>
    </thead>
    <tbody class="divide-y"></tbody>
  `;

  const tbody = table.querySelector('tbody');

  flat.forEach(({ task, level }) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td class="p-2" style="padding-left:${level * 1.5}rem">${task.title}</td>
      <td class="p-2">${task.priority}</td>
      <td class="p-2">${task.deadline || '—'}</td>
      <td class="p-2">${task.time || '—'}</td>
      <td class="p-2">${task.duration} min</td>
      <td class="p-2">
        <button data-id="${task.id}" class="edit-btn text-blue-500">✏️</button>
        <button data-id="${task.id}" class="delete-btn text-red-500">❌</button>
      </td>
    `;

    row.querySelector('.edit-btn').onclick = () => toggleSubtaskPanel(task.id, ui);
    row.querySelector('.delete-btn').onclick = () => deleteTask(task.id, ui);

    tbody.appendChild(row);
  });

  taskContainer.appendChild(table);
  updateFormOptions(ui);
}


// -------- 4. Subtarea panel --------
function toggleSubtaskPanel(id, ui) {
  const task = TaskModule.getById(id);
  document.getElementById('subpanel')?.remove();

  const panel = document.createElement('div');
  panel.id = 'subpanel';
  panel.className = 'bg-white p-4 mb-4 border rounded shadow';

  panel.innerHTML = `
    <h2 class="font-semibold mb-3">Editar tarea</h2>

    <!-- título -->
    <input  id="edit-title"   class="w-full p-2 border rounded mb-2"
            value="${task.title}"          placeholder="Título">

    <!-- fecha y hora -->
    <div class="flex gap-2 mb-2">
      <input  id="edit-date"   type="date"
              class="flex-1 p-2 border rounded"
              value="${task.deadline || ''}">
      <input  id="edit-time"   type="time"
              class="flex-1 p-2 border rounded"
              value="${task.time || ''}">
    </div>

    <!-- duración y prioridad -->
    <div class="flex gap-2 mb-2">
      <input  id="edit-duration" type="number" min="5" step="5"
              class="flex-1 p-2 border rounded"
              value="${task.duration}">
      <select id="edit-priority" class="flex-1 p-2 border rounded">
        <option ${task.priority==='Alta'    ?'selected':''}>Alta</option>
        <option ${task.priority==='Media'   ?'selected':''}>Media</option>
        <option ${task.priority==='Baja'    ?'selected':''}>Baja</option>
      </select>
    </div>

    <!-- notas -->
    <textarea id="edit-notes" rows="3"
              class="w-full p-2 border rounded mb-2"
              placeholder="Notas">${task.notes||''}</textarea>

    <!-- completada -->
    <label class="inline-flex items-center gap-2 mb-4">
      <input id="edit-completed" type="checkbox"
             class="h-4 w-4" ${task.completed?'checked':''}>
      <span class="select-none">Marcar como completada</span>
    </label><br>

    <button id="save-edit"
            class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">
      💾 Guardar cambios
    </button>
  `;

  panel.querySelector('#save-edit').onclick = () => {
    // 1· Actualizar objeto
    task.title     = panel.querySelector('#edit-title').value.trim();
    task.deadline  = panel.querySelector('#edit-date').value;
    task.time      = panel.querySelector('#edit-time').value;
    task.duration  = +panel.querySelector('#edit-duration').value;
    task.priority  = panel.querySelector('#edit-priority').value;
    task.notes     = panel.querySelector('#edit-notes').value.trim();
    task.completed = panel.querySelector('#edit-completed').checked;

    // 2· Persistir y refrescar UI
    ui.dataModule.save(TaskModule.list);
    renderTasks(ui);

    // 3· Cerrar panel
    panel.remove();
  };

  ui.taskContainer.prepend(panel);
}


// -------- 5. Borrar tarea --------
function deleteTask(id, ui) {
  TaskModule.list = TaskModule.list.filter(t => t.id !== id && t.parentId !== id);
  ui.dataModule.save(TaskModule.list);
  ui.dataModule.collRef.doc(id.toString()).delete();
  renderTasks(ui);
}


// -------- 6. Configuración del menú y envío de formulario --------
function setupMenu(ui) {
  ui.newTaskBtn.onclick = () => ui.popup.classList.toggle('hidden');
}


// -------- 7. Actualizar opciones de select --------
function updateFormOptions(ui) {
  const parentSelect = ui.form.elements['parent'];
  parentSelect.innerHTML = '<option value="">Sin tarea padre</option>';
  TaskModule.list.forEach(task => {
    const opt = document.createElement('option');
    opt.value = task.id;
    opt.textContent = task.title;
    parentSelect.appendChild(opt);
  });
}


// -------- 8. Valores por defecto --------
function setDefaultFormValues(formEl) {
  const t = new Date();
  t.setDate(t.getDate() + 1); // mañana

  formEl.elements['title'].value = '';
  formEl.elements['deadline'].value = t.toISOString().split('T')[0];
  formEl.elements['time'].value = '17:00';
  formEl.elements['duration'].value = '30';
  formEl.elements['priority'].value = 'Media';
  formEl.elements['notes'].value = '';
  formEl.elements['parent'].value = '';
}


// -------- 9. Punto de entrada --------
(function main() {
  const fb = initFirebase(firebaseConfig);
  const ui = {
    newTaskBtn: document.getElementById('new-task-btn'),
    popup: document.getElementById('task-popup'),
    form: document.getElementById('task-form'),
    taskContainer: document.getElementById('task-container'),
    loginBtn: document.getElementById('loginBtn'),
    logoutBtn: document.getElementById('logoutBtn'),
    dataModule: null
  };

  fb.auth.onAuthStateChanged(user => {
    if (user) {
      ui.dataModule = {
        collRef: fb.db.collection('users').doc(user.uid).collection('tasks'),
        save: tasks => tasks.forEach(t => ui.dataModule.collRef.doc(t.id.toString()).set(t)),
        subscribe: listener => ui.dataModule.collRef.onSnapshot(listener)
      };

      ui.dataModule.subscribe(snap => {
        TaskModule.clear();
        snap.forEach(doc => TaskModule.add({ id: +doc.id, ...doc.data() }));
        renderTasks(ui);
      });

      ui.loginBtn.classList.add('hidden');
      ui.logoutBtn.classList.remove('hidden');
      setDefaultFormValues(ui.form);
    } else {
      TaskModule.clear();
      renderTasks(ui);
      ui.dataModule = null;
      ui.logoutBtn.classList.add('hidden');
      ui.loginBtn.classList.remove('hidden');
    }
  });

  setupMenu(ui);

  ui.form.onsubmit = e => {
    e.preventDefault();
    const f = ui.form.elements;
    const task = {
      id: Date.now(),
      title: f['title'].value,
      deadline: f['deadline'].value,
      time: f['time'].value,
      duration: f['duration'].value,
      priority: f['priority'].value,
      notes: f['notes'].value,
      parentId: f['parent'].value === '' ? null : f['parent'].value
    };
    TaskModule.add(task);
    ui.dataModule.save(TaskModule.list);
    ui.form.reset();
    setDefaultFormValues(ui.form);
    renderTasks(ui);
    ui.popup.classList.add('hidden');
  };

  window.addEventListener('DOMContentLoaded', () => {
    setDefaultFormValues(ui.form);
  });
})();

// script.js - Refactor completo para TaskAs

// 1. Valores por defecto del formulario
function setDefaultFormValues() {
  const titleInput   = document.getElementById('title');
  const dateInput    = document.getElementById('deadline');
  const timeInput    = document.getElementById('time');
  const durationInput= document.getElementById('duration');

  titleInput.value    = 'Taskeo';
  const t             = new Date();
  t.setDate(t.getDate() + 1);
  dateInput.value     = t.toISOString().split('T')[0];
  timeInput.value     = '17:00';
  durationInput.value = '30';
}

// 2. Inicialización de Firebase
function initFirebase(config) {
  firebase.initializeApp(config);
  return {
    auth: firebase.auth(),
    db: firebase.firestore(),
    provider: new firebase.auth.GoogleAuthProvider()
  };
}

// 3. Módulo de autenticación
function setupAuth(fb, ui, onLogin, onLogout) {
  const { auth, provider } = fb;
  ui.loginBtn.onclick  = () => auth.signInWithPopup(provider);
  ui.logoutBtn.onclick = () => auth.signOut();

  auth.onAuthStateChanged(user => {
    if (user) {
      onLogin(user);
    } else {
      onLogout();
    }
  });
}

// 4. Módulo de datos (Firestore)
function createDataModule(db, uid) {
  const collRef = db.collection('users').doc(uid).collection('tasks');
  return {
    subscribe: listener => collRef.onSnapshot(listener),
    save:      tasks => tasks.forEach(t => collRef.doc(t.id.toString()).set(t))
  };
}

// 5. Módulo de tareas
const TaskModule = {
  list: [],
  add(task) {
    this.list.push(task);
  },
  clear() {
    this.list.length = 0;
  },
  flatten() {
    function recurse(arr, lvl=0, path=[]) {
      return arr.reduce((acc, t, i) => {
        acc.push({ task: t, level: lvl, path: [...path, i] });
        if (t.subtasks && t.subtasks.length) {
          acc.push(...recurse(t.subtasks, lvl+1, [...path, i]));
        }
        return acc;
      }, []);
    }
    return recurse(this.list);
  },
  getByPath(path) {
    return path.reduce((cur, idx) => cur.subtasks[idx], { subtasks: this.list });
  }
};

// 6. UI: render y panel de subtareas
function renderTasks(ui) {
  const container = ui.taskContainer;
  container.innerHTML = '';
  const flat = TaskModule.flatten();
  if (!flat.length) {
    container.innerHTML = '<p class="text-gray-500">No hay tareas aún.</p>';
    return;
  }
  // Crear tabla con columna extra "Acciones"
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
        <th class="p-2">Acciones</th>
      </tr>
    </thead>
    <tbody class="divide-y"></tbody>`;
  const tbody = table.querySelector('tbody');

  flat.forEach(({ task, level, path }) => {
    const row = document.createElement('tr');
    row.className = 'cursor-pointer hover:bg-gray-50';

    // Interpretar icono de prioridad
    const priIcon = PRIORITY_ICON[task.priority] || '⚪';

    // Convertir path a string "0-2-1" para dataset
    const pathStr = path.join('-');

    row.innerHTML = `
      <td class="p-2 font-semibold" style="padding-left:${level*1.5}rem">
        ${task.title}
      </td>
      <td class="p-2">${priIcon} ${task.priority}</td>
      <td class="p-2">${task.deadline || '—'}</td>
      <td class="p-2">${task.time || '—'}</td>
      <td class="p-2">${task.duration} min</td>
      <td class="p-2">${task.subtasks.length}</td>
      <td class="p-2 text-center">${task.notes ? '✏️' : '—'}</td>
      <td class="p-2 text-center">
        <button data-path="${pathStr}" class="delete-btn">❌</button>
      </td>`;

    // Inline-edit título (igual que antes)
    const titleCell = row.firstElementChild;
    titleCell.contentEditable = true;
    titleCell.addEventListener('blur', () => {
      const newTitle = titleCell.textContent.trim();
      if (newTitle && newTitle !== task.title) {
        task.title = newTitle;
        ui.dataModule && ui.dataModule.save(TaskModule.list);
        renderTasks(ui);
      }
    });

    // Click en fila abre panel subtareas
    row.addEventListener('click', ev => {
      if (ev.target !== titleCell && !ev.target.classList.contains('delete-btn')) {
        toggleSubtaskPanel(path, ui);
      }
    });

    // Botón borrar
    row.querySelector('.delete-btn').addEventListener('click', ev => {
      ev.stopPropagation();            // que no abra subtareas
      const p = ev.currentTarget.dataset.path
                  .split('-')
                  .map(n => parseInt(n, 10));
      deleteTaskByPath(p, ui);
    });

    tbody.appendChild(row);
  });

  container.appendChild(table);
}

// Panel

function toggleSubtaskPanel(path, ui) {
  const task = TaskModule.getByPath(path);
  document.getElementById('subpanel')?.remove();

  const panel = document.createElement('div');
  panel.id = 'subpanel';
  panel.className = 'bg-white p-4 mb-4 border rounded shadow';
  panel.innerHTML = `
    <h2 class="font-semibold mb-2">Nota de “${task.title}”</h2>
    <textarea id="note-edit" rows="3" class="w-full p-2 border rounded mb-2">${task.notes}</textarea>
    <button id="save-note" class="bg-blue-500 text-white px-4 py-2 rounded mb-4">Guardar nota</button>
    <h2 class="font-semibold mb-2">Subtareas</h2>
    <ul id="sub-list" class="mb-4 list-disc ml-6"></ul>
    <form id="sub-form" class="space-y-2">
      <input name="title" placeholder="Título subtarea" class="w-full p-2 border rounded" required>
      <input name="deadline" type="date" class="w-full p-2 border rounded">
      <input name="time" type="time" class="w-full p-2 border rounded">
      <input name="duration" type="number" value="30" min="5" step="5" class="w-full p-2 border rounded" placeholder="Duración (min)">
      <select name="priority" class="w-full p-2 border rounded">
        <option value="Alta">Alta</option>
        <option value="Media" selected>Media</option>
        <option value="Baja">Baja</option>
      </select>
      <textarea name="notes" rows="2" class="w-full p-2 border rounded" placeholder="Notas subtarea"></textarea>
      <button class="bg-green-500 text-white px-4 py-2 rounded">Agregar subtarea</button>
    </form>`;

  const ul = panel.querySelector('#sub-list');
  task.subtasks.forEach(st => {
    const li = document.createElement('li'); li.textContent = st.title; ul.append(li);
  });

  panel.querySelector('#save-note').onclick = () => {
    task.notes = panel.querySelector('#note-edit').value.trim();
    ui.dataModule && ui.dataModule.save(TaskModule.list);
  };

  panel.querySelector('#sub-form').onsubmit = e => {
    e.preventDefault();
    const d = new FormData(e.target);
    task.subtasks.push({
      id: Date.now(),
      title: d.get('title').trim(),
      deadline: d.get('deadline'),
      time: d.get('time'),
      duration: d.get('duration') || 30,
      priority: d.get('priority'),
      notes: d.get('notes').trim(),
      completed: false,
      subtasks: [],
      timeSpent: 0
    });
    ui.dataModule && ui.dataModule.save(TaskModule.list);
    renderTasks(ui);
  };

  ui.taskContainer.append(panel);
}

// 7. Punto de entrada
(function main() {
  const firebaseConfig = {
    apiKey: "AIzaSyA-EY3-EISZdoThqVepYYA9rlCI30Qt8ZE",
    authDomain: "taska-65c33.firebaseapp.com",
    projectId: "taska-65c33",
    storageBucket: "taska-65c33.appspot.com",
    messagingSenderId: "287205600078",
    appId: "1:287205600078:web:25b211ff3764cbfe304c1f",
    measurementId: "G-RM9DCQ136H"
  };

  const fb = initFirebase(firebaseConfig);
  const ui = {
    loginBtn:      document.getElementById('loginBtn'),
    logoutBtn:     document.getElementById('logoutBtn'),
    form:          document.getElementById('task-form'),
    taskContainer: document.getElementById('task-container'),
    dataModule:    null
  };

  setupAuth(fb, ui,
    user => {
      ui.dataModule = createDataModule(fb.db, user.uid);
      ui.dataModule.subscribe(snapshot => {
        TaskModule.clear();
        snapshot.forEach(doc => TaskModule.add({ id: doc.id, ...doc.data() }));
        renderTasks(ui);
      });
      ui.loginBtn.classList.add('hidden');
      ui.logoutBtn.classList.remove('hidden');
      setDefaultFormValues();
    },
    () => {
      ui.logoutBtn.classList.add('hidden');
      ui.loginBtn.classList.remove('hidden');
      TaskModule.clear();
      renderTasks(ui);
      ui.dataModule = null;
    }
  );

  // Inicializa UI y formulario
  window.addEventListener('DOMContentLoaded', () => {
    setDefaultFormValues();
    renderTasks(ui);
  });

  ui.form.addEventListener('submit', e => {
    e.preventDefault();
    const f = ui.form.elements;
    const task = {
      id: Date.now(),
      title:    f['title'].value.trim(),
      deadline: f['deadline'].value,
      time:     f['time'].value,
      priority: f['priority'].value,
      duration: f['duration'].value || 30,
      notes:    f['notes'].value.trim(),
      completed:false,
      timeSpent:0,
      subtasks: []
    };
    TaskModule.add(task);
    ui.dataModule && ui.dataModule.save(TaskModule.list);
    ui.form.reset();
    setDefaultFormValues();
    renderTasks(ui);
  });
})();

// BORRADO
function deleteTaskByPath(path, ui) {
  // Si es una tarea de primer nivel
  if (path.length === 1) {
    TaskModule.list.splice(path[0], 1);
    } 
  else {
    // Obtener array padre y eliminar índice
    const parent = TaskModule.getByPath(path.slice(0, -1));
    parent.subtasks.splice(path[path.length - 1], 1);
    }
  // Guardar cambios y re-renderizar
  ui.dataModule && ui.dataModule.save(TaskModule.list);
  renderTasks(ui);
}


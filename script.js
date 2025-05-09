// script.js - Refactor completo para TaskAs

// 1. Valores por defecto del formulario
function setDefaultFormValues(formEl) {
  formEl.elements['title'].value    = 'Taskeo';
  const t = new Date(); t.setDate(t.getDate() + 1);
  formEl.elements['deadline'].value = t.toISOString().split('T')[0];
  formEl.elements['time'].value     = '17:00';
  formEl.elements['duration'].value = '30';
  // Reiniciar parent y dependencias
  formEl.elements['parent'].value = '';
  formEl.querySelector('#dep-chips').innerHTML = '';
  formEl._selectedDeps = [];
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
              } 
          else {
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
              const out = [];
              function rec(arr, lvl=0, path=[]) {
                    arr.forEach((t,i)=>{
                        out.push({task:t, level:lvl, path:[...path,i]});
                        if(t.subtasks) rec(t.subtasks, lvl+1, [...path,i]);
                        });
                    }
              rec(this.list);
              return out;
              },
        getByPath(path) {
                return path.reduce((cur, idx) => cur.subtasks[idx], { subtasks: this.list });
                }
        };

// 6. UI: render y panel de subtareas
const PRIORITY_ICON = {
  'Alta':  '🔴',  // rojo
  'Media': '🟠',  // naranja
  'Baja':  '🟢'   // verde
  };

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


// 6. UI: manejo de menú emergente y formulario
function setupMenu(ui) {
  const popup = document.getElementById('task-popup');
  ui.newTaskBtn.onclick = () => popup.classList.toggle('hidden');
  // dependencias: seleccionar tarea padre y dependencias
  ui.form.elements['parent'].onchange = e => ui._currentParent = e.target.value;
  // chips de dependencias
  const depList = ui.form.elements['dependencies'];
  depList.onchange = e => {
    const sel = Array.from(e.target.selectedOptions).map(o=>o.value);
    ui._selectedDeps = sel;
    renderDepChips(ui);
  };
}

function renderDepChips(ui) {
  const container = ui.depChips;
  container.innerHTML = '';
  ui._selectedDeps.forEach(id => {
    const t = TaskModule.list.find(ts=>ts.id.toString()===id);
    if(!t) return;
    const chip = document.createElement('span');
    chip.className = 'inline-flex items-center bg-gray-200 rounded-full px-2 py-1 mr-2';
    chip.textContent = t.title;
    const x = document.createElement('button'); x.textContent='✖'; x.className='ml-1';
    x.onclick = ()=>{
      ui._selectedDeps = ui._selectedDeps.filter(d=>d!==id);
      Array.from(ui.form.elements['dependencies'].options)
           .find(o=>o.value===id).selected=false;
      renderDepChips(ui);
    };
    chip.append(x);
    container.append(chip);
  });
}

// 7. Renderizar tareas con botón ➕ para subtareas
function renderTasks(ui) {
  const cont = ui.taskContainer; cont.innerHTML='';
  const flat = TaskModule.flatten();
  if(!flat.length){ cont.innerHTML='<p class="text-gray-500">No hay tareas aún.</p>'; return; }
  const table = document.createElement('table'); table.className='w-full';
  const thead = `<tr><th>Título</th><th>Prioridad</th><th>Depende de</th><th>Acciones</th></tr>`;
  table.innerHTML = `<thead>${thead}</thead><tbody></tbody>`;
  flat.forEach(({task,level,path})=>{
    const row = document.createElement('tr');
    const deps = task.dependencies?.map(id=>{
      const t=TaskModule.list.find(x=>x.id===parseInt(id)); return t? t.title:'?';
    }).join(', ')||'—';
    row.innerHTML = `
      <td style="padding-left:${level*1.5}rem">${task.title}</td>
      <td>${task.priority}</td>
      <td>${deps}</td>
      <td><button data-path="${path.join('-')}" class="add-sub">➕</button></td>`;
    row.querySelector('.add-sub').onclick = e=>{
      e.stopPropagation(); ui._parentForSub = path; document.getElementById('task-popup').classList.remove('hidden');
      ui.form.elements['parent'].value = path.join('-');
    };
    table.querySelector('tbody').append(row);
  });
  cont.append(table);
}

// 8. Integración final en main
(function main(){
  const fbConfig = { /* ... */ };
  const fb = initFirebase(fbConfig);
  const ui = {
    newTaskBtn: document.getElementById('new-task-btn'),
    popup:      document.getElementById('task-popup'),
    form:       document.getElementById('task-form'),
    taskContainer: document.getElementById('task-container'),
    depChips:   document.getElementById('dep-chips')
  };
  setupAuth(fb, ui,
    user=>{
      ui.dataModule = createDataModule(fb.db,user.uid);
      ui.dataModule.subscribe(snap=>{ TaskModule.clear(); snap.forEach(d=>TaskModule.add({id:parseInt(d.id),...d.data()})); renderTasks(ui); });
    }, _=>{ TaskModule.clear(); renderTasks(ui); }
  );
  setupMenu(ui);
  ui.form.addEventListener('submit', e=>{
    e.preventDefault();
    const f=e.target.elements;
    const parentPath = f['parent'].value.split('-').map(x=>parseInt(x));
    const parent = parentPath[0]!=NaN? TaskModule.getByPath(parentPath): null;
    const task = { id:Date.now(), title:f['title'].value.trim(), deadline:f['deadline'].value, time:f['time'].value, priority:f['priority'].value, duration:f['duration'].value, notes:f['notes'].value.trim(), completed:false, timeSpent:0, subtasks:[], dependencies: ui._selectedDeps };
    if(parentPath.length) parent.subtasks.push(task);
    else TaskModule.add(task);
    ui.dataModule.save(TaskModule.list);
    ui.form.reset(); setDefaultFormValues(ui.form);
    renderTasks(ui);
    ui.popup.classList.add('hidden');
  });
  // Inicial
  window.dispatchEvent(new Event('DOMContentLoaded'));
})();


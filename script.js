// script.js 

// 1. Valores por defecto del formulario
function setDefaultFormValues(formEl) {
    formEl.elements['title'].value    = '';
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
            collRef,
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
  'Baja':  '🟢',   // verde
  'Completado':  '⚫️',  
  'Retrasada':  '🚩' 
  };

function renderTasks(ui) {
  const { taskContainer, dataModule } = ui;
  taskContainer.innerHTML = '';
  const flat = TaskModule.flatten();
  if (!flat.length) {
        taskContainer.innerHTML = '<p class="text-gray-500">No hay tareas.</p>';
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
        <th class="p-2">Dependencias</th>
        <th class="p-2">Subtareas</th>
        <th class="p-2">Notas</th>
        <th class="p-2">Acciones</th>
        </tr>
      </thead>
    <tbody class="divide-y"></tbody>`;
  
  const tbody = table.querySelector('tbody');

  flat.forEach(({ task, level, path }) => {
    const pathStr = path.join('-');
    const priIcon = PRIORITY_ICON[task.priority] || '⚪';
    const deps = (task.dependencies || [])
            .map(id => {
                  const t = TaskModule.list.find(x => x.id.toString() === id.toString());
                  return t ? t.title : '—';
                  })
            .join(', ') || '—';
    const subCount = task.subtasks ? task.subtasks.length : 0;
    const row = document.createElement('tr');
    row.className = 'cursor-pointer hover:bg-gray-50';
    row.innerHTML = `
          <td class="p-2 font-semibold" style="padding-left:${level*1.5}rem">
                ${task.title}
                </td>
          <td class="p-2">${priIcon} ${task.priority}</td>
          <td class="p-2">${task.deadline || '—'}</td>
          <td class="p-2">${task.time || '—'}</td>
          <td class="p-2">${task.duration} min</td>
          <td class="p-2">${deps}</td>
          <td class="p-2">${subCount}</td>
          <td class="p-2 text-center">${task.notes ? '✏️' : '—'}</td>
          <td class="p-2 text-center">
            <button data-path="${pathStr}" class="add-sub mr-2">➕</button>
            <button data-path="${pathStr}" class="delete-btn">❌</button>
            </td>`;

    // Inline-edit título
    const titleCell = row.firstElementChild;
    titleCell.contentEditable = true;
    titleCell.addEventListener('blur', () => {
          const newTitle = titleCell.textContent.trim();
          if (newTitle && newTitle !== task.title) {
              task.title = newTitle;
              ui.dataModule && ui.dataModule.save(TaskModule.list);
              dataModule && dataModule.save(TaskModule.list);
              renderTasks(ui);
              }
          });

    // ➕ subtarea
    row.querySelector('.add-sub').addEventListener('click', ev => {
        ev.stopPropagation();
        ui._parentForSub = path;
        ui.popup.classList.remove('hidden');
        ui.form.elements['parent'].value = pathStr;
        });


    // Botón borrar
    row.querySelector('.delete-btn').addEventListener('click', ev => {
          ev.stopPropagation();            
          //-- que no abra subtareas
          const p = ev.currentTarget.dataset.path
                      .split('-')
                      .map(n=>+n);
          deleteTaskByPath(p, ui);
          });

    // click en resto de fila abre panel de nota/subtareas
    row.addEventListener('click', ev => {
          if (!ev.target.closest('button')) toggleSubtaskPanel(path, ui);
          });
    
    tbody.appendChild(row);
    });

  taskContainer.appendChild(table);
  updateFormOptions(ui);
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
        <option value="Completada">Completada</option>
        <option value="Retrasada">Retrasada</option>
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

// BORRADO
function deleteTaskByPath(path, ui) {
      let deletedTaskId = null;
      if (path.length === 1) {
            // Eliminar del array raíz
            const deleted = TaskModule.list.splice(path[0], 1)[0];
            deletedTaskId = deleted.id;
            } 
      else {
            // Eliminar subtarea → solo local (no tiene doc en Firestore)
            const parent = TaskModule.getByPath(path.slice(0, -1));
            parent.subtasks.splice(path[path.length - 1], 1);
            }
    
      // Guardar cambios
      ui.dataModule && ui.dataModule.save(TaskModule.list);
    
      // Borrar documento en Firestore si es tarea raíz
      if (deletedTaskId && ui.dataModule && ui.dataModule.collRef) {
          ui.dataModule.collRef
              .doc(deletedTaskId.toString())
              .delete()
              .then(() => console.log(`🔥 Borrada tarea ${deletedTaskId} de Firestore`))
              .catch(err => console.error('Error al borrar:', err));
            }
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



// Punto de entrada
(function main() {
      const fb = initFirebase(firebaseConfig);
      const ui = {
          newTaskBtn: document.getElementById('new-task-btn'),
          popup:      document.getElementById('task-popup'),
          form:       document.getElementById('task-form'),
          taskContainer: document.getElementById('task-container'),
          depChips:   document.getElementById('dep-chips'),
          dataModule: null,
          _selectedDeps: [],
          _parentForSub: null,
          loginBtn:  document.getElementById('loginBtn'),
          logoutBtn: document.getElementById('logoutBtn'),
          };

        setupAuth(fb, ui,
          user => {
            ui.dataModule = createDataModule(fb.db, user.uid);
            ui.dataModule.subscribe(snap => {
                TaskModule.clear();
                snap.forEach(doc => TaskModule.add({ id: +doc.id, ...doc.data() }));
                renderTasks(ui);
                });
            ui.loginBtn.classList.add('hidden');
            ui.logoutBtn.classList.remove('hidden');
            setDefaultFormValues(ui.form);
          },
          () => {
            TaskModule.clear();
            renderTasks(ui);
            ui.dataModule = null;
            ui.logoutBtn.classList.add('hidden');
            ui.loginBtn.classList.remove('hidden');
          }
        );
      
        // 1) Menú emergente y dependencias
        setupMenu(ui);
      
        // 2) Submit único para crear Task o SubTask
        ui.form.addEventListener('submit', e => {
          e.preventDefault();
          const f = ui.form.elements;
          const taskId = crypto.randomUUID(); // o usar Firestore's auto ID si quieres dejarlo en blanco
          const isSub = !!ui._parentForSub;
          const task = {
                id: taskId,
                title: f['title'].value.trim(),
                deadline: f['deadline'].value,
                time: f['time'].value,
                priority: f['priority'].value,
                duration: f['duration'].value || 30,
                notes: f['notes'].value.trim(),
                completed: false,
                timeSpent: 0,
                parentId: f['parent'].value || null,
                dependencies: ui._selectedDeps
                };
          if (isSub) {
            const parent = TaskModule.getByPath(ui._parentForSub);
            parent.subtasks.push(task);
            ui._parentForSub = null;
          } else {
            TaskModule.add(task);
            }
          ui.dataModule.save(TaskModule.list);
          ui.form.reset();
          setDefaultFormValues(ui.form);
          renderTasks(ui);
          ui.popup.classList.add('hidden');
        });
      
        // 3) Al cargar la página
        window.addEventListener('DOMContentLoaded', () => {
          updateFormOptions(ui);
          setDefaultFormValues(ui.form);
          renderTasks(ui);
        });
      })();

function updateDependencyOptions(ui) {
  const select = ui.form.elements['dependencies'];
  select.innerHTML = ''; // Limpiar opciones antiguas

  TaskModule.flatten().forEach(({ task }) => {
    const opt = document.createElement('option');
    opt.value = task.id;
    opt.textContent = task.title;
    select.appendChild(opt);
  });
}


function updateFormOptions(ui) {
    const { form } = ui;

      // 1) Parent: solo UNA selección posible
    const parentSelect = form.elements['parent'];
    parentSelect.multiple = false;       // por si acaso
    parentSelect.innerHTML = '';  
    // Opción “sin parent”
    const noneOpt = document.createElement('option');
    noneOpt.value = '';
    noneOpt.textContent = 'Sin tarea padre';
    parentSelect.appendChild(noneOpt);
    // Resto de tareas
    TaskModule.flatten()
        .filter(({task}) => task.id !== ui._editingTaskId)    // si estás editando
        .forEach(({ task }) => {
            const opt = document.createElement('option');
            opt.value = task.id;
            opt.textContent = task.title;
            parentSelect.appendChild(opt);
            });

  // 2) Dependencias: selección MÚLTIPLE
  const depSelect = form.elements['dependencies'];
  depSelect.innerHTML = '';
  TaskModule.list.forEach(task => {
    const opt = document.createElement('option');
    opt.value = task.id;
    opt.textContent = task.title;
    depSelect.appendChild(opt);
  });

  // 3) Chips (visualización) según lo ya seleccionado
  renderDepChips(ui);
}


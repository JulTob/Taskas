// script.js 
const PRIORITIES = [
    'Alta', 
    'Media', 
    'Baja', 
    'Retraso', 
    'Completa'
    ];


// -------- Inicialización de Firebase --------
function initFirebase(config) {
    const app = firebase.initializeApp(config);
    return {
        auth: firebase.auth(),
        db: firebase.firestore(),
        provider: new firebase.auth.GoogleAuthProvider()
        };
    }


// --------  Módulo de Tareas --------
const TaskModule = {
        list: [],
        add(task) {    this.list.push(task);  },
        clear() {      this.list.length = 0;  },
        getById(id) {  return this.list.find(t => t.id.toString() === id.toString()); },
        flatten() {
              const out = [];
              function rec(parentId = null, level = 0, path = []) {
                    TaskModule.list
                        .filter(t => (t.parentId ?? null) == parentId)
                        .sort((a, b) => (a.deadline || '').localeCompare(b.deadline || ''))
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

// -------- Modal --------
function openModal(task, ui) {
      const { modal, overlay, form } = ui;
      modal.classList.remove('hidden');
      overlay.classList.remove('hidden');
      overlay.onclick = closeModal;         
        // clic fuera = cerrar
    
      // título
      modal.querySelector('#modal-title').textContent =
            task ? 'Editar tarea' : 'Nueva tarea';
    
      // Prioridades
      const priSel = form.elements['priority'];
      priSel.innerHTML = '';
      PRIORITIES.forEach(p => priSel.add(new Option(p, p, false, p === 'Media')));
    
      // lista de padres
      updateFormOptions(ui);
    
      if (task) {           
          // ----- EDITAR -----
          form.elements['editId'].value  = task.id;
          form.elements['title'].value   = task.title;
          form.elements['deadline'].value= task.deadline;
          form.elements['time'].value    = task.time;
          form.elements['duration'].value= task.duration;
          priSel.value                   = task.priority;
          form.elements['notes'].value   = task.notes || '';
          form.elements['parent'].value  = task.parentId ?? '';
          } 
      else {              
          // ----- NUEVA -----
          form.reset();
          form.elements['editId'].value = '';
          setDefaultFormValues(form);
          }
    
      form.elements['title'].focus();
      }


function closeModal(u) {
      u.modal.classList.add('hidden');
      u.overlay.classList.add('hidden');
      }

// -------- Render de tareas --------
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
          const bg = {
              'Alta'     : 'bg-red-100',
              'Media'    : '',
              'Baja'     : 'bg-green-50',
              'Retraso'  : 'bg-yellow-200',
              'Completa' : 'bg-gray-200 line-through opacity-60'
              }[task.priority] || '';
          row.className = bg;

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

        row.querySelector('.edit-btn').onclick = () => editTask(task.id, ui)
        row.querySelector('.delete-btn').onclick = () => deleteTask(task.id, ui);
        tbody.appendChild(row);
        });

    taskContainer.appendChild(table);
    updateFormOptions(ui);
    }

function editTask(id, ui) {
    openModal(TaskModule.getById(id), ui);
    }

// -------- Borrar tarea --------
function deleteTask(id, ui) {
      TaskModule.list = TaskModule.list.filter(t => t.id !== id && t.parentId !== id);
      ui.dataModule.save(TaskModule.list);
      ui.dataModule.collRef.doc(id.toString()).delete();
      renderTasks(ui);
      }


// -------- Set up menu and auth --------
function setupMenu(ui, fb) {
      ui.newTaskBtn.onclick = () => openModal(null, ui);
      ui.loginBtn.onclick = () => fb.auth.signInWithPopup(fb.provider);
      ui.logoutBtn.onclick = () => fb.auth.signOut();
      }

// -------- Opciones dinámicas --------
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

// -------- Valores por defecto --------
function setDefaultFormValues(formEl) {
      const t = new Date();
      t.setDate(t.getDate() + 1);
      formEl.elements['deadline'].value = t.toISOString().split('T')[0];
      formEl.elements['time'].value = '17:00';
      formEl.elements['duration'].value = '30';
      formEl.elements['parent'].value = '';
      }


// -------- 9. Punto de entrada --------
(function main() {
  // Inicialización de Firebase
  const fb = initFirebase(firebaseConfig);
  // Construcción del objeto ui
  const ui = {
      newTaskBtn: document.getElementById('new-task-btn'),
      modal   : document.getElementById('task-modal'),
      overlay : document.getElementById('modal-overlay'),      
      form: document.getElementById('modal-form'),
      taskContainer: document.getElementById('task-container'),
      loginBtn: document.getElementById('loginBtn'),
      logoutBtn: document.getElementById('logoutBtn'),
      dataModule: null
      };
    
  // Evitar scroll accidental en el input de duración
  document.addEventListener('wheel', e => {
      if (e.target.name === 'duration' && document.activeElement === e.target) {
          e.preventDefault();          
          // bloquea la rueda
          }
      }, { passive:false });

  // Manejo del estado de autenticación
  fb.auth.onAuthStateChanged(user => {
        if (user) {
            ui.dataModule = {
                collRef: fb.db
                    .collection('users')
                    .doc(user.uid)
                    .collection('tasks'),
                save: tasks => { 
                    tasks.forEach(t => {
                          const { timerRunning, ...persist } = t;      // quita flag volátil      
                          ui.dataModule.collRef
                            .doc(t.id.toString())
                            .set(persist);
                            });
                    },
            subscribe: listener => ui.dataModule.collRef.onSnapshot(listener)
            };

        ui.dataModule.subscribe(snap => {
              TaskModule.clear();
              const data = doc.data();
              snap.forEach(doc => TaskModule.add({ 
                  id: +doc.id, 
                  ...data,
                  timer       : data.timer ?? 0,
                  timerRunning: false
                  }));
              renderTasks(ui);
              });
      
            ui.loginBtn.classList.add('hidden');
            ui.logoutBtn.classList.remove('hidden');
            setDefaultFormValues(ui.form);
            } 
        else {
              TaskModule.clear();
              renderTasks(ui);
              ui.dataModule = null;
              ui.logoutBtn.classList.add('hidden');
              ui.loginBtn.classList.remove('hidden');
              }
        });

  setupMenu(ui, fb);

  ui.form.onsubmit = e => {
    e.preventDefault();
    const f = ui.form.elements;

      /* ¿nuevo o edición? */
    const isEdit = f['editId'].value !== '';
    const task   = isEdit
          ? TaskModule.getById(+f['editId'].value)    // editar: objeto existente
          : {
              id: Date.now() ,
              timer    : 0,
              timerRunning : false,
              };                       // nuevo: TaskAs objeto 
    /* 2· Rellenar/actualizar campos */
    task.title     = f['title'].value.trim();
    task.deadline  = f['deadline'].value;         // '' si no se elige
    task.time      = f['time'].value;
    task.duration  = +f['duration'].value;        // número
    task.priority  = f['priority'].value;
    task.notes     = f['notes'].value.trim();
    task.parentId  = f['parent'].value === '' ? null : +f['parent'].value;

    // Proteger contra loops de herencia
    if (task.parentId === task.id) task.parentId = null;
    function isDescendant(candidateId, targetId) {
          // ¿targetId está en la cadena de padres de candidateId?
          let p = TaskModule.getById(candidateId)?.parentId;
          while (p != null) {
                if (p === targetId) return true;
                p = TaskModule.getById(p)?.parentId ?? null;
                }
          return false;
          }
    if (task.parentId && isDescendant(task.parentId, task.id)) {
          alert('No puedes hacer que una tarea sea hija de su propio descendiente.');
          task.parentId = null;
          }    
    /* 3· Añadir a la lista si es una tarea nueva */
    if (!isEdit) TaskModule.add(task);
    /* 4· Persistir y refrescar UI */
    ui.dataModule.save(TaskModule.list);
    renderTasks(ui);
    closeModal(ui); 
    ui.form.reset();
    };

  window.addEventListener('DOMContentLoaded', () => {
    setDefaultFormValues(ui.form);
  });
})();


function startTimer(task, ui) {
    task.timerRunning = true;
    activeTimer = { … };
  
    // no persistas timerRunning; pero **sí** puedes escribir el primer segundo
    ui.dataModule.save(TaskModule.list);
    }



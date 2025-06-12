// script.js 

//--- Imports ---
import { generateTaskGraph } from './diagram.js';
import './components/task-modal.js';


window.showDiagram = () => {
  const code = generateTaskGraph(TaskModule.list);
  document.getElementById('diagram').textContent = code;
  mermaid.init(undefined, '#diagram');
    };

/* ------------------- constantes ------------------- */
const PRIORITIES = [
    'Alta', 
    'Media', 
    'Baja', 
    'Retraso', 
    'Completa'
    ];


// -------- Inicialización de Firebase --------
const firebaseConfig = {
          apiKey: "AIzaSyA-EY3-EISZdoThqVepYYA9rlCI30Qt8ZE",
          authDomain: "taska-65c33.firebaseapp.com",
          projectId: "taska-65c33",
          storageBucket: "taska-65c33.appspot.com",
          messagingSenderId: "287205600078",
          appId: "1:287205600078:web:25b211ff3764cbfe304c1f",
          measurementId: "G-RM9DCQ136H"
          };
/* 20:59-11-5
function initFirebase(config) {
    firebase.initializeApp(config);
    return {
        auth: firebase.auth(),
        db: firebase.firestore(),
        provider: new firebase.auth.GoogleAuthProvider()
        };
    }
*/
function initFirebase(config) {
  const app = firebase.apps.length
      ? firebase.app()             // ya existe, reutilízalo
      : firebase.initializeApp(config);

  return {
    auth: app.auth(),
    db  : app.firestore(),
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
              const usedIds = new Set();
              function rec(parentId = null, level = 0, path = []) {
                    TaskModule.list
                        .filter(t => (t.parentId ?? null) == parentId)
                        .sort((a, b) => (a.deadline || '').localeCompare(b.deadline || ''))
                        .forEach((t, i) => {
                              const currentPath = [...path, i];
                              out.push({ task: t, level, path: currentPath });
                              usedIds.add(t.id);
                              rec(t.id, level + 1, currentPath);
                              });
                    }
              // 🌳 Step 1: Build normal hierarchy
              rec();
              // 👻 Step 2: Find & append "horfan" tasks
              TaskModule.list.forEach(t => {
                    const isSelfParent = t.parentId === t.id;
                    const isMissingParent = t.parentId && !TaskModule.getById(t.parentId);
                    const isAlreadyIncluded = usedIds.has(t.id)
                    if ((isSelfParent || isMissingParent) && !isAlreadyIncluded) {
                          out.push({ task: t, level: 0, path: ['orphans'] });
                          }
                    });
              return out;
              }
        };



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
            <td class="p-2">${task.duration} min <br>
                  <span class="text-xs text-red-600">${task.timer ?? 0} min</span>
                </td>
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
    if (window.generateTaskGraph && window.mermaid) {
          const graphCode = generateTaskGraph(
                  TaskModule.list,
                  );
          const diagramEl = document.getElementById('diagram');
          diagramEl.textContent = graphCode;
          mermaid.init(undefined, diagramEl);
        }

    updateFormOptions(ui);
    if (window.showDiagram) window.showDiagram();
    }

function editTask(id) {
    const modal = document.getElementById('taskModal');
    const task = TaskModule.getById(id);
    modal.show(task);
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

// ---------- Punto de entrada de diagrama -----

function showDiagram1() {
  const graphCode = generateTaskGraph(TaskModule.list);
  const diagramEl = document.getElementById('diagram');
  diagramEl.textContent = graphCode;
  mermaid.init(undefined, diagramEl);
  }

 function showDiagram2() {
  const code = generateTaskGraph(TaskModule.list);
  const el   = document.getElementById('diagram');

  try {
    mermaid.parse(code);          // 💡 validación rápida
    el.textContent = code;
    mermaid.init(undefined, el);
  } catch (err) {
    console.error('Mermaid ▶︎', err);
    el.textContent = 'graph TD\nerror["❌ Diagrama no válido"]';
    mermaid.init(undefined, el);
  }
}

// -------- Punto de entrada --------
// FINAL MAIN — with modal injection and clean structure
(function main() {
  const fb = initFirebase(firebaseConfig);

  const modal = document.getElementById('taskModal');
  const form  = document.getElementById('modal-form');

  const ui = {
    newTaskBtn: document.getElementById('new-task-btn'),
    modal: modal,
    form: form,
    taskContainer: document.getElementById('task-container'),
    loginBtn: document.getElementById('loginBtn'),
    logoutBtn: document.getElementById('logoutBtn'),
    dataModule: null
  };

  window.__TASKAS_UI__ = ui;

  // Prevent accidental scroll change on number input
  document.addEventListener('wheel', e => {
    if (e.target.name === 'duration' && document.activeElement === e.target) {
      e.preventDefault();
    }
  }, { passive: false });

  const PRIORITIES = ['Alta','Media','Baja','Retraso','Completa'];

  // ✅ Inject dependencies into modal
  modal.priorities = PRIORITIES;
  modal.onSave = formData => {
    const isEdit = formData.editId !== '';
    const task = isEdit
      ? TaskModule.getById(+formData.editId)
      : {
          id: Date.now(),
          timer: 0,
          timerRunning: false
        };

    Object.assign(task, {
      title: formData.title.trim(),
      deadline: formData.deadline,
      time: formData.time,
      duration: +formData.duration,
      priority: formData.priority,
      notes: formData.notes.trim(),
      parentId: formData.parent === '' ? null : +formData.parent
    });

    if (task.parentId === task.id) task.parentId = null;
    function isDescendant(childId, ancestorId) {
      let p = TaskModule.getById(childId)?.parentId;
      while (p != null) {
        if (p === ancestorId) return true;
        p = TaskModule.getById(p)?.parentId ?? null;
      }
      return false;
    }
    if (task.parentId && isDescendant(task.parentId, task.id)) {
      alert('No puedes hacer que una tarea sea hija de su propio descendiente.');
      task.parentId = null;
    }

    if (!isEdit) TaskModule.add(task);
    ui.dataModule.save(TaskModule.list);
    renderTasks(ui);
    form.reset();
  };

  ui.newTaskBtn.onclick = () => {
    setDefaultFormValues(form);
    modal.show();
  };

  fb.auth.onAuthStateChanged(user => {
    if (user) {
      ui.dataModule = {
        collRef: fb.db.collection('users').doc(user.uid).collection('tasks'),
        save: tasks => {
          tasks.forEach(t => {
            const { timerRunning, ...persist } = t;
            ui.dataModule.collRef.doc(t.id.toString()).set(persist);
          });
        },
        subscribe: listener => ui.dataModule.collRef.onSnapshot(listener)
      };

      ui.dataModule.subscribe(snap => {
        TaskModule.clear();
        snap.forEach(doc => {
          const data = doc.data();
          TaskModule.add({
            id: +doc.id,
            ...data,
            timer: data.timer ?? 0,
            timerRunning: false
          });
        });
        renderTasks(ui);
      });

      ui.loginBtn.classList.add('hidden');
      ui.logoutBtn.classList.remove('hidden');
      setDefaultFormValues(form);
    } else {
      TaskModule.clear();
      renderTasks(ui);
      ui.dataModule = null;
      ui.logoutBtn.classList.add('hidden');
      ui.loginBtn.classList.remove('hidden');
    }
  });

  setupMenu(ui, fb);

  window.addEventListener('DOMContentLoaded', () => {
    setDefaultFormValues(form);
  });
})();

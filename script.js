/* ──────────────────────────────────  script.js  ─────────────────────────── */
// 1  Imports
import { generateTaskGraph } from './diagram.js';
import './components/task-modal.js';          // registers <task-modal>

// 2  Constants
const PRIORITIES = ['Alta', 'Media', 'Baja', 'Retraso', 'Completa'];

const firebaseConfig = { /* … your keys … */ };

// 3  Firebase bootstrap
function initFirebase(cfg) {
  const app = firebase.apps.length ? firebase.app() : firebase.initializeApp(cfg);
  return {
    auth    : app.auth(),
    db      : app.firestore(),
    provider: new firebase.auth.GoogleAuthProvider()
  };
}

// 4  Task data
const TaskModule = {
  list   : [],
  add(t) { this.list.push(t); },
  clear() { this.list.length = 0; },
  getById(id) { return this.list.find(x => x.id === id); },
  flatten() {               // exactly the code you had before
    const out = [], used = new Set();
    function rec(parentId = null, lvl = 0, path = []) {
      TaskModule.list
        .filter(t => (t.parentId ?? null) === parentId)
        .sort((a,b)=> (a.deadline||'').localeCompare(b.deadline||''))
        .forEach((t,i)=>{
          const p=[...path,i]; out.push({task:t,level:lvl,path:p});
          used.add(t.id); rec(t.id,lvl+1,p);
        });
    }
    rec();
    TaskModule.list.forEach(t=>{
      if((t.parentId===t.id|| (t.parentId&&!TaskModule.getById(t.parentId))) && !used.has(t.id)){
        out.push({task:t,level:0,path:['orphans']});
      }
    });
    return out;
  }
};

// 5  DOM ready
window.addEventListener('DOMContentLoaded', () => {

  /* DOM handles */
  const modal = document.getElementById('taskModal');
  const form  = modal.shadowRoot.querySelector('form');   // inside component
  const ui = {
    newTaskBtn   : document.getElementById('new-task-btn'),
    taskContainer: document.getElementById('task-container'),
    loginBtn     : document.getElementById('loginBtn'),
    logoutBtn    : document.getElementById('logoutBtn'),
    dataModule   : null
  };

  /* modal contract */
  modal.priorities = PRIORITIES;     // component populates <select>
  modal.onSave = saveTask;           // callback fires on 💾 Guardar

  ui.newTaskBtn.onclick = () => {
    setDefaults();                   // fill default form values
    fillParentSelect();              // refresh parents list
    modal.show();                    // open blank modal
  };

  /* Firebase login flow */
  const fb = initFirebase(firebaseConfig);

  ui.loginBtn.onclick  = () => fb.auth.signInWithPopup(fb.provider);
  ui.logoutBtn.onclick = () => fb.auth.signOut();

  fb.auth.onAuthStateChanged(user => {
    if (!user) {           /* logged-out state */
      TaskModule.clear(); render();
      ui.dataModule=null;
      ui.loginBtn.classList.remove('hidden');
      ui.logoutBtn.classList.add('hidden');
      return;
    }
    /* logged-in: attach collection */
    ui.dataModule = {
      collRef: fb.db.collection('users').doc(user.uid).collection('tasks'),
      save: tasks => tasks.forEach(t=>{
        const { timerRunning, ...persist } = t;
        ui.dataModule.collRef.doc(String(t.id)).set(persist);
      }),
      sub: fn => ui.dataModule.collRef.onSnapshot(fn)
    };
    ui.loginBtn.classList.add('hidden');
    ui.logoutBtn.classList.remove('hidden');

    ui.dataModule.sub(snap=>{
      TaskModule.clear();
      snap.forEach(d=>TaskModule.add({id:+d.id, ...d.data(), timerRunning:false}));
      render();
    });
  });

  /* ========== helpers ========== */

  function saveTask(fd) {
    const isEdit = fd.editId !== '';
    const task = isEdit ? TaskModule.getById(+fd.editId)
                        : { id:Date.now(), timer:0, timerRunning:false };

    Object.assign(task, {
      title   : fd.title.trim(),
      deadline: fd.deadline,
      time    : fd.time,
      duration: +fd.duration,
      priority: fd.priority,
      notes   : fd.notes.trim(),
      parentId: fd.parent==='' ? null : +fd.parent
    });

    if (!isEdit) TaskModule.add(task);
    ui.dataModule?.save(TaskModule.list);
    render();
    form.reset();
  }

  function render() {
    /* build table (same markup you already used) */
    const { taskContainer } = ui;
    taskContainer.innerHTML = '';
    const flat = TaskModule.flatten();
    if (!flat.length) {
      taskContainer.innerHTML = '<p class="text-gray-500">No hay tareas.</p>';
      return;
    }
    const tbl = document.createElement('table');
    tbl.className='w-full table-auto bg-white rounded shadow';
    tbl.innerHTML =
`<thead class="bg-gray-200"><tr>
 <th class="p-2">Título</th><th class="p-2">Prioridad</th>
 <th class="p-2">Fecha</th><th class="p-2">Hora</th>
 <th class="p-2">Duración</th><th class="p-2">Acciones</th>
</tr></thead><tbody class="divide-y"></tbody>`;
    const tbody = tbl.querySelector('tbody');

    flat.forEach(({task,level})=>{
      const tr=document.createElement('tr');
      const bg={
        Alta:'bg-red-100', Baja:'bg-green-50',
        Retraso:'bg-yellow-200', Completa:'bg-gray-200 line-through opacity-60'
      }[task.priority] || '';
      tr.className=bg;
      tr.innerHTML = `
        <td class="p-2" style="padding-left:${1.5*level}rem">${task.title}</td>
        <td class="p-2">${task.priority}</td>
        <td class="p-2">${task.deadline||'—'}</td>
        <td class="p-2">${task.time||'—'}</td>
        <td class="p-2">${task.duration} min</td>
        <td class="p-2">
          <button class="edit text-blue-500">✏️</button>
          <button class="del  text-red-500">❌</button>
        </td>`;
      tr.querySelector('.edit').onclick = ()=>{ fillParentSelect(); modal.show(task); };
      tr.querySelector('.del').onclick  = ()=>{ TaskModule.list=TaskModule.list.filter(t=>t.id!==task.id); ui.dataModule?.save(TaskModule.list); render(); };
      tbody.appendChild(tr);
    });
    taskContainer.appendChild(tbl);

    /* refresh diagram */
    const code = generateTaskGraph(TaskModule.list);
    const pre  = document.getElementById('diagram');
    pre.textContent = code;
    mermaid.init(undefined, pre);
  }

  function fillParentSelect() {
    const sel = form.elements.parent;
    sel.innerHTML = '<option value="">Sin tarea padre</option>';
    TaskModule.list.forEach(t=>{
      const o=document.createElement('option');
      o.value=t.id; o.textContent=t.title;
      sel.appendChild(o);
    });
  }

  function setDefaults() {
    const t=new Date(); t.setDate(t.getDate()+1);
    form.elements.deadline.value = t.toISOString().slice(0,10);
    form.elements.time.value = '17:00';
    form.elements.duration.value = '30';
    form.elements.parent.value = '';
  }
});

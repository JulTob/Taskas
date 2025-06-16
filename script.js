/* ─────────────────────────────── script.js ─────────────────────────────── */
  import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs';


/* 1) Imports */
import { generateTaskGraph } from './diagram.js';
import {
           auth,
           db,
           provider,
           initAuth,
           signInWithPopup,
           signOut, 
           onSnapshot,
           collection,
           doc,
           setDoc,
           deleteDoc
         } from './firebase.js';

import './components/task-modal.js';          // registers <task-modal>
import { startPomodoro, fmt } from './pomodoro.js';


/* 2) Constants */
const PRIORITIES = ['Alta', 'Media', 'Baja', 'Retraso', 'Completa'];



const TaskModule = {
  list   : [],
  add(t) { this.list.push(t); },
  clear() { this.list.length = 0; },
  getById(id) { return this.list.find(x => x.id === id); },
  flatten() {
      const out = [], used = new Set();
      const rec = (parent = null, level = 0, path = []) => {
          TaskModule.list
            .filter(t => (t.parentId ?? null) === parent)
            .sort((a,b)=> (a.deadline||'').localeCompare(b.deadline||''))
            .forEach((t,i)=>{ const p=[...path,i]; out.push({task:t,level,path:p});
                              used.add(t.id); rec(t.id, level+1, p); });
          };
      rec();
        TaskModule.list.forEach(t=>{
          if((t.parentId===t.id || (t.parentId && !TaskModule.getById(t.parentId)))
              && !used.has(t.id)) out.push({task:t,level:0,path:['orphans']});
        });
        return out;
      }
  };

// Expose for other modules (e.g., pomodoro.js)
window.TaskModule = TaskModule;

/* DOM ready */
window.addEventListener('DOMContentLoaded', () => {
         /* DOM handles */
         const modal = document.getElementById('taskModal');
         const form  = modal.querySelector('form');         // form is slotted
  
         const ui = {
                   newBtn       : document.getElementById('new-task-btn'),
                   taskContainer: document.getElementById('task-container'),
                   loginBtn     : document.getElementById('loginBtn'),
                   logoutBtn    : document.getElementById('logoutBtn'),
                   dataModule   : null
                   };
         
         window.ui = ui;
         
         /* modal contract */
         modal.priorities = PRIORITIES;
         modal.onSave     = handleSave;

             ui.newBtn.onclick = () => {
                 setDefaults();
                 fillParentSelect();
                 modal.show();
                 };

/* prevent wheel scroll on duration */
document.addEventListener('wheel', e=>{
         if(e.target.name==='duration' && document.activeElement===e.target) e.preventDefault();
         }, { passive: false});

// A) Guarded pop-up login
let popupInFlight = false;
  
ui.loginBtn.onclick = () => {
      if (popupInFlight) return;
      popupInFlight = true;
      /* modular call ⬇️ */
      signInWithPopup(auth, provider)
          .catch(err => alert(`Login error:\n${err.message}`))
          .finally(() => popupInFlight = false);
      };
  
  // B) Sign-out click
  ui.logoutBtn.onclick = () => {
        signOut().catch(err => alert(`Logout error:\n${err.message}`));
        };

  // C) Global auth state hook via your firebase.js helper  
 initAuth(user => {
        // onLogin:
        ui.loginBtn.classList.add('hidden');
        ui.newBtn.classList.remove('hidden');
        ui.logoutBtn.classList.remove('hidden');
        ui.dataModule = {
              collRef: collection(db, 'users', user.uid, 'tasks'),
              save: tasks => tasks.forEach(t => {
                    const { timerRunning, ...p } = t;
                    setDoc(doc(ui.dataModule.collRef, String(t.id)), p);
                    }),
              remove: id => deleteDoc(doc(db, 'users', user.uid, 'tasks', String(id))),
              sub: fn => onSnapshot(ui.dataModule.collRef, fn)
              };
        ui.dataModule.sub(snapshot => {
              TaskModule.clear();
              snapshot.forEach(d =>
                    TaskModule.add({ id: +d.id, ...d.data(), 
                                      timerRunning: false }));
              render();
            });
      }, () => {
        // onLogout:
        TaskModule.clear(); 
        render();
        ui.dataModule = null;
        ui.loginBtn.classList.remove('hidden');
        ui.logoutBtn.classList.add('hidden');
        ui.newBtn.classList.add('hidden');
        });
      
        

  /* ─── Helpers ──────────────────────────────────────────────────────────── */
  function handleSave(fd){
          const isEdit = fd.editId !== '';
          const task = isEdit ? TaskModule.getById(+fd.editId)
                              : { id: Date.now(), timer:0, timerRunning:false };
      
          Object.assign(task,{
                title   : fd.title.trim(),
                deadline: fd.deadline,
                time    : fd.time,
                duration: +fd.duration,
                priority: fd.priority,
                notes   : fd.notes.trim(),
                parentId: fd.parent==='' ? null : +fd.parent,
                timer: +this.form.elements.timer?.value || 0
                });
        
          if(!isEdit) TaskModule.add(task);
          ui.dataModule?.save(TaskModule.list);
          render();
          form.reset();
          }

           
  mermaid.initialize({ startOnLoad: false });
           
  async function render() {
    const container = ui.taskContainer;
    const flat = TaskModule.flatten();
    container.innerHTML = '';

    if (!flat.length) {
        container.innerHTML = '<p class="text-gray-500">No hay tareas.</p>';
        } 
    else {
        container.appendChild(buildTable(flat, container));
        }

    // 🎯 Replace this part:
    const diagramCode = generateTaskGraph(TaskModule.list);
    const pre = document.getElementById('diagram');
    try {
        const { svg } = await mermaid.render('taskGraph', diagramCode);
        pre.innerHTML = svg;
        } 
    catch (err) {
        console.warn('Mermaid render error:', err);
        pre.textContent = '⚠️ Error al generar el diagrama.';
        }
    }
           

  function buildTable(flat, container) {
        const tbl=document.createElement('table');
        tbl.className='w-full table-auto bg-white rounded shadow';
        tbl.innerHTML=`<thead class="bg-gray-200"><tr>
                      <th class="p-2">🗑🚮</th>
                      <th class="p-2">Título</th><th class="p-2">Prioridad</th>
                      <th class="p-2">Fecha</th><th class="p-2">Hora</th>
                      <th class="p-2">Duración</th><th class="p-2">Acciones</th></tr></thead>
                      <tbody class="divide-y"></tbody>`;
        const tbody = tbl.querySelector('tbody');
  
        flat.forEach(({task,level})=>{
            const tr=document.createElement('tr');
            const bg={
                  Alta:'bg-red-100', Baja:'bg-green-50', Retraso:'bg-yellow-200',
                  Completa:'bg-gray-200 line-through opacity-60'
            }[task.priority]||'';
            tr.className=bg;
            tr.innerHTML=`
             <td class="p-2">
                <button class="del  text-red-500">❌</button>
                </td>
              <td class="p-2" style="padding-left:${1.5*level}rem">${task.title}</td>
              <td class="p-2">${task.priority}</td>
              <td class="p-2">${task.deadline||'—'}</td>
              <td class="p-2">${task.time||'—'}</td>
              <td class="p-2">${task.duration} min</td>
              <td class="p-2">
                <button class="edit text-blue-500">✏️</button>
                </td>`;
            tr.querySelector('.edit').onclick = ()=>{ fillParentSelect(); modal.show(task); };
            tr.querySelector('.del').onclick  = async ()=>{
                    try {
                      // borra en Firestore – devuelve una Promise
                      await ui.dataModule?.remove(task.id);
                      // no hace falta tocar TaskModule ni llamar a render():
                      // onSnapshot volverá a dispararse con la lista actualizada
                    } catch (err) {
                      console.error('Error al borrar:', err);
                      alert('No se pudo borrar la tarea.');
                    }
                  };
          tbody.appendChild(tr);
            });
      container.appendChild(tbl);
  
      /* refresh mermaid diagram */
      const g = generateTaskGraph(TaskModule.list);
      const pre = document.getElementById('diagram');
      pre.textContent = g;
      return tbl;
      }

  function fillParentSelect(){
          const sel=form.elements.parent;
          sel.innerHTML='<option value="">Sin tarea padre</option>';
          TaskModule.list.forEach(t=>{
                const o=document.createElement('option');
                o.value=t.id; 
                o.textContent=t.title; 
                sel.appendChild(o);
                });
          }

  function setDefaults(){
          const d=new Date(); 
          d.setDate(d.getDate()+1);
          form.elements.deadline.value=d.toISOString().slice(0,10);
          form.elements.time.value='17:00';
          form.elements.duration.value='30';
          form.elements.parent.value='';
          }
  });


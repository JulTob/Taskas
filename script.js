// Taskas – gestor de tareas con rename y duración
// -----------------------------------------------

// 0. Memoria y DOM
const taskList      = [];
const form          = document.getElementById('task-form');
const taskContainer = document.getElementById('task-container');
const titleInput    = document.getElementById('title');
const dateInput     = document.getElementById('deadline');
const timeInput     = document.getElementById('time');
const durationInput = document.getElementById('duration');
const notesInput    = document.getElementById('notes');

// 1. Valores por defecto en el form principal
function setDefaultFormValues() {
  titleInput.value    = 'Taskeo';
  const t             = new Date(); t.setDate(t.getDate()+1);
  dateInput.value     = t.toISOString().split('T')[0];
  timeInput.value     = '17:00';
  durationInput.value = 30;           // ← default 30 min
  notesInput.value    = '';
}

window.addEventListener('DOMContentLoaded', () => {
  setDefaultFormValues();
  const saved = localStorage.getItem('taskas_tasks');
  if (saved) {
    JSON.parse(saved).forEach(t => {
      if (!Array.isArray(t.subtasks)) t.subtasks = [];
      if (t.notes    === undefined) t.notes    = '';
      if (t.duration === undefined) t.duration = 30;
      taskList.push(t);
    });
  }
  renderTasks();
});

// 2. Crear/guardar tarea principal
form.addEventListener('submit', e => {
  e.preventDefault();
  const task = {
    id        : Date.now(),
    title     : titleInput.value.trim(),
    deadline  : dateInput.value,
    time      : timeInput.value,
    duration  : parseInt(durationInput.value, 10) || 30,
    priority  : form.elements['priority'].value,
    notes     : notesInput.value.trim(),
    completed : false,
    subtasks  : [],
    timeSpent : 0
  };
  taskList.push(task);
  saveTasks();
  form.reset();
  setDefaultFormValues();
  renderTasks();
});

// 3. Helpers de jerarquía
function flattenTasks(tasks, level=0, path=[]) {
  return tasks.reduce((acc,t,i) => {
    acc.push({task:t,level,path:[...path,i]});
    if (t.subtasks.length) {
      acc.push(...flattenTasks(t.subtasks,level+1,[...path,i]));
    }
    return acc;
  },[]);
}
function getTaskByPath(path) {
  return path.reduce((cur,idx) => cur.subtasks[idx], {subtasks: taskList});
}

// 4. Renderizar tabla
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
    <thead class="bg-gray-200 text-left">
      <tr>
        <th class="p-2">Título</th>
        <th class="p-2">Prioridad</th>
        <th class="p-2">Fecha</th>
        <th class="p-2">Hora</th>
        <th class="p-2">Duración</th>
        <th class="p-2">Subtareas</th>
        <th class="p-2">Notas</th>
      </tr>
    </thead>
    <tbody class="divide-y"></tbody>
  `;
  const tbody = table.querySelector('tbody');

  flat.forEach(({task,level,path}) => {
    const row = document.createElement('tr');
    row.className = 'hover:bg-gray-50';

    const noteIcon = task.notes
      ? `<span title="${task.notes.replace(/"/g,'&quot;')}">✏️</span>`
      : '—';
    const indent = `${level*1.5}rem`;

    row.innerHTML = `
      <td class="p-2 font-semibold" style="padding-left:${indent}">${task.title}</td>
      <td class="p-2">${task.priority}</td>
      <td class="p-2">${task.deadline||'—'}</td>
      <td class="p-2">${task.time||'—'}</td>
      <td class="p-2">${task.duration} m</td>
      <td class="p-2">${task.subtasks.length}</td>
      <td class="p-2 text-center">${noteIcon}</td>
    `;

    // 4.1 Double-click en título → renombrar
    const titleCell = row.querySelector('td');
    titleCell.addEventListener('dblclick', e => {
      e.stopPropagation();
      const nuevo = prompt('Nuevo título:', task.title);
      if (nuevo!==null && nuevo.trim()) {
        task.title = nuevo.trim();
        saveTasks();
        renderTasks();
      }
    });

    // 4.2 Click en fila → panel subtareas/nota
    row.addEventListener('click', () => toggleSubtaskPanel(path));
    tbody.appendChild(row);
  });

  taskContainer.appendChild(table);
}

// 5. Panel de notas + lista + form subtarea (con duración por defecto)
function toggleSubtaskPanel(path) {
  const task = getTaskByPath(path);
  const prev = document.getElementById('subpanel');
  if (prev) prev.remove();

  const panel = document.createElement('div');
  panel.id = 'subpanel';
  panel.className = 'bg-white p-4 mb-4 border rounded shadow';

  // 5.1 Editar nota
  const hN = document.createElement('h2');
  hN.className = 'font-semibold mb-2';
  hN.textContent = `Nota de “${task.title}”`;
  panel.appendChild(hN);

  const ta = document.createElement('textarea');
  ta.rows = 3;
  ta.className = 'w-full p-2 border rounded mb-4';
  ta.value = task.notes;
  panel.appendChild(ta);

  const btnN = document.createElement('button');
  btnN.textContent = 'Guardar nota';
  btnN.className = 'bg-blue-500 text-white px-4 py-2 rounded mb-6';
  btnN.addEventListener('click', () => {
    task.notes = ta.value.trim();
    saveTasks();
    renderTasks();
    toggleSubtaskPanel(path);
  });
  panel.appendChild(btnN);

  // 5.2 Lista subtareas
  const hS = document.createElement('h2');
  hS.className = 'font-semibold mb-2';
  hS.textContent = 'Subtareas';
  panel.appendChild(hS);

  const ul = document.createElement('ul');
  ul.className = 'mb-4 list-disc ml-6';
  task.subtasks.forEach(sub => {
    const li = document.createElement('li');
    li.textContent = sub.title;
    ul.appendChild(li);
  });
  panel.appendChild(ul);

  // 5.3 Form de subtarea completa
  const subForm = document.createElement('form');
  subForm.className = 'space-y-2';
  subForm.innerHTML = `
    <input name="title"    placeholder="Título subtarea" class="w-full p-2 border rounded" required />
    <input name="deadline" type="date" class="w-full p-2 border rounded" />
    <input name="time"     type="time" class="w-full p-2 border rounded" />
    <input name="duration" type="number" min="1" class="w-full p-2 border rounded" placeholder="Duración (min)" required />
    <select name="priority" class="w-full p-2 border rounded">
      <option value="Alta">Alta</option>
      <option value="Media" selected>Media</option>
      <option value="Baja">Baja</option>
    </select>
    <textarea name="notes" rows="2" class="w-full p-2 border rounded" placeholder="Notas subtarea"></textarea>
    <button type="submit" class="bg-green-500 text-white px-4 py-2 rounded">Agregar subtarea</button>
  `;

  // ✨ Valores por defecto para subtarea
  (()=>{
    const t = new Date(); t.setDate(t.getDate()+1);
    const ds = t.toISOString().split('T')[0];
    subForm.elements['title'].value    = 'Taskeo';
    subForm.elements['deadline'].value = ds;
    subForm.elements['time'].value     = '17:00';
    subForm.elements['duration'].value = 30;
  })();

  subForm.addEventListener('submit', e => {
    e.preventDefault();
    const fd = new FormData(subForm);
    const sub = {
      id        : Date.now(),
      title     : fd.get('title').trim(),
      deadline  : fd.get('deadline'),
      time      : fd.get('time'),
      duration  : parseInt(fd.get('duration'),10)||30,
      priority  : fd.get('priority'),
      notes     : fd.get('notes').trim(),
      completed : false,
      subtasks  : [],
      timeSpent : 0
    };
    task.subtasks.push(sub);
    saveTasks();
    renderTasks();
    toggleSubtaskPanel(path);
  });

  panel.appendChild(subForm);
  taskContainer.appendChild(panel);
}

// 6. Persistencia
function saveTasks() {
  localStorage.setItem('taskas_tasks', JSON.stringify(taskList));
}

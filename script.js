// Taskas – gestor de tareas con notas y subtareas en el mismo panel
// ----------------------------------------------------------------

// ---------- Memoria y referencias al DOM ----------
const taskList      = [];
const form          = document.getElementById('task-form');
const taskContainer = document.getElementById('task-container');
const titleInput    = document.getElementById('title');
const dateInput     = document.getElementById('deadline');
const timeInput     = document.getElementById('time');
const notesInput    = document.getElementById('notes');

// ---------- Valores por defecto en el formulario ----------
function setDefaultFormValues() {
  titleInput.value = 'Taskeo';
  const t = new Date(); t.setDate(t.getDate()+1);
  dateInput.value = t.toISOString().split('T')[0];
  timeInput.value = '17:00';
}

window.addEventListener('DOMContentLoaded', () => {
  setDefaultFormValues();
  const saved = localStorage.getItem('taskas_tasks');
  if (saved) {
    JSON.parse(saved).forEach(t => {
      if (!Array.isArray(t.subtasks)) t.subtasks = [];
      if (t.notes === undefined)      t.notes = '';
      taskList.push(t);
    });
  }
  renderTasks();
});

// ---------- 1. Crear/guardar tarea ----------
form.addEventListener('submit', e => {
  e.preventDefault();
  const task = {
    id        : Date.now(),
    title     : titleInput.value.trim(),
    deadline  : dateInput.value,
    time      : timeInput.value,
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

// ---------- 2. Funciones para la tabla ----------
function flattenTasks(tasks, level = 0, path = []) {
  return tasks.reduce((acc, t, i) => {
    acc.push({ task: t, level, path: [...path, i] });
    if (t.subtasks.length) {
      acc.push(...flattenTasks(t.subtasks, level+1, [...path, i]));
    }
    return acc;
  }, []);
}
function getTaskByPath(path) {
  return path.reduce((cursor, idx) => cursor.subtasks[idx], { subtasks: taskList });
}

// ---------- 3. Renderizar tabla de tareas ----------
function renderTasks() {
  taskContainer.innerHTML = '';
  const flat = flattenTasks(taskList);
  if (flat.length === 0) {
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
        <th class="p-2">Subtareas</th>
        <th class="p-2">Notas</th>
      </tr>
    </thead>
    <tbody class="divide-y"></tbody>
  `;

  const tbody = table.querySelector('tbody');
  flat.forEach(({ task, level, path }) => {
    const row = document.createElement('tr');
    row.className = 'cursor-pointer hover:bg-gray-50';
    const noteIcon = task.notes
      ? `<span title="${task.notes.replace(/"/g,'&quot;')}">✏️</span>`
      : '—';
    const indent = `${level * 1.5}rem`;

    row.innerHTML = `
      <td class="p-2 font-semibold" style="padding-left:${indent}">${task.title}</td>
      <td class="p-2">${task.priority}</td>
      <td class="p-2">${task.deadline || '—'}</td>
      <td class="p-2">${task.time     || '—'}</td>
      <td class="p-2">${task.subtasks.length}</td>
      <td class="p-2 text-center">${noteIcon}</td>
    `;
    row.addEventListener('click', () => toggleSubtaskPanel(path));
    tbody.appendChild(row);
  });

  taskContainer.appendChild(table);
}

// ---------- 4. Panel de subtareas + edición de notas ----------
function toggleSubtaskPanel(path) {
  const task = getTaskByPath(path);

  // Cerrar panel previo
  const prev = document.getElementById('subpanel');
  if (prev) prev.remove();

  // Crear nuevo panel
  const panel = document.createElement('div');
  panel.id = 'subpanel';
  panel.className = 'bg-white p-4 mb-4 border rounded shadow';

  // --- Subtareas existentes ---
  const subtitle = document.createElement('h2');
  subtitle.className = 'font-semibold mb-2';
  subtitle.textContent = `Subtareas de “${task.title}”`;
  panel.appendChild(subtitle);

  const ul = document.createElement('ul');
  ul.className = 'mb-4 list-disc ml-6';
  task.subtasks.forEach(st => {
    const li = document.createElement('li');
    li.textContent = st;
    ul.appendChild(li);
  });
  panel.appendChild(ul);

  // --- Formulario añadir subtarea ---
  const f = document.createElement('form');
  f.className = 'flex gap-2 mb-4';
  f.innerHTML = `
    <input name="sub" class="flex-1 p-1 border rounded"
           placeholder="Nueva subtarea…" required>
    <button class="bg-green-500 text-white px-2 rounded">+</button>
  `;
  f.addEventListener('submit', e => {
    e.preventDefault();
    const txt = f.elements['sub'].value.trim();
    if (!txt) return;
    task.subtasks.push(txt);
    saveTasks();
    renderTasks();
    toggleSubtaskPanel(path);
  });
  panel.appendChild(f);

  // --- Edición de notas ---
  const noteHdr = document.createElement('h2');
  noteHdr.className = 'font-semibold mb-2';
  noteHdr.textContent = 'Editar nota';
  panel.appendChild(noteHdr);

  const ta = document.createElement('textarea');
  ta.rows = 3;
  ta.className = 'w-full p-2 border rounded mb-2';
  ta.value = task.notes;
  panel.appendChild(ta);

  const saveBtn = document.createElement('button');
  saveBtn.textContent = 'Guardar nota';
  saveBtn.className = 'bg-blue-500 text-white px-4 py-2 rounded';
  saveBtn.addEventListener('click', () => {
    task.notes = ta.value.trim();
    saveTasks();
    renderTasks();
    toggleSubtaskPanel(path);
  });
  panel.appendChild(saveBtn);

  // Insertar panel tras la tabla
  taskContainer.appendChild(panel);
}

// ---------- 5. Persistencia ----------
function saveTasks() {
  localStorage.setItem('taskas_tasks', JSON.stringify(taskList));
}

// Taskas – gestor con edición de tareas, duración y notas
// -------------------------------------------------------

// ---------- Memoria y referencias al DOM ----------
const taskList      = [];
const form          = document.getElementById('task-form');
const taskContainer = document.getElementById('task-container');
const titleInput    = document.getElementById('title');
const dateInput     = document.getElementById('deadline');
const timeInput     = document.getElementById('time');
const notesInput    = document.getElementById('notes');
const durationInput = document.getElementById('duration');  // NUEVO

// ---------- Valores por defecto en el formulario principal ----------
function setDefaultFormValues() {
  titleInput.value = 'Taskeo';
  const t = new Date();
  t.setDate(t.getDate() + 1);
  dateInput.value = t.toISOString().split('T')[0];
  timeInput.value = '17:00';
  durationInput.value = '30';  // Duración por defecto 30 minutos
}

window.addEventListener('DOMContentLoaded', () => {
  setDefaultFormValues();
  const saved = localStorage.getItem('taskas_tasks');
  if (saved) {
    JSON.parse(saved).forEach(t => {
      if (!Array.isArray(t.subtasks)) t.subtasks = [];
      if (t.notes === undefined)      t.notes = '';
      if (t.duration === undefined)  t.duration = 30; // Duración por defecto 30 minutos
      taskList.push(t);
    });
  }
  renderTasks();
});

// ---------- 1. Crear/guardar tarea principal ----------
form.addEventListener('submit', e => {
  e.preventDefault();
  const task = {
    id        : Date.now(),
    title     : titleInput.value.trim(),
    deadline  : dateInput.value,
    time      : timeInput.value,
    priority  : document.getElementById('priority').value,
    notes     : notesInput.value.trim(),
    completed : false,
    subtasks  : [],
    timeSpent : 0,
    duration  : durationInput.value || 30  // Usar valor de duración, por defecto 30
  };
  taskList.push(task);
  saveTasks();
  form.reset();
  setDefaultFormValues();
  renderTasks();
});

// ---------- 2. Helpers para jerarquía ----------
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

// ---------- 3. Pintar tabla de tareas ----------
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
        <th class="p-2">Duración</th>
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
    <td class="p-2">${task.duration || 30} min</td>
    <td class="p-2">${task.subtasks.length}</td>
    <td class="p-2 text-center">${noteIcon}</td>
  `;

  // --- ① Título editable in-place --------------------------
  const titleCell = row.firstElementChild;          // primer <td>
  titleCell.contentEditable = true;
  titleCell.addEventListener('blur', () => {
    const newTitle = titleCell.textContent.trim();
    if (newTitle && newTitle !== task.title) {
      task.title = newTitle;
      saveTasks();
      renderTasks();
    }
  });

  // --- ② Click en cualquier otra parte → abre panel -------
  row.addEventListener('click', (ev) => {
    if (ev.target !== titleCell) toggleSubtaskPanel(path);
  });

  tbody.appendChild(row);
});
    
const titleCell = row.querySelector('td'); // primer td
titleCell.contentEditable = true;

// Solo abre panel si NO hiciste clic en el campo editable
row.addEventListener('click', (event) => {
  if (event.target !== titleCell) {
    toggleSubtaskPanel(path);
  }
});

// Guardar nuevo título cuando pierda el foco
titleCell.addEventListener('blur', () => {
  const newTitle = titleCell.textContent.trim();
  if (newTitle && newTitle !== task.title) {
    task.title = newTitle;
    saveTasks();
    renderTasks();
  }
});

    tbody.appendChild(row);
  });

  taskContainer.appendChild(table);
}

// ---------- 4. Panel de notas + lista + creación de subtarea completa ----------
function toggleSubtaskPanel(path) {
  const task = getTaskByPath(path);

  // Cerrar panel previo
  const prev = document.getElementById('subpanel');
  if (prev) prev.remove();

  // Crear nuevo panel
  const panel = document.createElement('div');
  panel.id = 'subpanel';
  panel.className = 'bg-white p-4 mb-4 border rounded shadow';

  // —— 4.1 Editar nota ——
  const noteHdr = document.createElement('h2');
  noteHdr.className = 'font-semibold mb-2';
  noteHdr.textContent = `Nota de “${task.title}”`;
  panel.appendChild(noteHdr);

  const ta = document.createElement('textarea');
  ta.rows = 3;
  ta.className = 'w-full p-2 border rounded mb-4';
  ta.value = task.notes;
  panel.appendChild(ta);

  const saveNoteBtn = document.createElement('button');
  saveNoteBtn.textContent = 'Guardar nota';
  saveNoteBtn.className = 'bg-blue-500 text-white px-4 py-2 rounded mb-4';
  saveNoteBtn.addEventListener('click', () => {
    task.notes = ta.value.trim();
    saveTasks();
    renderTasks();
    toggleSubtaskPanel(path);
  });
  panel.appendChild(saveNoteBtn);

  // —— 4.2 Lista de subtareas ——
  const subHdr = document.createElement('h2');
  subHdr.className = 'font-semibold mb-2';
  subHdr.textContent = 'Subtareas';
  panel.appendChild(subHdr);

  const ul = document.createElement('ul');
  ul.className = 'mb-4 list-disc ml-6';
  task.subtasks.forEach(sub => {
    const li = document.createElement('li');
    li.textContent = sub.title;
    ul.appendChild(li);
  });
  panel.appendChild(ul);

  // —— 4.3 Formulario completo para nueva subtarea ——
  const subForm = document.createElement('form');
  subForm.className = 'space-y-2 mb-2';

  subForm.innerHTML = `
    <input name="title" placeholder="Título subtarea" class="w-full p-2 border rounded" required />
    <input name="deadline" type="date" class="w-full p-2 border rounded" />
    <input name="time" type="time" class="w-full p-2 border rounded" />
    <select name="priority" class="w-full p-2 border rounded">
      <option value="Alta">Alta</option>
      <option value="Media" selected>Media</option>
      <option value="Baja">Baja</option>
    </select>
    <textarea name="notes" rows="2" class="w-full p-2 border rounded" placeholder="Notas subtarea"></textarea>
    <button type="submit" class="bg-green-500 text-white px-4 py-2 rounded">Agregar subtarea</button>
  `;

  subForm.addEventListener('submit', e => {
    e.preventDefault();
    const data = new FormData(subForm);
    const subtask = {
      id        : Date.now(),
      title     : data.get('title').trim(),
      deadline  : data.get('deadline'),
      time      : data.get('time'),
      priority  : data.get('priority'),
      notes     : data.get('notes').trim(),
      completed : false,
      subtasks  : [],
      timeSpent : 0
    };
    task.subtasks.push(subtask);
    saveTasks();
    renderTasks();
    toggleSubtaskPanel(path); // reabre para seguir editando
  });

  panel.appendChild(subForm);

  // Insertar tras la tabla
  taskContainer.appendChild(panel);
}

// ---------- 5. Persistencia ----------
function saveTasks() {
  localStorage.setItem('taskas_tasks', JSON.stringify(taskList));
}

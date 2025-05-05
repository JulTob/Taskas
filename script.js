// Taskas – gestor con tareas jerárquicas
// --------------------------------------

// 0. Memoria y referencias al DOM
const taskList      = [];
const form          = document.getElementById('task-form');
const taskContainer = document.getElementById('task-container');
const titleInput    = document.getElementById('title');
const dateInput     = document.getElementById('deadline');
const timeInput     = document.getElementById('time');
const notesInput    = document.getElementById('notes');

// 1. Valores por defecto en el formulario
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
    const parsed = JSON.parse(saved);
    parsed.forEach(t => {
      if (!Array.isArray(t.subtasks)) t.subtasks = [];
      if (t.notes === undefined)      t.notes = '';
      // Al cargar, subtareas ya están como tareas completas
      // (no necesitamos parche adicional)
      taskList.push(t);
    });
  }
  renderTasks();
});

// 2. Crear y guardar una nueva tarea (y subtarea)  
form.addEventListener('submit', e => {
  e.preventDefault();
  const base = {
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
  taskList.push(base);
  saveTasks();
  form.reset();
  setDefaultFormValues();
  renderTasks();
});

// 3. Flatten + path → para renderizar y manipular
function flattenTasks(tasks, level = 0, path = []) {
  let out = [];
  tasks.forEach((t, i) => {
    out.push({ task: t, level, path: [...path, i] });
    if (t.subtasks.length) {
      out = out.concat(flattenTasks(t.subtasks, level + 1, [...path, i]));
    }
  });
  return out;
}

// 4. Obtener tarea por su path (array de índices)
function getTaskByPath(path) {
  let cursor = { subtasks: taskList };
  for (const idx of path) {
    cursor = cursor.subtasks[idx];
  }
  return cursor;
}

// 5. Renderizar toda la tabla con indentación
function renderTasks() {
  taskContainer.innerHTML = '';
  const flat = flattenTasks(taskList);
  if (flat.length === 0) {
    taskContainer.innerHTML = '<p class="text-gray-500">No hay tareas aún.</p>';
    return;
  }

  // Construir tabla
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

    // icono de notas
    const noteIcon = task.notes
      ? `<span title="${task.notes.replace(/"/g,'&quot;')}">✏️</span>`
      : '—';

    // indentamos con padding basada en el nivel
    const indent = `${level * 1.5}rem`;

    row.innerHTML = `
      <td class="p-2 font-semibold" style="padding-left:${indent}">${task.title}</td>
      <td class="p-2">${task.priority}</td>
      <td class="p-2">${task.deadline || '—'}</td>
      <td class="p-2">${task.time     || '—'}</td>
      <td class="p-2">${task.subtasks.length}</td>
      <td class="p-2 text-center">${noteIcon}</td>
    `;

    // clic en la fila → abrir panel para añadir subtask a esta tarea
    row.addEventListener('click', () => toggleSubtaskPanel(path));

    tbody.appendChild(row);
  });

  taskContainer.appendChild(table);
}

// 6. Panel de subtareas para cualquier tarea (identificada por path)
function toggleSubtaskPanel(path) {
  const task = getTaskByPath(path);
  // cerrar panel previo
  const prev = document.getElementById('subpanel');
  if (prev) prev.remove();

  // nuevo panel
  const panel = document.createElement('div');
  panel.id = 'subpanel';
  panel.className = 'bg-white p-4 mb-4 border rounded shadow';

  // lista actual de subtareas
  const ul = document.createElement('ul');
  ul.className = 'mb-2 list-disc ml-6';
  task.subtasks.forEach(st => {
    const li = document.createElement('li');
    li.textContent = st.title;
    ul.appendChild(li);
  });
  panel.appendChild(ul);

  // formulario para añadir una subtask (solo título)
  const f = document.createElement('form');
  f.className = 'flex gap-2';
  f.innerHTML = `
    <input name="sub" class="flex-1 p-1 border rounded"
           placeholder="Título de la subtarea…" required>
    <button class="bg-green-500 text-white px-2 rounded">+</button>
  `;
  f.addEventListener('submit', e => {
    e.preventDefault();
    const text = f.elements['sub'].value.trim();
    if (!text) return;
    // creamos objeto tarea mínimo
    const subtask = {
      id        : Date.now(),
      title     : text,
      deadline  : '',        // sin fecha
      time      : '',
      priority  : task.priority,
      notes     : '',
      completed : false,
      subtasks  : [],
      timeSpent : 0
    };
    task.subtasks.push(subtask);
    saveTasks();
    renderTasks();
    toggleSubtaskPanel(path); // reabre panel sobre el mismo task
  });

  panel.appendChild(f);
  // insertar tras la tabla
  taskContainer.appendChild(panel);
}

// 7. Persistencia
function saveTasks() {
  localStorage.setItem('taskas_tasks', JSON.stringify(taskList));
}

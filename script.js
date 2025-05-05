// Taskas – gestor de tareas con notas, subtareas y edición
// -------------------------------------------------------

/* ---------- Memoria y DOM ---------- */
const taskList      = [];
const form          = document.getElementById('task-form');
const taskContainer = document.getElementById('task-container');
const titleInput    = document.getElementById('title');
const dateInput     = document.getElementById('deadline');
const timeInput     = document.getElementById('time');
const notesInput    = document.getElementById('notes');

/* ---------- Valores por defecto ---------- */
function setDefaultFormValues() {
  titleInput.value = 'Taskeo';
  const t = new Date();
  t.setDate(t.getDate() + 1);
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

/* ---------- 1. Crear/guardar tarea ---------- */
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

/* ---------- 2. Renderizar tabla ---------- */
function renderTasks() {
  taskContainer.innerHTML = '';
  if (!taskList.length) {
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
        <th class="p-2">Acciones</th>
      </tr>
    </thead>
    <tbody class="divide-y"></tbody>
  `;
  const tbody = table.querySelector('tbody');

  taskList.forEach((task, idx) => {
    const row = document.createElement('tr');
    row.className = 'cursor-pointer hover:bg-gray-50';

    const noteIcon = task.notes
      ? `<span title="${task.notes.replace(/"/g,'&quot;')}">✏️</span>`
      : '—';

    row.innerHTML = `
      <td class="p-2 font-semibold">${task.title}</td>
      <td class="p-2">${task.priority}</td>
      <td class="p-2">${task.deadline || '—'}</td>
      <td class="p-2">${task.time     || '—'}</td>
      <td class="p-2">${task.subtasks.length}</td>
      <td class="p-2 text-center">${noteIcon}</td>
      <td class="p-2">
        <button class="edit-btn px-2 py-1 text-sm bg-yellow-300 rounded">✏️</button>
      </td>
    `;

    // Subtareas al clicar fila
    row.addEventListener('click', e => {
      // evitar conflicto con el botón de editar
      if (e.target.closest('.edit-btn')) return;
      toggleSubtaskPanel(idx);
    });

    // Botón editar
    row.querySelector('.edit-btn').addEventListener('click', () => {
      editTask(idx);
    });

    tbody.appendChild(row);
  });

  taskContainer.appendChild(table);
}

/* ---------- 3. Panel de subtareas ---------- */
function toggleSubtaskPanel(idx) {
  const task = taskList[idx];
  const existing = document.getElementById('subpanel');
  if (existing) existing.remove();

  const panel = document.createElement('div');
  panel.id = 'subpanel';
  panel.className = 'bg-white p-4 mb-4 border rounded shadow';

  // Lista
  const ul = document.createElement('ul');
  ul.className = 'mb-2 list-disc ml-6';
  task.subtasks.forEach(st => {
    const li = document.createElement('li');
    li.textContent = st;
    ul.appendChild(li);
  });
  panel.appendChild(ul);

  // Añadir subtarea
  const f = document.createElement('form');
  f.className = 'flex gap-2';
  f.innerHTML = `
    <input name="sub" class="flex-1 p-1 border rounded" placeholder="Nueva subtarea…" required>
    <button class="bg-green-500 text-white px-2 rounded">+</button>
  `;
  f.addEventListener('submit', e => {
    e.preventDefault();
    const txt = f.elements['sub'].value.trim();
    if (!txt) return;
    task.subtasks.push(txt);
    saveTasks();
    renderTasks();
    toggleSubtaskPanel(idx);
  });
  panel.appendChild(f);

  taskContainer.appendChild(panel);
}

/* ---------- 4. Editar tarea (prompt) ---------- */
function editTask(idx) {
  const t = taskList[idx];
  const nt = prompt('Título:', t.title);
  if (nt !== null) t.title = nt.trim() || t.title;
  const nd = prompt('Fecha (YYYY-MM-DD):', t.deadline);
  if (nd !== null) t.deadline = nd;
  const nh = prompt('Hora (HH:MM):', t.time);
  if (nh !== null) t.time = nh;
  const np = prompt('Prioridad (Alta, Media, Baja):', t.priority);
  if (np !== null) t.priority = np;
  const nn = prompt('Notas:', t.notes);
  if (nn !== null) t.notes = nn;
  saveTasks();
  renderTasks();
}

/* ---------- 5. Persistencia ---------- */
function saveTasks() {
  localStorage.setItem('taskas_tasks', JSON.stringify(taskList));
}

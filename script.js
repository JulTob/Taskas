// Taskas – gestor mínimo de tareas con notas y subtareas
// ------------------------------------------------------

/* ---------- Estructura en memoria ---------- */
const taskList = [];

/* ---------- Elementos del DOM ---------- */
const form          = document.getElementById('task-form');
const taskContainer = document.getElementById('task-container');
const titleInput    = document.getElementById('title');
const dateInput     = document.getElementById('deadline');
const timeInput     = document.getElementById('time');
const notesInput    = document.getElementById('notes');

/* ---------- Valores por defecto en el formulario ---------- */
function setDefaultFormValues() {
  titleInput.value = 'Taskeo';

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  dateInput.value = tomorrow.toISOString().split('T')[0];

  timeInput.value = '17:00';
}

/* ---------- 1. Crear tarea ---------- */
form.addEventListener('submit', event => {
  event.preventDefault();

  const title    = titleInput.value.trim();
  const deadline = dateInput.value;
  const time     = timeInput.value;
  const priority = form.elements['priority'].value;
  const notes    = notesInput.value.trim();

  if (!title) return;

  const task = {
    id        : Date.now(),
    title,
    deadline,
    time,
    priority,
    notes,
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

/* ---------- 2. Pintar tabla de tareas ---------- */
function renderTasks() {
  taskContainer.innerHTML = '';

  if (taskList.length === 0) {
    taskContainer.innerHTML =
      '<p class="text-gray-500">No hay tareas aún.</p>';
    return;
  }

  const table = document.createElement('table');
  table.className =
    'w-full table-auto bg-white rounded shadow overflow-hidden';

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

  taskList.forEach((task, idx) => {
    const row = document.createElement('tr');
    row.className = 'cursor-pointer hover:bg-gray-50';

    const noteIcon = task.notes
      ? `<span title="${task.notes.replace(/"/g, '&quot;')}">✏️</span>`
      : '—';

    row.innerHTML = `
      <td class="p-2 font-semibold">${task.title}</td>
      <td class="p-2">${task.priority}</td>
      <td class="p-2">${task.deadline || '—'}</td>
      <td class="p-2">${task.time     || '—'}</td>
      <td class="p-2">${task.subtasks.length}</td>
      <td class="p-2 text-center">${noteIcon}</td>
    `;

    row.addEventListener('click', () => toggleSubtaskPanel(idx));
    tbody.appendChild(row);
  });

  taskContainer.appendChild(table);
}

/* ---------- 3. Panel de subtareas ---------- */
function toggleSubtaskPanel(index) {
  const task = taskList[index];

  const existing = document.getElementById('subpanel');
  if (existing) existing.remove();

  const panel = document.createElement('div');
  panel.id = 'subpanel';
  panel.className =
    'bg-white p-4 mb-4 border rounded shadow';

  const list = document.createElement('ul');
  list.className = 'mb-2 list-disc ml-6';
  task.subtasks.forEach(st => {
    const li = document.createElement('li');
    li.textContent = st;
    list.appendChild(li);
  });

  const formST = document.createElement('form');
  formST.className = 'flex gap-2';
  formST.innerHTML = `
    <input name="sub" class="flex-1 p-1 border rounded"
           placeholder="Nueva subtarea…" required>
    <button class="bg-green-500 text-white px-2 rounded">+</button>
  `;
  formST.addEventListener('submit', e => {
    e.preventDefault();
    const txt = formST.elements['sub'].value.trim();
    if (!txt) return;
    task.subtasks.push(txt);
    saveTasks();
    renderTasks();
    toggleSubtaskPanel(index); // reabre panel actualizado
  });

  panel.appendChild(list);
  panel.appendChild(formST);

  taskContainer.appendChild(panel);
}

/* ---------- 4. Persistencia en localStorage ---------- */
function saveTasks() {
  localStorage.setItem('taskas_tasks', JSON.stringify(taskList));
}

/* ---------- 5. Cargar al iniciar ---------- */
window.addEventListener('DOMContentLoaded', () => {
  setDefaultFormValues();

  const saved = localStorage.getItem('taskas_tasks');
  if (saved) {
    const parsed = JSON.parse(saved);
    parsed.forEach(t => {
      if (!Array.isArray(t.subtasks)) t.subtasks = [];
      if (t.notes === undefined)      t.notes = '';
    });
    taskList.push(...parsed);
  }

  renderTasks();
});

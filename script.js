// Taskas: sistema básico de gestión de tareas
// -------------------------------------------

// Estructura en memoria
const taskList = [];

// Elementos del DOM
const form          = document.getElementById('task-form');
const taskContainer = document.getElementById('task-container');

// ---------------------------------------------------------------------------
// 1. AL CREAR UNA TAREA (submit del formulario)
// ---------------------------------------------------------------------------
form.addEventListener('submit', event => {
  event.preventDefault();

  const title    = form.elements['title'].value.trim();
  const deadline = form.elements['deadline'].value;   // '' si está vacío
  const priority = form.elements['priority'].value;

  if (!title) return;                                // título obligatorio

  const task = {
    id: Date.now(),          // identificador único
    title,
    deadline,
    priority,
    completed : false,
    subtasks  : [],          // ← importante: siempre array
    timeSpent : 0            // en milisegundos
  };

  taskList.push(task);
  saveTasks();               // guarda en localStorage
  form.reset();              // limpia formulario
  renderTasks();             // actualiza vista
});

// ---------------------------------------------------------------------------
// 2. RENDERIZAR TODAS LAS TAREAS COMO TABLA
// ---------------------------------------------------------------------------
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
        <th class="p-2">Fecha límite</th>
        <th class="p-2">Subtareas</th>
      </tr>
    </thead>
    <tbody class="divide-y"></tbody>
  `;

  const tbody = table.querySelector('tbody');

  taskList.forEach(task => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td class="p-2 font-semibold">${task.title}</td>
      <td class="p-2">${task.priority}</td>
      <td class="p-2">${task.deadline || '—'}</td>
      <td class="p-2">${task.subtasks.length}</td>
    `;
    tbody.appendChild(row);
  });

  taskContainer.appendChild(table);
}

// ---------------------------------------------------------------------------
// 3. GUARDAR / CARGAR EN localStorage
// ---------------------------------------------------------------------------
function saveTasks() {
  localStorage.setItem('taskas_tasks', JSON.stringify(taskList));
}

// Al cargar la página, recuperar tareas almacenadas y dibujar
window.addEventListener('DOMContentLoaded', () => {
  const saved = localStorage.getItem('taskas_tasks');
  if (saved) {
    const parsed = JSON.parse(saved);

    // 🔧 Parche de compatibilidad: asegura que cada tarea tenga subtasks []
    parsed.forEach(task => {
      if (!Array.isArray(task.subtasks)) {
        task.subtasks = [];
      }
    });

    taskList.push(...parsed);
  }
  renderTasks();
});

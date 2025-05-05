// Taskas: Sistema básico de gestión de tareas
const taskList = []; // Aquí guardamos las tareas temporalmente

const form = document.getElementById('task-form');
const taskContainer = document.getElementById('task-container');

form.addEventListener('submit', function (event) {
  event.preventDefault();

  const title = form.elements['title'].value.trim();
  const deadline = form.elements['deadline'].value;
  const priority = form.elements['priority'].value;

  if (!title) return;

  const task = {
    id: Date.now(),
    title,
    deadline,
    priority,
    completed: false,
    subtasks: [],
    timeSpent: 0
    };

  taskList.push(task);
  saveTasks();
  form.reset();
  renderTasks();
});

function renderTasks() {
    taskContainer.innerHTML = '';
  
    if (taskList.length === 0) {
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
          <th class="p-2">Fecha límite</th>
          <th class="p-2">Subtareas</th>
        </tr>
      </thead>
      <tbody id="task-table-body" class="divide-y">
      </tbody>
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

function saveTasks() {
  localStorage.setItem('taskas_tasks', JSON.stringify(taskList));
  }

window.addEventListener('DOMContentLoaded', () => {
      const saved = localStorage.getItem('taskas_tasks');
      if (saved) {
        const parsed = JSON.parse(saved);
    
        // Asegurar que todas las tareas tengan subtasks como array
        parsed.forEach(task => {
          if (!Array.isArray(task.subtasks)) {
            task.subtasks = [];
          }
        });
    
        taskList.push(...parsed);
      }
      renderTasks(); // renderizar SIEMPRE, esté vacío o no
    });

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
  task.subtasks.push({ title: text, completed: false });
  saveTasks();
  form.reset();
  renderTasks();
});

function renderTasks() {
      taskContainer.innerHTML = '';
    
      taskList.forEach(task => {
        const taskDiv = document.createElement('div');
        taskDiv.className = 'bg-white p-4 mb-2 rounded shadow';
    
        const info = document.createElement('div');
        info.innerHTML = `
          <strong>${task.title}</strong><br>
          <span class="text-sm text-gray-500">📅 ${task.deadline || 'Sin fecha'} | ⏱ Prioridad: ${task.priority}</span>
        `;
    
        taskDiv.appendChild(info);
        taskContainer.appendChild(taskDiv);
        });
    }

function saveTasks() {
  localStorage.setItem('taskas_tasks', JSON.stringify(taskList));
  }

window.addEventListener('DOMContentLoaded', () => {
    const saved = localStorage.getItem('taskas_tasks');
    if (saved) {
      const parsed = JSON.parse(saved);
      taskList.push(...parsed);
      renderTasks();
    }
  });

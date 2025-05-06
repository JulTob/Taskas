// Taskas – gestor con edición de tareas, duración y notas
// -------------------------------------------------------

// ---------- Memoria y referencias ----------
const taskList      = [];

const form          = document.getElementById('task-form');
const taskContainer = document.getElementById('task-container');

const titleInput    = document.getElementById('title');
const dateInput     = document.getElementById('deadline');
const timeInput     = document.getElementById('time');
const durationInput = document.getElementById('duration');
const notesInput    = document.getElementById('notes');

// ---------- Valores por defecto ----------
function setDefaultFormValues() {
  titleInput.value   = 'Taskeo';
  const tomorrow     = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  dateInput.value    = tomorrow.toISOString().split('T')[0];
  timeInput.value    = '17:00';
  durationInput.value = '30';
}

// ---------- Cargar al iniciar ----------
window.addEventListener('DOMContentLoaded', () => {
  setDefaultFormValues();

  const saved = localStorage.getItem('taskas_tasks');
  if (saved) {
    JSON.parse(saved).forEach(t => {
      if (!Array.isArray(t.subtasks)) t.subtasks = [];
      if (t.notes === undefined)      t.notes    = '';
      if (t.duration === undefined)   t.duration = 30;
      taskList.push(t);
    });
  }
  renderTasks();
});

// ---------- 1. Crear / guardar tarea ----------
form.addEventListener('submit', e => {
  e.preventDefault();

  const task = {
    id        : Date.now(),
    title     : titleInput.value.trim(),
    deadline  : dateInput.value,
    time      : timeInput.value,
    priority  : form.elements['priority'].value,
    duration  : durationInput.value || 30,
    notes     : notesInput.value.trim(),
    completed : false,
    timeSpent : 0,
    subtasks  : []
  };

  taskList.push(task);
  saveTasks();
  form.reset();
  setDefaultFormValues();
  renderTasks();
});

// ---------- 2. Helpers jerárquicos ----------
function flattenTasks(tasks, level = 0, path = []) {
  return tasks.reduce((acc, t, i) => {
    acc.push({ task: t, level, path: [...path, i] });
    if (t.subtasks.length) {
      acc.push(...flattenTasks(t.subtasks, level + 1, [...path, i]));
    }
    return acc;
  }, []);
}
function getTaskByPath(path) {
  return path.reduce((cur, idx) => cur.subtasks[idx], { subtasks: taskList });
}

// ---------- 3. Renderizar tabla ----------
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
      <tr style="padding: 2px">
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

    /* --- título editable --- */
    const titleCell = row.firstElementChild;
    titleCell.contentEditable = true;
    titleCell.addEventListener('blur', () => {
      const newTitle = titleCell.textContent.trim();
      if (newTitle && newTitle !== task.title) {
        task.title = newTitle;
        saveTasks();
        renderTasks();
      }
    });

    /* --- clic fuera del título abre panel --- */
    row.addEventListener('click', ev => {
      if (ev.target !== titleCell) toggleSubtaskPanel(path);
    });

    tbody.appendChild(row);
  });

  taskContainer.appendChild(table);
}

// ---------- 4. Panel de notas + subtareas ----------
function toggleSubtaskPanel(path) {
  const task = getTaskByPath(path);

  document.getElementById('subpanel')?.remove();  // cierra anterior

  const panel = document.createElement('div');
  panel.id = 'subpanel';
  panel.className = 'bg-white p-4 mb-4 border rounded shadow';

  /* 4.1 Nota */
  panel.innerHTML = `
    <h2 class="font-semibold mb-2">Nota de “${task.title}”</h2>
    <textarea id="note-edit" rows="3"
              class="w-full p-2 border rounded mb-2">${task.notes}</textarea>
    <button id="save-note" class="bg-blue-500 text-white px-4 py-2 rounded mb-4">
      Guardar nota
    </button>

    <h2 class="font-semibold mb-2">Subtareas</h2>
    <ul id="sub-list" class="mb-4 list-disc ml-6"></ul>

    <form id="sub-form" class="space-y-2">
      <input name="title"  placeholder="Título subtarea" class="w-full p-2 border rounded" required />
      <input name="deadline" type="date" class="w-full p-2 border rounded" />
      <input name="time" type="time" class="w-full p-2 border rounded" />
      <input name="duration" type="number" value="30" min="5" step="5"
             class="w-full p-2 border rounded" placeholder="Duración (min)"/>
      <select name="priority" class="w-full p-2 border rounded">
        <option value="Alta">Alta</option>
        <option value="Media" selected>Media</option>
        <option value="Baja">Baja</option>
      </select>
      <textarea name="notes" rows="2" class="w-full p-2 border rounded"
                placeholder="Notas subtarea"></textarea>
      <button type="submit" class="bg-green-500 text-white px-4 py-2 rounded">
        Agregar subtarea
      </button>
    </form>
  `;

  /* lista de subtareas */
  const ul = panel.querySelector('#sub-list');
  task.subtasks.forEach(st => {
    const li = document.createElement('li');
    li.textContent = st.title;
    ul.appendChild(li);
  });

  /* guardar nota */
  panel.querySelector('#save-note').addEventListener('click', () => {
    task.notes = panel.querySelector('#note-edit').value.trim();
    saveTasks();
    renderTasks();
    toggleSubtaskPanel(path);
  });

  /* 4.3 crear subtarea completa */
  panel.querySelector('#sub-form').addEventListener('submit', e => {
    e.preventDefault();
    const data = new FormData(e.target);
    const subtask = {
      id        : Date.now(),
      title     : data.get('title').trim(),
      deadline  : data.get('deadline'),
      time      : data.get('time'),
      duration  : data.get('duration') || 30,
      priority  : data.get('priority'),
      notes     : data.get('notes').trim(),
      completed : false,
      subtasks  : [],
      timeSpent : 0
    };
    task.subtasks.push(subtask);
    saveTasks();
    renderTasks();
    toggleSubtaskPanel(path);
  });

  taskContainer.appendChild(panel);
}

// ---------- 5. Persistencia ----------
function saveTasks() {
  localStorage.setItem('taskas_tasks', JSON.stringify(taskList));
}

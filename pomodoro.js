// pomodoro.js  – requiere que script.js ya esté cargado
console.log("🍅 pomodoro listo");

const POMODORO_MIN = 25;            // duración en minutos
let activeTimer = null;             // {taskId, intervalId, seconds}

function startPomodoro(task, ui) {
  stopPomodoro();                   // por si otro está corriendo
  activeTimer = {
    taskId   : task.id,
    seconds  : 0,
    intervalId : setInterval(() => {
      activeTimer.seconds++;
      // Opcional: mostrar cuenta atrás en el botón
      const btn = document.querySelector(`button.tomato-btn[data-id="${task.id}"]`);
      if (btn) btn.textContent = `🍅 ${Math.floor(activeTimer.seconds/60)}m`;
      if (activeTimer.seconds >= POMODORO_MIN*60) finishPomodoro(ui);
    }, 1000)
  };
}

function finishPomodoro(ui) {
  if (!activeTimer) return;
  const task = TaskModule.getById(activeTimer.taskId);
  // suma minutos completos
  task.timer = (task.timer ?? 0) + Math.ceil(activeTimer.seconds/60);
  ui.dataModule.save(TaskModule.list);
  stopPomodoro();
  renderTasks(ui);                  // refresca tiempo mostrado
}

function stopPomodoro() {
  if (activeTimer) clearInterval(activeTimer.intervalId);
  activeTimer = null;
}

// ——— handlers globales ———
document.addEventListener('click', e => {
  const ui = window.__TASKAS_UI__;          // la guardaremos al iniciar
  if (!ui) return;

  if (e.target.matches('.tomato-btn')) {
    const task = TaskModule.getById(+e.target.dataset.id);
    startPomodoro(task, ui);
  }
  if (e.target.matches('.inc-btn')) {
    const task = TaskModule.getById(+e.target.dataset.id);
    task.timer = (task.timer ?? 0) + 5;     // +5 min
    ui.dataModule.save(TaskModule.list);
    renderTasks(ui);
  }
  if (e.target.matches('.dec-btn')) {
    const task = TaskModule.getById(+e.target.dataset.id);
    task.timer = Math.max(0, (task.timer ?? 0) - 5); // –5 min
    ui.dataModule.save(TaskModule.list);
    renderTasks(ui);
  }
});

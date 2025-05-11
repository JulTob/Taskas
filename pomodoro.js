// pomodoro.js
console.log("🍅 pomodoro cargado");

const POMO_MIN = 25;
let active = null;   // {task, seconds, display, btn, interval}

function startPomodoro(task, ui, displayEl){
  // si ya está contando -> detener
  if (active && active.task.id === task.id) return stopPomodoro();

  stopPomodoro(); // cancela otro

  // referencia del botón dentro del modal actual
  const btn = document.querySelector('#tomato-btn');

  active = { task, seconds: 0, display: displayEl, btn,
             interval: setInterval(tick, 1000) };

  // aspecto activo
  btn.textContent = '🍅';                     // seguimos usando tomate
  btn.classList.remove('bg-red-500');
  btn.classList.add('bg-green-600', 'heartbeat');   // ← en lugar de animate-pulse}

function tick(){
  if(!active) return;
  active.seconds++;
  updateDisplay();
  if (active.seconds >= POMO_MIN*60) finishPomodoro();
}

function updateDisplay(){
  if(!active) return;
  const m = Math.floor(active.seconds/60);
  active.display.textContent =
      `${(active.task.timer ?? 0) + m} min`;
}

function finishPomodoro(){
  if(!active) return;
  active.task.timer =
      (active.task.timer ?? 0) + Math.ceil(active.seconds/60);
  window.__TASKAS_UI__.dataModule.save(TaskModule.list);
  stopPomodoro();
}

function stopPomodoro(){
  if(!active) return;

  clearInterval(active.interval);
  // aspecto inactivo
  active.btn.textContent = '🍅';
  active.btn.classList.remove('bg-green-600', 'heartbeat');
  active.btn.classList.add('bg-red-500');

  // texto final
  active.display.textContent = `${active.task.timer ?? 0} min`;
  active = null;
}

window.startPomodoro = startPomodoro;

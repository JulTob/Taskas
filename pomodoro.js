// pomodoro.js  (cargar después de script.js)
console.log("🍅 pomodoro cargado");

const POMO_MIN = 25;
let active = null;   // {task, seconds, boxEl, btnEl, interval}

function fmt(s){
  const m = Math.floor(s/60).toString().padStart(2,'0');
  const ss= (s%60).toString().padStart(2,'0');
  return `${m}:${ss}`;
}

function startPomodoro(task, ui, boxEl){
  // mismo botón = toggle ⇒ detener
  if (active && active.task.id === task.id) return stopPomodoro();

  stopPomodoro();                       // cancela otro

  const btn = document.querySelector('#tomato-btn');
  active = { task, seconds: 0, boxEl, btn,
             interval: setInterval(tick, 1000) };

  btn.classList.add('heartbeat');
}

function tick(){
  if(!active) return;
  active.seconds++;
  updateBox();
  if(active.seconds >= POMO_MIN*60) finishPomodoro();
}

function updateBox(){
  if(!active) return;
  const totalSec = (active.task.timer ?? 0)*60 + active.seconds;
  active.boxEl.textContent = fmt(totalSec);
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
  active.btn.classList.remove('heartbeat');

  // deja el acumulado final
  const totalSec = (active.task.timer ?? 0)*60;
  active.boxEl.textContent = fmt(totalSec);
  active = null;
}

window.startPomodoro = startPomodoro;

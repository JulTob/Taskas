// pomodoro.js  (reemplaza lo anterior)
console.log("🍅 pomodoro cargado");

const POMO_MIN = 25;

let active = null;   // {task, baseSec, seconds, boxEl, btnEl, interval}

// ---------- util -------------
function fmt(s){
  const m  = Math.floor(s/60).toString().padStart(2,'0');
  const ss = (s%60).toString().padStart(2,'0');
  return `${m}:${ss}`;
}

// ---------- toggle ------------
function startPomodoro(task, ui, boxEl){
  
  // 1) Si es el mismo → pausar (sin perder parciales)
  if (active && active.task.id === task.id){
    return pausePomodoro(ui);                // FIX
  }

  // 2) Cancelar otro pomodoro si hay
  pausePomodoro(ui);                         // FIX (renombrado stop→pause)

  // 3) Nueva sesión
  const btn = document.querySelector('#tomato-btn');

  active = {
    task,
    baseSec : (task.timer ?? 0) * 60,        // acumulado previo en s
    seconds : 0,                             // segundos de esta tanda
    boxEl,
    btn,
    interval: setInterval(tick, 1000)
  };

  btn.classList.add('heartbeat');
  updateBox();                               // pinta inmediatamente
}

// ---------- tictac ------------
function tick(){
  if(!active) return;
  active.seconds++;
  updateBox();
  if(active.seconds >= POMO_MIN*60){
    consolidate();                           // fin del pomodoro
  }
}

// ---------- pintar ------------
function updateBox(){
  if(!active) return;
  const total = active.baseSec + active.seconds;
  active.boxEl.textContent = fmt(total);
}

// ---------- consolidar (25 min o pausa manual) ----------
function consolidate(){
  if(!active) return;
  const totalSec = active.baseSec + active.seconds;
  // guarda en minutos redondeando hacia arriba
  active.task.timer = Math.ceil(totalSec / 60);
  window.__TASKAS_UI__.dataModule.save(TaskModule.list);
}

// ---------- pause / stop ----------
function pausePomodoro(ui){
  if(!active) return;

  clearInterval(active.interval);
  consolidate();                             // FIX — acumula aunque no llegue a 25 min

  // restablecer aspecto botón
  active.btn.classList.remove('heartbeat');

  // deja contador final
  const finalSec = (active.task.timer ?? 0) * 60;
  active.boxEl.textContent = fmt(finalSec);

  active = null;
}

window.startPomodoro = startPomodoro;

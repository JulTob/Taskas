// pomodoro.js  – guarda segundos y lanza aviso al completar 25'
console.log("🍅 pomodoro SEC cargado");

const POMO_SEC = 25 * 60;               // 1500 s
let active = null;                      // {task, baseSec, secRun, box, btn, int}

// util formato
const fmt = s =>
  `${Math.floor(s/60).toString().padStart(2,'0')}:` +
  `${(s%60).toString().padStart(2,'0')}`;

// beep
const ding = () => document.getElementById('ding')?.play();

// ---------- toggle ----------
function startPomodoro(task, ui, box){
  // mismo → pausa
  if (active && active.task.id === task.id) return pause(ui);

  pause(ui);                            // detén otro

  const btn = document.getElementById('tomato-btn');
  active = {
    task,
    baseSec : task.timerSec ?? 0,       // acumulado previo en s
    secRun  : 0,
    box,
    btn,
    int     : setInterval(tick, 1000)
  };

  btn.classList.add('heartbeat');
  updateBox();
}

function tick(){
  if(!active) return;
  active.secRun++;
  updateBox();
  if (active.secRun === POMO_SEC) {
    ding();
    window.alert('¡25 min completados! Levántate, estira o bebe agua 😊');
  }
}

function updateBox(){
  if(!active) return;
  active.box.textContent = fmt(active.baseSec + active.secRun);
}

function consolidate(ui){
  if(!active) return;
  active.task.timerSec = active.baseSec + active.secRun;     // guarda segundos exactos
  ui.dataModule.save(TaskModule.list);
  if (ui?.dataModule) ui.dataModule.save(TaskModule.list);
}

function pause(ui){
  if(!active) return;
  clearInterval(active.int);
  consolidate(ui);

  active.btn.classList.remove('heartbeat');
  active.box.textContent = fmt(active.task.timerSec);
  active = null;
}

window.startPomodoro = startPomodoro;

export { startPomodoro, fmt };

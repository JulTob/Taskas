// pomodoro.js — gestiona el temporizador tipo Pomodoro


const POMO_SEC = 25 * 60;               // 1500 s
let active = null;                      // {task, baseSec, secRun, box, btn, int}

export const formatTime = seconds =>
  `${Math.floor(seconds/60).toString().padStart(2,'0')}:` +
  `${(seconds%60).toString().padStart(2,'0')}`;


// beep
const ding = () => document.getElementById('ding')?.play();

// ---------- toggle ----------
export function startPomodoro(task, ui, box){
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
  active.box.textContent = formatTime(active.baseSec + active.secRun);
  }

function consolidate(ui){
  if(!active) return;
  active.task.timerSec = active.baseSec + active.secRun;     // guarda segundos exactos
  ui.dataModule.save(TaskModule.list);
}

function pause(ui){
  if(!active) return;
  clearInterval(active.int);
  consolidate(ui);

  active.btn.classList.remove('heartbeat');
  active.box.textContent = formatTime(active.task.timerSec);
  active = null;
  }


// pomodoro.js  (cargar después de script.js)
console.log("🍅 pomodoro cargado");

let active = null;          // {task, seconds, displayEl, interval}

const POMO_MIN = 25;

function startPomodoro(task, ui, displayEl){
    stopPomodoro();           // cancela uno previo
    active = {
      task,
      seconds : 0,
      display : displayEl,
      interval: setInterval(tick, 1000)
      };
    updateDisplay();
    }

function tick(){
  if(!active) return;
  active.seconds++;
  updateDisplay();
  if(active.seconds >= POMO_MIN*60){
    finishPomodoro();
  }
}

function updateDisplay(){
  if(!active) return;
  const m = Math.floor(active.seconds/60);
  active.display.textContent = `${active.task.timer ?? 0}+${m} min`;
}

function finishPomodoro(){
  if(!active) return;
  active.task.timer = (active.task.timer ?? 0) + Math.ceil(active.seconds/60);
  window.__TASKAS_UI__.dataModule.save(TaskModule.list);
  stopPomodoro();
}

function stopPomodoro(){
  if(active){
    clearInterval(active.interval);
    active.display.textContent = `${active.task.timer ?? 0} min`;
  }
  active = null;
}

// exporta para script.js
window.startPomodoro = startPomodoro;

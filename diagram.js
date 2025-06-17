// diagram.js

export function generateTaskGraph() {
  const tasks = TaskModule.list || [];
  if (!tasks.length) {
    // If no tasks, return a Gantt diagram with a placeholder title
    return "gantt\n    dateFormat YYYY-MM-DD\n    title No hay tareas";
  }

  // Helper to format Date as "YYYY-MM-DD HH:mm"
  function formatDate(date) {
    const y = date.getFullYear();
    const m = (date.getMonth() + 1).toString().padStart(2, "0");
    const d = date.getDate().toString().padStart(2, "0");
    const hh = date.getHours().toString().padStart(2, "0");
    const mm = date.getMinutes().toString().padStart(2, "0");
    return `${y}-${m}-${d} ${hh}:${mm}`;
  }

  // Helper to get Mermaid tag based on priority
  function getPriorityTag(priority) {
    switch (priority) {
      case "Alta":
      case "Retraso":
        return "crit";
      case "Media":
        return "active";
      case "Completa":
        return "done";
      default:
        return "";
    }
  }

  // Build the Gantt diagram string
  let diagram = `%%{init: {'theme': 'default', 'gantt': {'displayMode': 'compact'}}}%%\n`;
  diagram += "gantt\n";
  diagram += "    dateFormat  YYYY-MM-DD HH:mm\n";
  // Recursive function to traverse tasks
  function addTaskLines(taskList, parentId = null) {
    for (const task of taskList) {
      const hasSubtasks = task.subtasks && task.subtasks.length > 0;
      const title = task.title || task.name || "Tarea";
      const id = task.id;
      const tag = getPriorityTag(task.priority);

      if (parentId === null && hasSubtasks) {
        // Macro-task with subtasks: start a new section
        diagram += `    section ${title}\n`;
        // Compute explicit start and end for the macro-task
        const [year, month, day] = task.deadline.split("-");
        const [th, tm] = task.time ? task.time.split(":") : ["23", "59"];
        // Create Date objects for deadline (end) and start (deadline minus duration)
        const endDate = new Date(year, Number(month) - 1, day, th, tm);
        const startDate = new Date(endDate.getTime() - (task.duration * 60000));
        const startStr = formatDate(startDate);
        const endStr = formatDate(endDate);
        // Append macro-task line (with explicit times)
        if (tag) {
          diagram += `    ${title} : ${tag}, ${id}, ${startStr}, ${endStr}\n`;
        } else {
          diagram += `    ${title} : ${id}, ${startStr}, ${endStr}\n`;
        }
        // Recurse into subtasks, using this task's id as the parentId for dependencies
        addTaskLines(task.subtasks, id);
      } else if (parentId !== null) {
        // This task is a subtask (or deeper) with a parent dependency
        // Compute duration in days for Mermaid (to two decimal places)
        const durationDays = task.duration / (24 * 60);
        let durationStr;
        if (Number.isInteger(durationDays)) {
          durationStr = `${durationDays}d`;
        } else {
          durationStr = `${durationDays.toFixed(2)}d`;
        }
        // Append subtask line with "after parentId" constraint
        if (tag) {
          diagram += `    ${title} : ${tag}, ${id}, after ${parentId}, ${durationStr}\n`;
        } else {
          diagram += `    ${title} : ${id}, after ${parentId}, ${durationStr}\n`;
        }
        // If this subtask has its own subtasks, recurse deeper (still grouped under top section)
        if (hasSubtasks) {
          addTaskLines(task.subtasks, id);
        }
      } else {
        // Top-level task with no subtasks (standalone task)
        const [year, month, day] = task.deadline.split("-");
        const [th, tm] = task.time ? task.time.split(":") : ["23", "59"];
        const endDate = new Date(year, Number(month) - 1, day, th, tm);
        const startDate = new Date(endDate.getTime() - (task.duration * 60000));
        const startStr = formatDate(startDate);
        const endStr = formatDate(endDate);
        if (tag) {
          diagram += `    ${title} : ${tag}, ${id}, ${startStr}, ${endStr}\n`;
        } else {
          diagram += `    ${title} : ${id}, ${startStr}, ${endStr}\n`;
        }
      }
    }
  }

  // Kick off traversal from top-level tasks
  addTaskLines(tasks);
  return diagram;
}
/*
// ── Utilidades ── //
function sanitizeId(id) {
    return `task_${id}`.replace(/\W/g, '_');
    }

function sanitizeLabel(str) {
    return String(str).replace(/"/g, '\\"').slice(0, 50);
    }

// ── Nodos ── //
class Node {
    constructor(task) {
          this.id    = sanitizeId(task.id);
          this.title = sanitizeLabel(task.title ?? 'TaskAs');
          this.priority = task.priority;   // 'Alta' | 'Media' | 'Baja' | 'Retraso' | 'Completa'
          this.deadline  = task.deadline;          // 'YYYY-MM-DD'
          }  
  
    // calcula días restantes, mínimo 0
    get daysLeft() {
            if (!this.deadline) return 0;
            const today = new Date();
            const due   = new Date(this.deadline);
            return Math.max(0,
                  Math.ceil((due - today) / (1000*60*60*24))
                  );
            }     
  
    toMermaid() {
            // siempre mostramos "(Nd)"
            const label = `${this.title}\\n(${this.daysLeft}d)`;
            let node  = `${this.id}["${label}"]`;
      
            // :::low, :::medium, :::high
            switch (this.priority) {
                  case 'Baja':     node += ':::low'; break;
                  case 'Media':    node += ':::medium'; break;
                  case 'Alta':     node += ':::high'; break;
                  case 'Retraso':  node += ':::retr'; break;
                  case 'Completa': node += ':::compl'; break;
                  }
            return `  ${node};\n`;
            }    
    }


// Clase para representar un enlace (arista)
class Edge {
        constructor(fromId, toId) {
              this.from = sanitizeId(fromId);
              this.to   = sanitizeId(toId);
              }
        toMermaid() {
              return `   ${this.from} --> ${this.to};\n`;
              }
        }
    
    // Clase principal del diagrama
    class Diagram {
          constructor(tasks) {
                this.tasks = tasks;
                this.nodes = [];
                this.edges = [];
                this.build();
                }

    build() {
        const map = new Map(this.tasks.map(t => [t.id, t]));
        this.tasks.forEach(t => {
            this.nodes.push(new Node(t));
            if (t.parentId != null && map.has(t.parentId)) {
                this.edges.push(new Edge(t.parentId, t.id));
                }
              });
            }
  
    toMermaid() {
        const initHeader = `%%{init: {'themeVariables': {'diagramBackground':'#faf6e8'}}}%%\n`;
        const graphHeader = `graph LR;\n\n`;
      
        // 3. Definición de estilos
        const classDefs = [
              `classDef low    fill:lime,      stroke:Jade,stroke-width:4px;`,
              `classDef medium fill:#FF9933,  stroke:#FF6700,stroke-width:4px;`,
              `classDef high   fill:tomato,    stroke:Red,stroke-width:4px;`,
              `classDef retr   fill:#EFFF00,   stroke:Black,stroke-width:5px;`,
              `classDef compl  fill:#7DF9FF,   stroke:purple,stroke-width:5px;`
              ].map(def => `  ${def}\n`).join('') + `\n`;

        let code = initHeader + graphHeader + classDefs;
        this.nodes.forEach(n => code += n.toMermaid());
        this.edges.forEach(e => code += e.toMermaid());
        return code;
        }
      }


// ── Función principal ──//
export function generateTaskGraph(tasks) {
    // Genera un placeholder si no hay tareas
    if (!tasks || tasks.length === 0) {
        const initHeader = `%%{init: {'themeVariables': {'diagramBackground':'#faf6e8'}}}%%\n`;
        const graphHeader = `graph LR;\n\n`;
        return initHeader + graphHeader + `  Empty["No hay tareas"];\n`;
        }
  
    const diagram = new Diagram(tasks);
    return diagram.toMermaid();
    }
*/

// diagram.js

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
          this.priority  = task.priority;          // 'Alta' | 'Media' | 'Baja'
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
          if (this.priority === 'Baja')  node += ':::low';
          if (this.priority === 'Media') node += ':::medium';
          if (this.priority === 'Alta')  node += ':::high';
      
          return `  ${node};\n`;
          }    
  }


// Clase para representar un enlace (arista)
class Edge {
        constructor(fromId, toI) {
              this.from = Node.sanitizeId(fromId);
              this.to   = Node.sanitizeId(toId);
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
      // 1. Init con fondo marfil
      const init = `%%{init: {'themeVariables': {'diagramBackground':'#faf6e8'}}}%%\n`;
      // 2. Cabecera Top-Down
      let code = init + `graph TD;\n\n`;
      // 3. Definición de clases de prioridad
      code += [
          `classDef low    fill:green,  stroke:#333,stroke-width:1px;`,
          `classDef medium fill:yellow, stroke:#333,stroke-width:1px;`,
          `classDef high   fill:red,    stroke:#333,stroke-width:1px;`
          ].map(l => `  ${l}\n`).join('') + `\n`;
      // 4. Nodos y aristas
      this.nodes.forEach(n => code += n.toMermaid());
      this.edges.forEach(e => code += e.toMermaid());
      return code;
      }
  }

// ── Función principal ──//
export function generateTaskGraph(tasks) {
      const diagram = new Diagram(tasks);
      return diagram.toMermaid();
      }  

export function generateTaskGraph3(tasks) {
      const diagram = new Diagram('TD');
      // 1️⃣ añade todos los nodos
      tasks.forEach(t => {
            diagram.addNode(t.id, t.title, { /* p.ej. color: t.priority */ });
            });
      // 2️⃣ añade las aristas padre → hijo
      tasks.forEach(t => {
            if (t.parentId != null) {
                  diagram.addEdge(t.parentId, t.id);
                  }
            });
      return diagram.toMermaid();
      }  

export function generateTaskGraph2(tasks) {
  // utilidades locales (inline por simplicidad)
  const id    = n => `task_${String(n).replace(/\W/g, '_')}`;          // evitas nºs puros o símbolos
  const label = s => (s || '(Sin título)').replace(/"/g, '\"').slice(0, 50);

  // cabecera: sin punto y coma final ⇒ "graph TD" a pelo
  let graph = 'graph TD\n';

  // placeholder para lista vacía (así Mermaid no protesta)
  if (!tasks.length) {
    graph += '  vacio["(sin tareas)"]\n';
    return graph;
    }

  // 1️⃣ declara todos los nodos primero
  tasks.forEach(t => {
    graph += `  ${id(t.id)}["${label(t.title)}"]\n`;
    });

  // 2️⃣ declara las aristas padre → hijo (ignoramos padres desconocidos, de momento)
  tasks.forEach(t => {
    if (t.parentId != null) {
      graph += `  ${id(t.parentId)} --> ${id(t.id)}\n`;
      }
    });

  return graph;
  }

export function generateTaskGraph2(tasks) {
  // Build a map for fast lookup
  const taskMap = new Map();
  tasks.forEach(t => taskMap.set(t.id, t));

  // Mermaid diagram header
  let output = 'graph TD;\n';

  const added = new Set();

  tasks.forEach(task => {
    const id = sanitizeId(task.id);
    const label = sanitizeLabel(task.title || '(Sin título)');

    // Ensure the node itself is defined
    if (!added.has(id)) {
      output += `  ${id}["${label}"];\n`;
      added.add(id);
    }

    const parentId = task.parentId;

    if (parentId != null && taskMap.has(parentId)) {
      const pid = sanitizeId(parentId);
      // Make sure parent is also declared
      if (!added.has(pid)) {
        const parent = taskMap.get(parentId);
        output += `  ${pid}["${sanitizeLabel(parent.title || '(Sin título)')}"];\n`;
        added.add(pid);
        }
      output += `  ${pid} --> ${id};\n`;
    } else if (parentId === task.id) {
      output += `  ${id} --x "🔁 Self-reference" --> ${id};\n`;
    } else if (parentId != null) {
      output += `  ghost${id}["❓Missing Parent: ${parentId}"]\n`;
      output += `  ghost${id} --x "Orphan link" --> ${id};\n`;
    }
  });

  return output;
}

// Utility: sanitize IDs (Mermaid doesn't like pure numbers)
function sanitizeId(id) {
  return `task_${id.toString().replace(/\W/g, '_')}`;
}

// Utility: escape quotes and limit length
function sanitizeLabel(label) {
  return label.replace(/"/g, '\\"').slice(0, 50);
}

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
          this.daysLeft  = this.calcDaysLeft();    // número de días, o null
          }  
  
    calcDaysLeft() {
          if (!this.deadline) return null;
          const today = new Date();
          const due   = new Date(this.deadline);
          // redondeo hacia arriba de días restantes
          return Math.ceil((due - today) / (1000 * 60 * 60 * 24));
          }        
  
    toMermaid() {
            // Puedes añadir aquí según this.options: style, shape, etc.
            return `${this.id}["${this.title}"]`;
            // etiqueta con título y días si hay fecha
            let label = this.title;
            if (this.daysLeft != null) label += `\\n(${this.daysLeft}d)`;
        
            // definición básica
            let def = `${this.id}["${label}"]`;
        
            // asigno clase según prioridad
            if (this.priority === 'Baja')   def += ':::low';
            if (this.priority === 'Media')  def += ':::medium';
            if (this.priority === 'Alta')   def += ':::high';
        
            return `  ${def};\n`;
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
export class Diagram {
    /**
     * @param {Array} tasks   Array de objetos {id, title, priority, deadline, parentId}
     * @param {Object} options
     *   - direction: 'TD'|'LR' etc.
     *   - backgroundColor: '#RRGGBB'
     **/
    constructor(tasks, options = {}) {
            this.tasks   = tasks;
            this.opts    = Object.assign({ direction: 'TD' }, options);
            this.nodes   = [];
            this.edges   = [];
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
              // Init con variable de fondo (si se pasa)
              const init = this.opts.backgroundColor
                        ? `%%{init: {'themeVariables': {'diagramBackground': '${this.opts.backgroundColor}'}}}%%\n`
                        : '';
              let code = init + `graph ${this.opts.direction};\n`;
              // Defino estilos de clase para prioridades
              code += `  classDef low    fill:green,  stroke:#333,stroke-width:1px;\n`;
              code += `  classDef medium fill:yellow, stroke:#333,stroke-width:1px;\n`;
              code += `  classDef high   fill:red,    stroke:#333,stroke-width:1px;\n\n`;
              // Agrego nodos y aristas
              this.nodes.forEach(n => code += n.toMermaid());
              this.edges.forEach(e => code += e.toMermaid());
              return code;
              }
      }

// ── Función principal ──//
export function generateTaskGraph(tasks, options) {
      const diagram = new Diagram(tasks, options);
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

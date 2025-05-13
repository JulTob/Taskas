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

          if (this.priority === 'Retraso')  node += ':::retr';

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
      // 1. Init con fondo marfil
      const init = `%%{init: {'themeVariables': {'diagramBackground':'#faf6e8'}}}%%\n`;
      // 2. Cabecera Top-Down
      let code = init + `graph TD;\n\n`;
      // 3. Definición de clases de prioridad
      code += [
          `classDef low    fill:Olive,  stroke:Silver,stroke-width:4px;`,
          `classDef medium fill:Electric, stroke:Silver,stroke-width:4px;`,
          `classDef high   fill:tomato,    stroke:Silver,stroke-width:4px;`,
          `classDef retr   fill:#EFFF00,  stroke:Black,stroke-width:5px;`

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




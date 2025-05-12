// diagram.js
// diagram.js – versión mínima y 100 % válida para Mermaid
// Empieza sólo con nodos y enlaces básicos; ya iremos añadiendo comprobaciones.

export function generateTaskGraph(tasks) {
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

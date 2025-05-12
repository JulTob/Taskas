// diagram.js

export function generateTaskGraph(tasks) {
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

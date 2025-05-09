// script.js 

// 1. Inicialización de Firebase
function initFirebase(config) {
  firebase.initializeApp(config);
  return {
    auth: firebase.auth(),
    db: firebase.firestore(),
    provider: new firebase.auth.GoogleAuthProvider()
  };
}

// 2. Módulo de Autenticación
function setupAuth(authModule, uiElements, onLogin, onLogout) {
  const { auth, provider } = authModule;
  uiElements.loginBtn.onclick  = () => auth.signInWithPopup(provider);
  uiElements.logoutBtn.onclick = () => auth.signOut();

  auth.onAuthStateChanged(user => {
    if (user) {
      onLogin(user);
    } else {
      onLogout();
    }
  });
}

// 3. Módulo de Datos (Firestore)
function createDataModule(db, uid) {
  const collRef = db.collection('users').doc(uid).collection('tasks');
  return {
    subscribe: (listener) => collRef.onSnapshot(listener),
    save: (taskList) => taskList.forEach(t => collRef.doc(t.id.toString()).set(t))
  };
}

// 4. Módulo de Tareas (Operaciones en memoria)
const TaskModule = {
  list: [],
  add(task) {
    this.list.push(task);
  },
  clear() {
    this.list.length = 0;
  },
  flatten() {
    function recurse(tasks, lvl = 0, path = []) {
      return tasks.reduce((acc, t, i) => {
        acc.push({ task: t, level: lvl, path: [...path, i] });
        if (t.subtasks.length) {
          acc.push(...recurse(t.subtasks, lvl + 1, [...path, i]));
        }
        return acc;
      }, []);
    }
    return recurse(this.list);
  },
  getByPath(path) {
    return path.reduce((cur, idx) => cur.subtasks[idx], { subtasks: this.list });
  }
};

// 5. Módulo de UI
function setupUI(elements) {
  // Establecer valores por defecto en el formulario
  elements.setDefaults();
  // Listeners básicos de formulario y DOMContentLoaded
  window.addEventListener('DOMContentLoaded', () => {
    elements.setDefaults();
    elements.render();
  });
  elements.form.addEventListener('submit', elements.onSubmit);
}

// 6. Funciones de renderizado y lógica de UI
function renderTasks(elements) {
  const container = elements.taskContainer;
  container.innerHTML = '';
  const flat = TaskModule.flatten();
  if (!flat.length) {
    container.innerHTML = '<p class="text-gray-500">No hay tareas aún.</p>';
    return;
  }
  // ... Construir tabla, filas y listeners ...
}

function toggleSubtaskPanel(path, elements) {
  const task = TaskModule.getByPath(path);
  // ... Crear o eliminar panel de subtareas ...
}

// 7. Integración: ensamblar módulos
(function main() {
  const firebaseConfig = { /* tu config */ };
  const fb = initFirebase(firebaseConfig);

  const ui = {
    loginBtn: document.getElementById('loginBtn'),
    logoutBtn: document.getElementById('logoutBtn'),
    form: document.getElementById('task-form'),
    taskContainer: document.getElementById('task-container'),
    setDefaults: setDefaultFormValues,
    render: () => renderTasks(ui)
  };

  setupAuth(fb, ui,
    user => {
      const data = createDataModule(fb.db, user.uid);
      data.subscribe(snapshot => {
        TaskModule.clear();
        snapshot.forEach(doc => TaskModule.add({ id: doc.id, ...doc.data() }));
        ui.render();
      });
      ui.loginBtn.classList.add('hidden');
      ui.logoutBtn.classList.remove('hidden');
    },
    () => {
      ui.logoutBtn.classList.add('hidden');
      ui.loginBtn.classList.remove('hidden');
      TaskModule.clear();
      ui.render();
    }
  );

  setupUI({
    form: ui.form,
    taskContainer: ui.taskContainer,
    setDefaults: setDefaultFormValues,
    onSubmit: e => {
      e.preventDefault();
      const task = {
        id: Date.now(),
        title: ui.form.elements['title'].value.trim(),
        /* ... resto de campos ... */
        subtasks: []
      };
      TaskModule.add(task);
      data.save(TaskModule.list);
      ui.form.reset();
      ui.setDefaults();
      ui.render();
    }
  });
})();

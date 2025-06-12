// components/task-modal.js
// ────────────────────────────────────────────────────────────────────────────
const tmpl = document.createElement('template');
tmpl.innerHTML = /*html*/`
  <style>
    .overlay {
      position: fixed; inset: 0;
      background: rgba(0,0,0,0.4);
      display: none; align-items: center; justify-content: center;
    }
    .overlay.show { display: flex; }
    .modal {
      background: white; padding: 1rem; border-radius: .5rem;
      max-width: 600px; width: 90%;
    }
  </style>

  <div class="overlay" id="overlay">
    <div class="modal" role="dialog" aria-modal="true">
      <slot name="title"><h2>Task</h2></slot>
      <slot name="body"></slot>

      <div class="text-right" style="margin-top:1rem">
        <button id="saveBtn" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">💾 Guardar</button>
        <button id="closeBtn" class="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded">✖️</button>
      </div>
    </div>
  </div>
`;

class TaskModal extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' }).append(tmpl.content.cloneNode(true));
    // dependencies injected by host
    this.priorities = [];            // e.g. ['Alta','Media',…]
    this.onSave     = () => {};      // callback supplied by host
  }

  connectedCallback() {
    // form is in light-DOM, not shadow
    this.form = this.querySelector('form');

    // save button → collect data → call host callback
    this.shadowRoot.getElementById('saveBtn').onclick = () => {
        const data = Object.fromEntries(new FormData(this.form));
        this.onSave(data);
        this.hide();
        };

    // close button or backdrop
    this.shadowRoot.getElementById('closeBtn').onclick = () => this.hide();
    this.shadowRoot.getElementById('overlay').onclick  = e => {
        if (e.target.id === 'overlay') this.hide();
        };

    // Esc key
    document.addEventListener('keyup', e => {
        if (e.key === 'Escape') this.hide();
        });
    }

  /** Opens the modal.  If a task object is supplied, pre-fills the form. */
  show(taskData = {}) {
    // fill priorities
    const sel = this.form.elements.priority;
    sel.innerHTML = '';
    this.priorities.forEach(p => sel.add(new Option(p, p)));

    // populate fields for edit
    Object.entries(taskData).forEach(([k, v]) => {
      if (this.form.elements[k]) this.form.elements[k].value = v;
    });
    this.form.elements.editId.value = taskData.id ?? '';
    // reveal
    this.shadowRoot.getElementById('overlay').classList.add('show');
  }

  hide() {
    this.shadowRoot.getElementById('overlay').classList.remove('show');
  }
}

customElements.define('task-modal', TaskModal);

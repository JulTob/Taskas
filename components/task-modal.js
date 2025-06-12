// components/task-modal.js

const tmpl = document.createElement('template');
tmpl.innerHTML = /*html*/`
  <style>
    .overlay { position: fixed; inset:0; background: rgba(0,0,0,0.4); display:none; align-items:center; justify-content:center; }
    .overlay.show { display:flex; }
    .modal { background:white; padding:1rem; border-radius:.5rem; max-width:600px; width:90%; }
  </style>
  <div class="overlay" id="overlay">
    <div class="modal" role="dialog" aria-modal="true">
      <slot name="title"><h2>Task</h2></slot>
      <slot name="body"></slot>
      <div class="text-right">
        <button id="saveBtn">💾 Guardar</button>
        <button id="closeBtn">✖️</button>
      </div>
    </div>
  </div>
`;

class TaskModal extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' }).append(tmpl.content.cloneNode(true));
    // CONTRACT: dependencies must be set by host:
    this.priorities = [];        // array of strings
    this.onSave = d => {};       // callback function
  }

  connectedCallback() {
    this.form = this.shadowRoot.querySelector('form');
    this.shadowRoot.getElementById('saveBtn')
        .onclick = () => {
      const data = Object.fromEntries(new FormData(this.form));
      this.onSave(data);        // trigger host logic
      this.hide();
    };
    this.shadowRoot.getElementById('closeBtn')
        .onclick = () => this.hide();
    this.shadowRoot.getElementById('overlay')
        .onclick = e => {
      if (e.target.id === 'overlay') this.hide();
    };
    document.addEventListener('keyup', e => {
      if (e.key === 'Escape') this.hide();
    });
  }

  show(data = {}) {
    // populate priority dropdown
    const sel = this.form.elements['priority'];
    sel.innerHTML = '';
    this.priorities.forEach(p => sel.add(new Option(p, p)));

    // fill form with data if edit
    Object.entries(data).forEach(([k, v]) => {
      if (this.form.elements[k]) this.form.elements[k].value = v;
    });

    this.shadowRoot.getElementById('overlay')
        .classList.add('show');
  }

  hide() {
    this.shadowRoot.getElementById('overlay')
        .classList.remove('show');
  }
}

customElements.define('task-modal', TaskModal);

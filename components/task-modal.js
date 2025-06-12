const tmpl = document.createElement('template');
tmpl.innerHTML = /*html*/`
  <style>
    /* Scoped styles, emulate Tailwind if needed */
    .modal-overlay { position: fixed; inset:0; background:rgba(0,0,0,0.4); display:none; align-items:center; justify-content:center; }
    .modal { background:white; padding:1rem; border-radius:.5rem; max-width:600px; width:90%; }
    .modal.show { display:flex; }
  </style>
  <div class="modal-overlay" id="overlay">
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
  constructor(){
    super();
    this.attachShadow({ mode: 'open' }).append(tmpl.content.cloneNode(true));
  }
  connectedCallback() {
    const overlay = this.shadowRoot.getElementById('overlay');
    this.shadowRoot.getElementById('closeBtn').onclick = () => this.hide();
    this.shadowRoot.getElementById('saveBtn').onclick = () => {
      this.dispatchEvent(new CustomEvent('modal.Save', { bubbles: true }));
      this.hide();
    };
    overlay.addEventListener('click', e => { if (e.target === overlay) this.hide(); });
    document.addEventListener('keyup', e => { if (e.key === 'Escape') this.hide(); });
  }
  show(){
    this.shadowRoot.getElementById('overlay').classList.add('show');
    this.dispatchEvent(new Event('modal.Shown', { bubbles: true }));
  }
  hide(){
    this.shadowRoot.getElementById('overlay').classList.remove('show');
    this.dispatchEvent(new Event('modal.Hidden', { bubbles: true }));
  }
}
customElements.define('task-modal', TaskModal);

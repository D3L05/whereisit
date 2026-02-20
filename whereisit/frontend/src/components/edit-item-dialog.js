import { LitElement, html, css } from 'lit';
import '@material/mwc-dialog';
import '@material/mwc-button';
import '@material/mwc-textfield';

export class EditItemDialog extends LitElement {
    static styles = css`
    mwc-textfield {
      width: 100%;
      margin-top: 16px;
    }
    .file-input {
      margin-top: 16px;
      width: 100%;
    }
    .file-input label {
      display: block;
      margin-bottom: 4px;
      color: var(--mdc-theme-text-secondary-on-background, rgba(0, 0, 0, 0.6));
      font-family: Roboto, sans-serif;
      font-size: 0.75rem;
    }
    .current-photo {
        max-width: 100%;
        max-height: 200px;
        margin-top: 8px;
        border-radius: 8px;
        object-fit: contain;
    }
    .delete-section {
      margin-top: 24px;
      padding-top: 16px;
      border-top: 1px solid #eee;
    }
  `;

    static properties = {
        item: { type: Object }
    };

    constructor() {
        super();
        this.item = null;
    }

    async show(item) {
        this.item = item;
        await this.updateComplete;
        this.shadowRoot.querySelector('mwc-dialog').show();
    }

    render() {
        if (!this.item) return html``;

        return html`
      <mwc-dialog heading="Edit Item">
        <div>
          <mwc-textfield id="name" label="Name" .value=${this.item.name} dialogInitialFocus></mwc-textfield>
          <mwc-textfield id="description" label="Description" .value=${this.item.description || ''} icon="description"></mwc-textfield>
          <mwc-textfield id="category" label="Category" .value=${this.item.category || ''} icon="category"></mwc-textfield>
          <mwc-textfield id="quantity" label="Quantity" type="number" .value=${this.item.quantity} icon="numbers"></mwc-textfield>
          
          <div class="file-input">
            <label>Update Photo</label>
            <input type="file" id="photo-upload" accept="image/*" capture="environment" />
            ${this.item.photo_path
                ? html`<img src="${window.AppRouter ? window.AppRouter.urlForPath(this.item.photo_path) : this.item.photo_path}" class="current-photo" />`
                : ''}
          </div>
        </div>
        
        <div class="delete-section">
            <mwc-button @click=${this._delete} style="--mdc-theme-primary: #f44336;">Delete Item</mwc-button>
        </div>

        <mwc-button slot="primaryAction" @click=${this._save}>Save</mwc-button>
        <mwc-button slot="secondaryAction" dialogAction="close">Cancel</mwc-button>
      </mwc-dialog>
    `;
    }

    async _save() {
        const name = this.shadowRoot.getElementById('name').value;
        const description = this.shadowRoot.getElementById('description').value;
        const category = this.shadowRoot.getElementById('category').value;
        const quantity = parseInt(this.shadowRoot.getElementById('quantity').value);
        const photoInput = this.shadowRoot.getElementById('photo-upload');

        try {
            const url = window.AppRouter ? window.AppRouter.urlForPath(`/api/items/${this.item.id}`) : `api/items/${this.item.id}`;
            const response = await fetch(url, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, description, category, quantity })
            });

            if (response.ok) {
                // Handle optional photo update
                if (photoInput.files && photoInput.files.length > 0) {
                    const file = photoInput.files[0];
                    const formData = new FormData();
                    formData.append('file', file);

                    const uploadUrl = window.AppRouter ? window.AppRouter.urlForPath(`/api/items/${this.item.id}/photo`) : `api/items/${this.item.id}/photo`;
                    await fetch(uploadUrl, { method: 'POST', body: formData });
                }

                this.dispatchEvent(new CustomEvent('item-updated'));
                this.shadowRoot.querySelector('mwc-dialog').close();
                if (photoInput) photoInput.value = "";
            }
        } catch (e) {
            console.error(e);
        }
    }

    async _delete() {
        if (!confirm(`Are you sure you want to delete "${this.item.name}"?`)) return;

        try {
            const response = await fetch(`api/items/${this.item.id}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                this.dispatchEvent(new CustomEvent('item-deleted'));
                this.shadowRoot.querySelector('mwc-dialog').close();
            }
        } catch (e) {
            console.error(e);
        }
    }
}

customElements.define('edit-item-dialog', EditItemDialog);

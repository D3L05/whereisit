import { LitElement, html, css } from 'lit';
import '@material/mwc-dialog';
import '@material/mwc-textfield';
import '@material/mwc-button';

export class AddItemDialog extends LitElement {
    static styles = css`
      :host { display: block; }
      mwc-textfield {
        width: 100%;
        margin-bottom: 16px;
      }
      .file-input {
        margin-top: 8px;
        margin-bottom: 16px;
        width: 100%;
      }
      .file-input label {
        display: block;
        margin-bottom: 4px;
        color: var(--mdc-theme-text-secondary-on-background, rgba(0, 0, 0, 0.6));
        font-family: Roboto, sans-serif;
        font-size: 0.75rem;
      }
    `;

    static properties = {
        boxId: { type: Number }
    };

    render() {
        return html`
        <mwc-dialog heading="Add Item">
          <div>
            <mwc-textfield label="Name" dialogInitialFocus></mwc-textfield>
            <mwc-textfield label="Description" icon="description"></mwc-textfield>
            <mwc-textfield label="Category" icon="category"></mwc-textfield>
            <mwc-textfield label="Quantity" type="number" icon="numbers" value="1"></mwc-textfield>
            <div class="file-input">
                <label>Photo</label>
                <input type="file" id="photo-upload" accept="image/*" capture="environment" />
            </div>
          </div>
          <mwc-button slot="primaryAction" @click=${this._save}>Save</mwc-button>
          <mwc-button slot="secondaryAction" dialogAction="cancel">Cancel</mwc-button>
        </mwc-dialog>
      `;
    }

    show() {
        this.shadowRoot.querySelector('mwc-dialog').show();
    }

    async _save() {
        const inputs = this.shadowRoot.querySelectorAll('mwc-textfield');
        const name = inputs[0].value;
        const description = inputs[1].value;
        const category = inputs[2].value;
        const quantity = parseInt(inputs[3].value) || 1;
        const photoInput = this.shadowRoot.getElementById('photo-upload');

        if (!name) {
            inputs[0].setCustomValidity("Name is required");
            inputs[0].reportValidity();
            return;
        }

        try {
            const response = await fetch(window.AppRouter ? window.AppRouter.urlForPath(`/api/boxes/${this.boxId}/items`) : `api/boxes/${this.boxId}/items`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, description, category, quantity })
            });

            if (response.ok) {
                const createdItem = await response.json();

                // If a photo was selected, upload it now
                if (photoInput.files && photoInput.files.length > 0) {
                    const file = photoInput.files[0];
                    const formData = new FormData();
                    formData.append('file', file);

                    const uploadUrl = window.AppRouter ? window.AppRouter.urlForPath(`/api/items/${createdItem.id}/photo`) : `api/items/${createdItem.id}/photo`;
                    await fetch(uploadUrl, { method: 'POST', body: formData });
                }

                this.dispatchEvent(new CustomEvent('item-added', { bubbles: true, composed: true }));
                this.shadowRoot.querySelector('mwc-dialog').close();
                inputs.forEach(i => i.value = '');
                inputs[3].value = "1";
                if (photoInput) photoInput.value = "";

            } else {
                alert('Failed to save item');
            }
        } catch (e) {
            console.error("Error saving item", e);
            alert('Error saving item');
        }
    }
}
customElements.define('add-item-dialog', AddItemDialog);

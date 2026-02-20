import { LitElement, html, css } from 'lit';
import '@material/mwc-icon-button';
import '@material/mwc-fab';
import '@material/mwc-list';
import '@material/mwc-list/mwc-list-item.js';
import '@material/mwc-dialog';
import '../components/add-item-dialog.js';
import '../components/edit-box-dialog.js';
import '../components/edit-item-dialog.js';

export class BoxView extends LitElement {
    static styles = css`
    :host { display: block; height: 100%; position: relative; }
    .header {
      display: flex;
      align-items: center;
      padding: 0 16px;
      justify-content: space-between;
    }
    .header-left {
        display: flex;
        align-items: center;
    }
    .header-title {
        display: flex;
        align-items: center;
        gap: 8px;
    }
    .header-actions {
        display: flex;
    }
    .qr-code {
        width: 150px;
        height: 150px;
        margin: 0 auto;
        display: block;
    }
    .qr-container {
        text-align: center;
        padding: 16px;
    }
    mwc-fab {
      position: fixed;
      bottom: 24px;
      right: 24px;
    }
    mwc-list-item {
        --mdc-list-item-meta-size: 80px;
    }
    .item-meta {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        width: 80px;
    }
  `;

    static properties = {
        location: { type: Object },
        box: { type: Object }
    };

    constructor() {
        super();
        this.box = null;
    }

    onBeforeEnter(location) {
        this.boxId = location.params.id;
        this._fetchBox(this.boxId);
    }

    async _fetchBox(id) {
        try {
            // Check if id is a number or a slug
            const isNumber = !isNaN(id) && !isNaN(parseFloat(id));
            const endpoint = isNumber ? `/api/boxes/${id}` : `/api/boxes/slug/${id}`;

            console.log(`[Prod Debug] Fetching box from: ${endpoint} (original id: ${id})`);

            const url = window.AppRouter ? window.AppRouter.urlForPath(endpoint) : endpoint;
            const response = await fetch(url);

            if (response.ok) {
                this.box = await response.json();
                this.boxId = this.box.id; // Correct to real ID if it was a slug
            } else {
                console.error("Box fetch failed", response.status);
            }
        } catch (e) {
            console.error("Error fetching box", e);
        }
    }

    render() {
        if (!this.box) return html`<p>Loading...</p>`;

        return html`
      <div class="header">
        <div class="header-left">
            <mwc-icon-button icon="arrow_back" @click=${this._goBack}></mwc-icon-button>
            <div class="header-title">
                <h2 style="margin:0;">${this.box.name}</h2>
                <mwc-icon-button icon="edit" @click=${this._openEditBoxDialog} style="--mdc-icon-size: 20px; color: gray;"></mwc-icon-button>
            </div>
        </div>
        <div class="header-actions">
            <mwc-icon-button icon="print" @click=${this._printLabel} title="Print Label"></mwc-icon-button>
            <mwc-icon-button icon="qr_code" @click=${this._showQR} title="View QR Code"></mwc-icon-button>
        </div>
      </div>

      <mwc-list>
        ${this.box.items.map(item => html`
            <mwc-list-item twoline graphic="medium" hasMeta @click=${(e) => this._openItemDetail(e, item)}>
                <span>${item.name}</span>
                <span slot="secondary">
                    ${item.description || ''} 
                    ${item.category ? html`<span style="margin-left: 8px; font-style: italic; color: var(--mdc-theme-primary);">[${item.category}]</span>` : ''}
                </span>
                
                ${item.photo_path
                ? html`<img slot="graphic" src="${window.AppRouter ? window.AppRouter.urlForPath(item.photo_path) : item.photo_path}" style="width: 56px; height: 56px; object-fit: cover; border-radius: 4px;" />`
                : html`<mwc-icon slot="graphic">category</mwc-icon>`}

                <div slot="meta" class="item-meta">
                    <span style="margin-right:8px;">x${item.quantity}</span>
                </div>
            </mwc-list-item>
        `)}
      </mwc-list>

      <mwc-fab icon="add" @click=${this._openAddItemDialog}></mwc-fab>
      <add-item-dialog .boxId=${this.boxId} @item-added=${() => this._fetchBox(this.boxId)}></add-item-dialog>
      <edit-box-dialog .box=${this.box} @box-updated=${() => this._fetchBox(this.boxId)} @box-deleted=${this._handleBoxDeleted}></edit-box-dialog>
      <edit-item-dialog @item-updated=${() => this._fetchBox(this.boxId)} @item-deleted=${() => this._fetchBox(this.boxId)}></edit-item-dialog>

      <mwc-dialog id="qrDialog" heading="QR Code">
        <div class="qr-container">
            <img class="qr-code" src="${window.AppRouter ? window.AppRouter.urlForPath(`/api/boxes/${this.box.id}/qrcode`) : `api/boxes/${this.box.id}/qrcode`}" alt="QR Code" />
            <p>Scan to open this box</p>
        </div>
        <mwc-button slot="primaryAction" dialogAction="close">Close</mwc-button>
      </mwc-dialog>
    `;
    }

    _goBack() {
        let url = '/';
        if (this.box && this.box.unit_id) {
            url = `/unit/${this.box.unit_id}`;
        }

        let targetUrl = url;
        if (window.AppRouter) {
            targetUrl = window.AppRouter.urlForPath(url).replace(/([^:])\/\/+/g, '$1/');
        }

        console.log(`[Prod Debug] BoxView _goBack to: ${targetUrl}`);

        try {
            Router.go(targetUrl);
            setTimeout(() => {
                const current = window.location.pathname;
                // Robust check for ingress paths
                if (!current.endsWith(url) && !current.endsWith(url + '/')) {
                    console.warn("[Prod Debug] BoxView backnav failed. Forcing:", targetUrl);
                    window.location.href = targetUrl;
                }
            }, 100);
        } catch (e) {
            window.location.href = targetUrl;
        }
    }

    _openAddItemDialog() {
        this.shadowRoot.querySelector('add-item-dialog').show();
    }

    _openEditBoxDialog() {
        this.shadowRoot.querySelector('edit-box-dialog').show(this.box);
    }

    _openItemDetail(e, item) {
        if (e && e.stopPropagation) {
            e.stopPropagation();
        }

        // Find the global dialog injected by the main app
        const app = document.querySelector('where-is-it-app');
        if (!app) {
            console.error("Could not find where-is-it-app");
            return;
        }

        const dialog = app.shadowRoot.getElementById('globalItemDetailDialog');
        if (dialog) {
            dialog.show({ ...item, box: this.box });

            // Listen for the edit request from the detail dialog
            const editHandler = (ev) => {
                dialog.removeEventListener('edit-item-requested', editHandler);
                this._openEditItemDialog(null, ev.detail.item);
            };
            dialog.addEventListener('edit-item-requested', editHandler);
        } else {
            console.error("Could not find globalItemDetailDialog");
        }
    }

    _openEditItemDialog(e, item) {
        if (e && e.stopPropagation) {
            e.stopPropagation();
        }
        this.shadowRoot.querySelector('edit-item-dialog').show(item);
    }

    _handleBoxDeleted() {
        this._goBack();
    }

    _showQR() {
        this.shadowRoot.getElementById('qrDialog').show();
    }

    async _printLabel() {
        // Fetch unit data if missing to get unit name
        let unitName = "Storage Unit";
        try {
            const unitResponse = await fetch(window.AppRouter ? window.AppRouter.urlForPath(`/api/units/${this.box.unit_id}`) : `api/units/${this.box.unit_id}`);
            if (unitResponse.ok) {
                const unitData = await unitResponse.json();
                unitName = unitData.name;
            }
        } catch (e) {
            console.warn("Could not fetch unit name for print", e);
        }

        const qrUrl = window.AppRouter ? window.AppRouter.urlForPath(`/api/boxes/${this.box.id}/qrcode`) : `api/boxes/${this.box.id}/qrcode`;

        // Create hidden iframe for printing
        const iframe = document.createElement('iframe');
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = '0';
        document.body.appendChild(iframe);

        const doc = iframe.contentWindow.document;
        doc.open();
        doc.write(`
            <html>
                <head>
                    <title>Print Label - ${this.box.name}</title>
                    <style>
                        body {
                            font-family: 'Inter', system-ui, sans-serif;
                            display: flex;
                            flex-direction: column;
                            align-items: center;
                            justify-content: center;
                            height: 100vh;
                            margin: 0;
                            text-align: center;
                            padding: 20px;
                        }
                        .label-container {
                            border: 2px solid #000;
                            padding: 24px 16px;
                            border-radius: 12px;
                            width: 320px;
                            display: flex;
                            flex-direction: column;
                            align-items: center;
                        }
                        .qr-img {
                            width: 240px;
                            height: 240px;
                            margin-bottom: 16px;
                        }
                        .box-name {
                            font-size: 32px;
                            font-weight: 900;
                            line-height: 1.1;
                            margin-bottom: 8px;
                            color: #000;
                        }
                        .unit-name {
                            font-size: 16px;
                            font-weight: 500;
                            color: #444;
                            margin-bottom: 8px;
                        }
                        .slug {
                            margin-top: 8px;
                            font-family: monospace;
                            font-size: 14px;
                            color: #666;
                            background: #f5f5f5;
                            padding: 4px 8px;
                            border-radius: 4px;
                        }
                        @media print {
                            body { width: 100%; height: auto; }
                            .label-container { border: none; padding: 0; }
                        }
                    </style>
                </head>
                <body>
                    <div class="label-container">
                        <img src="${qrUrl}" class="qr-img" />
                        <div class="box-name">${this.box.name}</div>
                        <div class="unit-name">${unitName}</div>
                        <div class="slug">ID: ${this.box.slug}</div>
                    </div>
                    <script>
                        window.onload = () => {
                            window.print();
                            // Close/remove after print dialog closes
                            setTimeout(() => {
                                window.parent.document.body.removeChild(window.frameElement);
                            }, 1000);
                        };
                    </script>
                </body>
            </html>
        `);
        doc.close();
    }
}
customElements.define('box-view', BoxView);

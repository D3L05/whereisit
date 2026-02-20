import { LitElement, html, css } from 'lit';
import '@material/mwc-textfield';
import '@material/mwc-list';
import '@material/mwc-list/mwc-list-item.js';
import { Router } from '@vaadin/router';
import '@material/mwc-icon';

export class SearchView extends LitElement {
    static styles = css`
    :host { display: block; padding: 16px; }
    mwc-textfield { width: 100%; margin-bottom: 16px; }
    .results { background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
  `;

    static properties = {
        results: { type: Object }
    };

    constructor() {
        super();
        this.results = { boxes: [], items: [] };
    }

    render() {
        return html`
      <h2>Search</h2>
      <mwc-textfield label="Search items or boxes" icon="search" @input=${this._handleInput}></mwc-textfield>

      <div class="results">
        <mwc-list>
            <mwc-list-item noninteractive><b>Boxes</b></mwc-list-item>
            ${this.results.boxes.map(box => html`
                <mwc-list-item twoline graphic="icon" @click=${() => this._navigateToBox(box.id)}>
                    <span>${box.name}</span>
                    <span slot="secondary">${box.description || ''}</span>
                    <mwc-icon slot="graphic">inventory_2</mwc-icon>
                </mwc-list-item>
            `)}
            ${this.results.boxes.length === 0 ? html`<mwc-list-item noninteractive>No boxes found</mwc-list-item>` : ''}

            <li divider role="separator"></li>

            <mwc-list-item noninteractive><b>Items</b></mwc-list-item>
            ${this.results.items.map(item => html`
                <mwc-list-item twoline graphic="medium" @click=${() => this._navigateToBox(item.box_id)}>
                    <span>${item.name}</span>
                    <span slot="secondary">
                        In: ${item.box ? item.box.name : 'Unknown Box'} 
                        ${item.category ? html`<span style="margin-left: 8px; font-style: italic; color: var(--mdc-theme-primary);">[${item.category}]</span>` : ''}
                    </span>
                    ${item.photo_path
                ? html`<img slot="graphic" src="${window.AppRouter ? window.AppRouter.urlForPath(item.photo_path) : item.photo_path}" style="width: 56px; height: 56px; object-fit: cover; border-radius: 4px;" />`
                : html`<mwc-icon slot="graphic">category</mwc-icon>`}
                </mwc-list-item>
            `)}
             ${this.results.items.length === 0 ? html`<mwc-list-item noninteractive>No items found</mwc-list-item>` : ''}
        </mwc-list>
      </div>
    `;
    }

    async _handleInput(e) {
        const query = e.target.value;
        if (query.length < 2) {
            this.results = { boxes: [], items: [] };
            return;
        }

        try {
            const response = await fetch(window.AppRouter ? window.AppRouter.urlForPath(`/api/search?q=${query}`) : `api/search?q=${query}`);
            if (response.ok) {
                this.results = await response.json();
            }
        } catch (e) {
            console.error(e);
        }
    }

    _navigateToBox(id) {
        const originalPath = `/box/${id}`;
        let targetUrl = originalPath;
        if (window.AppRouter) {
            targetUrl = window.AppRouter.urlForPath(originalPath).replace(/([^:])\/\/+/g, '$1/');
        }

        console.log(`[Prod Debug] SearchView navigating to: ${targetUrl}`);

        try {
            Router.go(targetUrl);
            setTimeout(() => {
                const current = window.location.pathname;
                if (!current.endsWith(originalPath) && !current.endsWith(originalPath + '/')) {
                    console.warn("[Prod Debug] SearchView nav failed. Forcing:", targetUrl);
                    window.location.href = targetUrl;
                }
            }, 100);
        } catch (e) {
            window.location.href = targetUrl;
        }
    }
}
customElements.define('search-view', SearchView);

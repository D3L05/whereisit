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
    .category-chips {
      display: flex;
      gap: 8px;
      overflow-x: auto;
      padding-bottom: 16px;
      margin-bottom: 8px;
    }
    .chip {
      background: #e0e0e0;
      border: none;
      border-radius: 16px;
      padding: 6px 12px;
      font-size: 0.875rem;
      cursor: pointer;
      white-space: nowrap;
      font-family: Roboto, sans-serif;
    }
    .chip.selected {
      background: var(--mdc-theme-primary, #6200ee);
      color: white;
    }
  `;

    static properties = {
        results: { type: Object },
        categories: { type: Array },
        selectedCategory: { type: String }
    };

    constructor() {
        super();
        this.results = { boxes: [], items: [] };
        this.categories = [];
        this.selectedCategory = null;
    }

    async connectedCallback() {
        super.connectedCallback();
        try {
            // Avoid urlForPath stripping unknown routes.
            const apiPath = window.AppRouter ? window.AppRouter.urlForPath('/') : '/';
            // strip trailing slash if exists to safely append
            const base = apiPath.endsWith('/') ? apiPath.slice(0, -1) : apiPath;

            const response = await fetch(`${base}/api/categories`);
            if (response.ok) {
                this.categories = await response.json();
                this.requestUpdate(); // Force lit to notice the array change
            } else {
                console.error("Categories fetch returned non-ok status:", response.status);
            }
        } catch (e) {
            console.error("Failed to load categories in search view", e);
        }
    }

    render() {
        return html`
      <h2>Search</h2>
      <mwc-textfield id="searchInput" label="Search items or boxes" icon="search" @input=${this._handleInput}></mwc-textfield>

      ${this.categories && this.categories.length > 0 ? html`
        <div class="category-chips">
            <button class="chip ${!this.selectedCategory ? 'selected' : ''}" @click=${() => this._selectCategory(null)}>All</button>
            ${this.categories.map(c => html`
                <button class="chip ${this.selectedCategory === c ? 'selected' : ''}" @click=${() => this._selectCategory(c)}>${c}</button>
            `)}
        </div>
      ` : ''}

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
                <mwc-list-item twoline graphic="medium" @click=${(e) => this._openItemDetail(e, item)}>
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

    async _handleInput() {
        this._performSearch();
    }

    _selectCategory(category) {
        this.selectedCategory = category;
        this._performSearch();
    }

    async _performSearch() {
        // Debounce slightly or just execute immediately
        const input = this.shadowRoot.getElementById('searchInput');
        const query = input ? input.value.trim() : '';

        // Only block if BOTH text is empty AND no category is selected
        if (query.length < 2 && !this.selectedCategory) {
            this.results = { boxes: [], items: [] };
            return;
        }

        try {
            // Build the query string separately because urlForPath strips query parameters
            let qs = `?q=${encodeURIComponent(query)}`;
            if (this.selectedCategory) {
                qs += `&category=${encodeURIComponent(this.selectedCategory)}`;
            }

            const apiPath = window.AppRouter ? window.AppRouter.urlForPath('/api/search') : '/api/search';
            const response = await fetch(apiPath + qs);

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

    _openItemDetail(e, item) {
        if (e && e.stopPropagation) {
            e.stopPropagation();
        }

        // Find the global dialog injected by the main app
        const app = document.querySelector('where-is-it-app');
        if (!app) return;

        const dialog = app.shadowRoot.getElementById('globalItemDetailDialog');
        if (dialog) {
            // Note: In Search View, item.box is already loaded via the backend relationship
            dialog.show(item);

            // Listen for the edit request from the detail dialog
            const editHandler = (ev) => {
                dialog.removeEventListener('edit-item-requested', editHandler);
                // When we edit from search view, the cleanest way is to navigate to the box
                // and open the edit dialog there. For now, let's just navigate to the box.
                this._navigateToBox(ev.detail.item.box_id);
            };
            dialog.addEventListener('edit-item-requested', editHandler);
        }
    }
}
customElements.define('search-view', SearchView);

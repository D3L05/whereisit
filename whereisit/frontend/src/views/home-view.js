import { LitElement, html, css } from 'lit';
import '@material/mwc-button';
import '@material/mwc-icon';
import '@material/mwc-fab';
import '@material/mwc-textfield';
import '@material/mwc-list';
import '@material/mwc-list/mwc-list-item.js';
import { Router } from '@vaadin/router';
import '../components/add-unit-dialog.js';
import '../components/edit-unit-dialog.js';
import '../components/qr-scanner-dialog.js';

export class HomeView extends LitElement {
  static styles = css`
    :host {
      display: block;
    }
    .search-container {
      padding: 16px;
      padding-bottom: 8px;
    }
    mwc-textfield {
      width: 100%;
      --mdc-shape-small: 8px; /* Slightly rounded corners */
    }
    .search-results {
      margin: 8px 16px 16px 16px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.08); /* Premium soft shadow */
      overflow: hidden;
      border: 1px solid rgba(0,0,0,0.05);
    }
    .category-chips {
      display: flex;
      gap: 10px;
      overflow-x: auto;
      padding: 4px 16px 16px 16px;
      scrollbar-width: none; /* Hide scrollbar for cleaner look */
    }
    .category-chips::-webkit-scrollbar {
      display: none;
    }
    .chip {
      background: #f0f2f5; /* Light grey modern background */
      border: 1px solid transparent;
      border-radius: 20px;
      padding: 8px 16px;
      font-size: 0.875rem;
      font-weight: 500;
      color: #444;
      cursor: pointer;
      white-space: nowrap;
      font-family: Roboto, sans-serif;
      transition: all 0.2s ease;
      box-shadow: 0 1px 2px rgba(0,0,0,0.05);
    }
    .chip:hover {
      background: #e4e6e9;
      transform: translateY(-1px);
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .chip.selected {
      background: var(--mdc-theme-primary, #03a9f4);
      color: white;
      box-shadow: 0 2px 6px rgba(3, 169, 244, 0.4);
    }
    .search-section-title {
      padding: 16px 16px 8px 16px;
      font-size: 0.75rem;
      font-weight: 700;
      color: var(--mdc-theme-primary, #03a9f4);
      text-transform: uppercase;
      letter-spacing: 1.2px;
      background: #fafafa;
      border-bottom: 1px solid #eee;
    }
    .unit-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
      gap: 16px;
      padding: 16px;
    }
    .unit-card {
      background: white;
      border-radius: 8px;
      padding: 16px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      cursor: pointer;
      display: flex;
      flex-direction: column;
      align-items: center;
      transition: transform 0.2s;
    }
    .unit-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(0,0,0,0.15);
    }
    .unit-icon {
      font-size: 48px;
      color: var(--mdc-theme-primary);
      margin-bottom: 8px;
    }
    .unit-name {
      font-weight: 500;
      text-align: center;
      flex: 1;
    }
    .unit-card-header {
        width: 100%;
        display: flex;
        justify-content: flex-end;
    }
    .edit-btn {
        --mdc-icon-button-size: 32px;
        --mdc-icon-size: 20px;
        margin: -8px -8px 0 0;
        color: gray;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 16px 0 16px;
    }
    .header h2 {
      margin: 0;
    }
    .header-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .scan-btn {
        --mdc-theme-primary: var(--mdc-theme-secondary);
    }
    mwc-fab {
      position: fixed;
      bottom: 24px;
      right: 24px;
    }
  `;

  static properties = {
    units: { type: Array },
    searchResults: { type: Object },
    searchQuery: { type: String },
    categories: { type: Array },
    selectedCategory: { type: String }
  };

  constructor() {
    super();
    this.units = [];
    this.searchResults = { boxes: [], items: [] };
    this.searchQuery = '';
    this.categories = [];
    this.selectedCategory = null;
  }

  firstUpdated() {
    this._fetchUnits();
    this._fetchCategories();
  }

  async _fetchCategories() {
    try {
      const response = await fetch('api/categories');
      if (response.ok) {
        this.categories = await response.json();
        this.requestUpdate();
      }
    } catch (e) {
      console.error("Error fetching categories", e);
    }
  }

  async _fetchUnits() {
    try {
      const response = await fetch(window.AppRouter ? window.AppRouter.urlForPath('/api/units') : 'api/units');
      if (response.ok) {
        this.units = await response.json();
      }
    } catch (e) {
      console.error("Error fetching units", e);
    }
  }

  render() {
    const hasSearch = this.searchQuery.length >= 2 || this.selectedCategory !== null;

    return html`
      <div class="search-container">
        <mwc-textfield 
          label="Search items or boxes" 
          icon="search" 
          .value=${this.searchQuery}
          @input=${this._handleSearchInput}
          outlined
        ></mwc-textfield>
      </div>

      ${this.categories && this.categories.length > 0 ? html`
        <div class="category-chips">
            <button class="chip ${!this.selectedCategory ? 'selected' : ''}" @click=${() => this._selectCategory(null)}>All</button>
            ${this.categories.map(c => html`
                <button class="chip ${this.selectedCategory === c ? 'selected' : ''}" @click=${() => this._selectCategory(c)}>${c}</button>
            `)}
        </div>
      ` : ''}

      ${hasSearch ? html`
        <div class="search-results">
          <mwc-list>
            ${this.searchResults.boxes.length > 0 ? html`
              <div class="search-section-title">Boxes</div>
              ${this.searchResults.boxes.map(box => html`
                <mwc-list-item twoline graphic="icon" @click=${() => this._navigateToBox(box.id)} style="margin: 4px 8px; border-radius: 8px; overflow: hidden; --mdc-list-item-graphic-margin: 16px;">
                  <span>${box.name}</span>
                  <span slot="secondary">${box.items ? box.items.length : 0} items ${box.description ? `• ${box.description}` : ''}</span>
                  <mwc-icon slot="graphic" style="color: var(--mdc-theme-primary, #03a9f4); font-size: 32px; background: #e3f2fd; border-radius: 8px; display: flex; align-items: center; justify-content: center; width: 48px; height: 48px;">inventory_2</mwc-icon>
                </mwc-list-item>
              `)}
            ` : ''}

            ${this.searchResults.items.length > 0 ? html`
              <div class="search-section-title">Items</div>
              ${this.searchResults.items.map(item => html`
                <mwc-list-item twoline graphic="medium" @click=${(e) => this._openItemDetail(e, item)} style="margin: 4px 8px; border-radius: 8px; overflow: hidden; --mdc-list-item-graphic-margin: 16px;">
                  <span>${item.name}</span>
                  <span slot="secondary">In Box: ${item.box ? item.box.name : 'Unknown'} • Qty: ${item.quantity} ${item.category ? `• [${item.category}]` : ''}</span>
                  ${item.photo_path
        ? html`<img slot="graphic" src="${window.AppRouter ? window.AppRouter.urlForPath(item.photo_path) : item.photo_path}" style="width: 48px; height: 48px; object-fit: cover; border-radius: 8px; border: 1px solid #eee; box-shadow: 0 1px 3px rgba(0,0,0,0.1);" />`
        : html`<mwc-icon slot="graphic" style="color: gray; font-size: 32px; background: #f5f5f5; border-radius: 8px; display: flex; align-items: center; justify-content: center; width: 48px; height: 48px;">category</mwc-icon>`}
                </mwc-list-item>
              `)}
            ` : ''}

            ${(this.searchResults.boxes.length === 0 && this.searchResults.items.length === 0) ? html`
              <div style="padding: 32px 16px; text-align: center; color: #757575; display: flex; flex-direction: column; align-items: center;">
                <mwc-icon style="font-size: 48px; color: #e0e0e0; margin-bottom: 8px;">search_off</mwc-icon>
                <div style="font-size: 1rem; font-weight: 500; color: #424242;">No results found</div>
                <div style="font-size: 0.875rem; margin-top: 4px;">Try adjusting your search query or category filter</div>
              </div>
            ` : ''}
          </mwc-list>
        </div>
      ` : ''}

      <div class="header">
        <h2>Storage Units</h2>
        <div class="header-actions">
            <mwc-button class="scan-btn" label="Scan QR" icon="qr_code_scanner" @click=${this._openScanner}></mwc-button>
        </div>
      </div>
      
      <div class="unit-grid">
        ${this.units.length === 0 ? html`<p style="padding: 0 16px;">No units found.</p>` : ''}
        ${this.units.map(unit => html`
          <div class="unit-card" @click=${() => this._navigateToUnit(unit.id)}>
            <div class="unit-card-header">
                <mwc-icon-button class="edit-btn" icon="edit" @click=${(e) => this._openEditUnitDialog(e, unit)}></mwc-icon-button>
            </div>
            <mwc-icon class="unit-icon">warehouse</mwc-icon>
            <span class="unit-name">${unit.name}</span>
          </div>
        `)}
      </div>

      <mwc-fab icon="add" @click=${this._openAddUnitDialog}></mwc-fab>
      <add-unit-dialog @unit-added=${this._fetchUnits}></add-unit-dialog>
      <edit-unit-dialog @unit-updated=${this._fetchUnits} @unit-deleted=${this._fetchUnits}></edit-unit-dialog>
      <qr-scanner-dialog @qr-scanned=${this._handleQrScanned}></qr-scanner-dialog>
    `;
  }

  _openScanner() {
    this.shadowRoot.querySelector('qr-scanner-dialog').show();
  }

  _handleQrScanned(e) {
    const path = e.detail.path;
    console.log("[Prod Debug] Navigating to scanned path:", path);

    let targetUrl = path;
    if (window.AppRouter) {
      targetUrl = window.AppRouter.urlForPath(path).replace(/([^:])\/\/+/g, '$1/');
    }

    try {
      Router.go(targetUrl);
      setTimeout(() => {
        const current = window.location.pathname;
        if (!current.endsWith(path) && !current.endsWith(path + '/')) {
          window.location.href = targetUrl;
        }
      }, 100);
    } catch (err) {
      window.location.href = targetUrl;
    }
  }

  _openEditUnitDialog(e, unit) {
    e.stopPropagation();
    this.shadowRoot.querySelector('edit-unit-dialog').show(unit);
  }

  _handleSearchInput(e) {
    this.searchQuery = e.target.value;
    this._performSearch();
  }

  _selectCategory(category) {
    this.selectedCategory = category;
    this._performSearch();
  }

  async _performSearch() {
    if (this.searchQuery.length < 2 && !this.selectedCategory) {
      this.searchResults = { boxes: [], items: [] };
      return;
    }

    try {
      let qs = `api/search?q=${encodeURIComponent(this.searchQuery)}`;
      if (this.selectedCategory) {
        qs += `&category=${encodeURIComponent(this.selectedCategory)}`;
      }
      const response = await fetch(qs);
      if (response.ok) {
        this.searchResults = await response.json();
      }
    } catch (e) {
      console.error("Search error:", e);
    }
  }

  _navigateToBox(id) {
    const originalPath = `/box/${id}`;
    let targetUrl = originalPath;
    if (window.AppRouter) {
      targetUrl = window.AppRouter.urlForPath(originalPath).replace(/([^:])\/\/+/g, '$1/');
    }

    console.log(`[Prod Debug] HomeView (Search) navigating to: ${targetUrl}`);

    try {
      Router.go(targetUrl);
      setTimeout(() => {
        const current = window.location.pathname;
        if (!current.endsWith(originalPath) && !current.endsWith(originalPath + '/')) {
          console.warn("[Prod Debug] HomeView (Search) nav failed. Forcing:", targetUrl);
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

    const app = document.querySelector('where-is-it-app');
    if (!app) return;

    const dialog = app.shadowRoot.getElementById('globalItemDetailDialog');
    if (dialog) {
      dialog.show(item);

      const editHandler = (ev) => {
        dialog.removeEventListener('edit-item-requested', editHandler);
        this._navigateToBox(ev.detail.item.box_id);
      };
      dialog.addEventListener('edit-item-requested', editHandler);
    }
  }

  _navigateToUnit(id) {
    console.log("Navigating to unit:", id);
    let targetUrl = `/unit/${id}`;

    if (window.AppRouter) {
      targetUrl = window.AppRouter.urlForPath(targetUrl).replace(/([^:])\/\/+/g, '$1/');
    }

    try {
      Router.go(targetUrl);

      // HA INGRESS AGGRESSIVE FALLBACK: 
      // If the URL did not change within 50ms (the router swallowed the event), force a hard redirect
      setTimeout(() => {
        if (!window.location.pathname.endsWith(`/unit/${id}`)) {
          console.warn("[Prod Debug] Router.go failed silently! Forcing hard window navigation to:", targetUrl);
          window.location.href = targetUrl;
        }
      }, 50);
    } catch (e) {
      console.error("[Prod Debug] Router.go threw an exception:", e);
      window.location.href = targetUrl;
    }
  }

  _openAddUnitDialog() {
    this.shadowRoot.querySelector('add-unit-dialog').show();
  }
}

customElements.define('home-view', HomeView);

import { html, css, CSSResultGroup, nothing, PropertyValues } from 'lit';
import { customElement, property, state, query } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';
import { GardenElement } from '../GardenElement.js';

/**
 * Navigation history item.
 */
export interface WaypointHistoryItem {
  id: string;
  title: string;
  type: 'channel' | 'block' | 'home';
}

/**
 * Connected channel with shared block count.
 */
export interface WaypointConnection {
  channelId: string;
  channelTitle: string;
  sharedBlockCount: number;
}

/**
 * Recent/frequent visit for frecency sorting.
 */
export interface WaypointRecentItem {
  id: string;
  title: string;
  type: 'channel' | 'block';
  visitedAt: string; // ISO date string
}

/**
 * Search index item.
 */
export interface WaypointSearchItem {
  id: string;
  title: string;
  type: 'channel' | 'block';
  parentChannel?: string;
  blockCount?: number;
}

/**
 * Connect target for connect mode.
 */
export interface WaypointConnectTarget {
  id: string;
  title: string;
  type: 'block';
}

/**
 * Garden waypoint navigation modal.
 *
 * A compass for wandering without getting lost. Shows:
 * - Your navigation path (provenance)
 * - Connections from current context
 * - Recent wanderings (frecency)
 * - Fuzzy search for channels and blocks
 *
 * Supports two modes:
 * - navigate (default): Select destinations to navigate to
 * - connect: Select a channel to connect a block to
 *
 * @fires garden:navigate - When user selects a destination (navigate mode), with { id, type, title }
 * @fires garden:connect - When user selects a channel to connect to (connect mode), with { blockId, channelId, channelTitle }
 * @fires garden:create-channel - When user wants to create a new channel (connect mode)
 * @fires garden:close - When waypoint is closed
 */
@customElement('garden-waypoint')
export class GardenWaypoint extends GardenElement {
  static override styles: CSSResultGroup = [
    GardenElement.sharedStyles,
    css`
      :host {
        display: none;
        position: fixed;
        inset: 0;
        z-index: 1000;
      }

      :host([open]) {
        display: block;
      }

      /* Backdrop */
      .backdrop {
        position: absolute;
        inset: 0;
        background-image: var(--garden-dither-25);
        background-size: 4px 4px;
        opacity: 0;
        transition: opacity var(--garden-duration-normal) var(--garden-ease-out);
      }

      :host([open]) .backdrop {
        opacity: 1;
      }

      /* Modal container */
      .modal {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: min(500px, calc(100vw - var(--garden-space-8)));
        max-height: calc(100vh - var(--garden-space-16));
        background: var(--garden-bg);
        border: var(--garden-border-width) solid var(--garden-fg);
        display: flex;
        flex-direction: column;
        overflow: hidden;

        opacity: 0;
        transform: translate(-50%, -48%);
        transition:
          opacity var(--garden-duration-fast) var(--garden-ease-out),
          transform var(--garden-duration-fast) var(--garden-ease-out);
      }

      :host([open]) .modal {
        opacity: 1;
        transform: translate(-50%, -50%);
      }

      /* Header with search */
      .header {
        display: flex;
        align-items: center;
        padding: var(--garden-space-3) var(--garden-space-4);
        border-bottom: var(--garden-border-width) solid var(--garden-fg);
        gap: var(--garden-space-3);
      }

      .search-input {
        flex: 1;
        appearance: none;
        background: transparent;
        border: none;
        font: inherit;
        font-size: var(--garden-text-base);
        color: var(--garden-fg);
        outline: none;
      }

      .search-input::placeholder {
        color: var(--garden-fg-muted);
      }

      .hotkey {
        font-size: var(--garden-text-xs);
        color: var(--garden-fg-muted);
        padding: var(--garden-space-1) var(--garden-space-2);
        border: 1px solid var(--garden-fg-muted);
        border-radius: 2px;
        white-space: nowrap;
      }

      .close-btn {
        appearance: none;
        background: none;
        border: none;
        font: inherit;
        font-size: var(--garden-text-lg);
        color: var(--garden-fg-muted);
        cursor: pointer;
        padding: var(--garden-space-1);
        line-height: 1;
        transition: color var(--garden-duration-fast) var(--garden-ease-out);
      }

      .close-btn:hover {
        color: var(--garden-fg);
      }

      /* Content sections */
      .content {
        flex: 1;
        overflow-y: auto;
        padding: var(--garden-space-4);
      }

      .section {
        margin-bottom: var(--garden-space-5);
      }

      .section:last-child {
        margin-bottom: 0;
      }

      .section-title {
        font-size: var(--garden-text-xs);
        color: var(--garden-fg-muted);
        text-transform: uppercase;
        letter-spacing: 0.05em;
        margin-bottom: var(--garden-space-2);
      }

      /* Path / Breadcrumb */
      .path {
        display: flex;
        align-items: center;
        gap: var(--garden-space-2);
        flex-wrap: wrap;
      }

      .path-dot {
        appearance: none;
        background: none;
        border: 1px solid var(--garden-fg);
        border-radius: 50%;
        width: 8px;
        height: 8px;
        padding: 0;
        cursor: pointer;
        transition:
          background-color var(--garden-duration-fast) var(--garden-ease-out),
          background-image var(--garden-duration-fast) var(--garden-ease-out);
      }

      .path-dot:hover {
        background-image: var(--garden-dither-25);
        background-size: 4px 4px;
      }

      .path-dot[data-active] {
        background-image: var(--garden-dither-50);
        background-size: 2px 2px;
      }

      .path-dot:focus-visible {
        outline: var(--garden-focus-ring);
        outline-offset: 2px;
      }

      .path-separator {
        color: var(--garden-fg-muted);
        font-size: var(--garden-text-xs);
      }

      .path-label {
        font-size: var(--garden-text-sm);
        color: var(--garden-fg-muted);
      }

      /* Connection / Recent items */
      .item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: var(--garden-space-2) var(--garden-space-3);
        margin: 0 calc(-1 * var(--garden-space-3));
        cursor: pointer;
        transition: background-color var(--garden-duration-fast) var(--garden-ease-out);
      }

      .item:hover,
      .item[data-selected] {
        background-color: var(--garden-bg-subtle);
      }

      .item:focus-visible {
        outline: var(--garden-focus-ring);
        outline-offset: -2px;
      }

      .item-title {
        font-size: var(--garden-text-sm);
      }

      .item-meta {
        font-size: var(--garden-text-xs);
        color: var(--garden-fg-muted);
      }

      /* Empty states */
      .empty {
        font-size: var(--garden-text-sm);
        color: var(--garden-fg-muted);
        font-style: italic;
      }

      /* Search results */
      .results-group {
        margin-bottom: var(--garden-space-4);
      }

      .results-group:last-child {
        margin-bottom: 0;
      }

      .result-highlight {
        background-color: var(--garden-bg-muted);
        font-weight: 700;
      }

      .result-context {
        font-size: var(--garden-text-xs);
        color: var(--garden-fg-muted);
        margin-left: var(--garden-space-2);
      }

      /* Connect mode styles */
      .connect-header {
        font-size: var(--garden-text-sm);
        color: var(--garden-fg);
        padding-right: var(--garden-space-2);
        white-space: nowrap;
      }

      .connect-header .target-title {
        font-weight: 700;
      }

      .item-action {
        font-size: var(--garden-text-sm);
        color: var(--garden-fg-muted);
      }

      .item:hover .item-action,
      .item[data-selected] .item-action {
        color: var(--garden-fg);
      }

      .create-channel {
        display: flex;
        align-items: center;
        gap: var(--garden-space-2);
        padding: var(--garden-space-2) var(--garden-space-3);
        margin: var(--garden-space-3) calc(-1 * var(--garden-space-3)) 0;
        border-top: 1px solid var(--garden-fg-muted);
        cursor: pointer;
        font-size: var(--garden-text-sm);
        color: var(--garden-fg-muted);
        transition: color var(--garden-duration-fast) var(--garden-ease-out);
      }

      .create-channel:hover {
        color: var(--garden-fg);
      }

      .create-channel::before {
        content: '+';
        font-size: var(--garden-text-base);
      }

      /* Mobile */
      @media (max-width: 640px) {
        .modal {
          width: calc(100vw - var(--garden-space-4));
          max-height: calc(100vh - var(--garden-space-8));
        }

        .hotkey {
          display: none;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .backdrop,
        .modal {
          transition: none;
        }
      }
    `
  ];

  /** Whether the waypoint is open */
  @property({ type: Boolean, reflect: true })
  open = false;

  /** Waypoint mode: navigate to destinations or connect a block to a channel */
  @property()
  mode: 'navigate' | 'connect' = 'navigate';

  /** Target block for connect mode */
  @property({ type: Object })
  connectTarget?: WaypointConnectTarget;

  /** Navigation history (for path display) */
  @property({ type: Array })
  history: WaypointHistoryItem[] = [];

  /** Connections from current context */
  @property({ type: Array })
  connections: WaypointConnection[] = [];

  /** Recent/frequent visits */
  @property({ type: Array })
  recent: WaypointRecentItem[] = [];

  /** Search index */
  @property({ type: Array })
  searchIndex: WaypointSearchItem[] = [];

  @state()
  private _searchQuery = '';

  @state()
  private _selectedIndex = -1;

  @state()
  private _searchResults: WaypointSearchItem[] = [];

  @query('.search-input')
  private _searchInput!: HTMLInputElement;

  private _boundKeyHandler = this._handleGlobalKey.bind(this);

  override connectedCallback() {
    super.connectedCallback();
    document.addEventListener('keydown', this._boundKeyHandler);
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener('keydown', this._boundKeyHandler);
  }

  override updated(changedProperties: PropertyValues) {
    if (changedProperties.has('open') && this.open) {
      // Focus search input when opened
      requestAnimationFrame(() => {
        this._searchInput?.focus();
      });
    }
  }

  private _handleGlobalKey(e: KeyboardEvent) {
    // ⌘/ or Ctrl+/ to open
    if (e.key === '/' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      this.open = !this.open;
      if (!this.open) {
        this._resetState();
      }
      return;
    }

    // Only handle other keys when open
    if (!this.open) return;

    if (e.key === 'Escape') {
      e.preventDefault();
      if (this._searchQuery) {
        this._searchQuery = '';
        this._searchResults = [];
        this._selectedIndex = -1;
      } else {
        this.close();
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      this._navigateResults(1);
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      this._navigateResults(-1);
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      const keepOpen = e.metaKey || e.ctrlKey;
      this._selectCurrent(keepOpen);
      return;
    }
  }

  private _handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) {
      this.close();
    }
  }

  private _handleSearchInput(e: Event) {
    const input = e.target as HTMLInputElement;
    this._searchQuery = input.value;
    this._performSearch();
  }

  private _performSearch() {
    if (!this._searchQuery.trim()) {
      this._searchResults = [];
      this._selectedIndex = -1;
      return;
    }

    // Simple substring matching for now
    // TODO: Replace with fuzzysort for better matching
    const query = this._searchQuery.toLowerCase();
    this._searchResults = this.searchIndex
      .filter(item => item.title.toLowerCase().includes(query))
      .slice(0, 10);
    this._selectedIndex = this._searchResults.length > 0 ? 0 : -1;
  }

  private _navigateResults(delta: number) {
    const items = this._getNavigableItems();
    if (items.length === 0) return;

    this._selectedIndex = Math.max(
      0,
      Math.min(items.length - 1, this._selectedIndex + delta)
    );
  }

  private _getNavigableItems(): Array<{ id: string; type: string; title: string }> {
    if (this._searchResults.length > 0) {
      return this._searchResults;
    }
    // Could add connections and recent to navigable items
    return [];
  }

  private _selectCurrent(keepOpen: boolean) {
    const items = this._getNavigableItems();
    if (this._selectedIndex >= 0 && this._selectedIndex < items.length) {
      const item = items[this._selectedIndex];
      this._navigate(item.id, item.type, item.title, keepOpen);
    }
  }

  private _navigate(id: string, type: string, title: string, keepOpen = false) {
    this.emit('navigate', { id, type, title });
    if (!keepOpen) {
      this.close();
    }
  }

  private _connect(channelId: string, channelTitle: string) {
    if (!this.connectTarget) return;
    this.emit('connect', {
      blockId: this.connectTarget.id,
      blockTitle: this.connectTarget.title,
      channelId,
      channelTitle
    });
    this.close();
  }

  private _createChannel() {
    this.emit('create-channel', {
      connectTarget: this.connectTarget
    });
    // Keep open so user can see the new channel flow
  }

  private _resetState() {
    this._searchQuery = '';
    this._searchResults = [];
    this._selectedIndex = -1;
  }

  /** Open the waypoint */
  show() {
    this.open = true;
  }

  /** Close the waypoint */
  close() {
    this.open = false;
    this._resetState();
    this.emit('close', {});
  }

  private _formatTimeAgo(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  }

  private _highlightMatch(text: string, query: string): unknown {
    if (!query) return text;
    const index = text.toLowerCase().indexOf(query.toLowerCase());
    if (index === -1) return text;

    const before = text.slice(0, index);
    const match = text.slice(index, index + query.length);
    const after = text.slice(index + query.length);

    return html`${before}<span class="result-highlight">${match}</span>${after}`;
  }

  private _renderPath() {
    if (this.history.length === 0) {
      return html`<p class="empty">Start exploring to build your path.</p>`;
    }

    return html`
      <div class="path">
        ${repeat(
          this.history,
          item => item.id,
          (item, index) => html`
            ${index > 0 ? html`<span class="path-separator">→</span>` : nothing}
            <button
              class="path-dot"
              ?data-active=${index === this.history.length - 1}
              @click=${() => this._navigate(item.id, item.type, item.title)}
              title="${item.title}"
              aria-label="${item.title}"
            ></button>
          `
        )}
      </div>
      <p class="path-label">
        ${this.history.map(h => h.title).join(' → ')}
      </p>
    `;
  }

  private _renderConnections() {
    if (this.connections.length === 0) {
      return html`
        <p class="empty">No connections yet. Connect blocks to other channels to see relationships.</p>
      `;
    }

    return repeat(
      this.connections,
      conn => conn.channelId,
      conn => html`
        <div
          class="item"
          tabindex="0"
          @click=${() => this._navigate(conn.channelId, 'channel', conn.channelTitle)}
          @keydown=${(e: KeyboardEvent) => {
            if (e.key === 'Enter') this._navigate(conn.channelId, 'channel', conn.channelTitle);
          }}
        >
          <span class="item-title">${conn.channelTitle}</span>
          <span class="item-meta">${conn.sharedBlockCount} shared →</span>
        </div>
      `
    );
  }

  private _renderRecent() {
    if (this.recent.length === 0) {
      return html`<p class="empty">Start exploring to build your history.</p>`;
    }

    return repeat(
      this.recent,
      item => item.id,
      item => html`
        <div
          class="item"
          tabindex="0"
          @click=${() => this._navigate(item.id, item.type, item.title)}
          @keydown=${(e: KeyboardEvent) => {
            if (e.key === 'Enter') this._navigate(item.id, item.type, item.title);
          }}
        >
          <span class="item-title">${item.title}</span>
          <span class="item-meta">${this._formatTimeAgo(item.visitedAt)}</span>
        </div>
      `
    );
  }

  private _renderConnectContent() {
    // In connect mode without search, show recent channels
    const recentChannels = this.recent.filter(r => r.type === 'channel');
    const allChannels = this.searchIndex.filter(s => s.type === 'channel');

    return html`
      ${recentChannels.length > 0 ? html`
        <div class="section">
          <div class="section-title">Recent Channels</div>
          ${repeat(
            recentChannels.slice(0, 5),
            item => item.id,
            item => html`
              <div
                class="item"
                tabindex="0"
                @click=${() => this._connect(item.id, item.title)}
                @keydown=${(e: KeyboardEvent) => {
                  if (e.key === 'Enter') this._connect(item.id, item.title);
                }}
              >
                <span class="item-title">${item.title}</span>
                <span class="item-action">+</span>
              </div>
            `
          )}
        </div>
      ` : nothing}

      ${allChannels.length > 0 ? html`
        <div class="section">
          <div class="section-title">All Channels</div>
          ${repeat(
            allChannels.slice(0, 10),
            item => item.id,
            item => html`
              <div
                class="item"
                tabindex="0"
                @click=${() => this._connect(item.id, item.title)}
                @keydown=${(e: KeyboardEvent) => {
                  if (e.key === 'Enter') this._connect(item.id, item.title);
                }}
              >
                <span class="item-title">${item.title}</span>
                <span class="item-action">+</span>
              </div>
            `
          )}
        </div>
      ` : nothing}

      <div class="create-channel" @click=${this._createChannel}>
        Create new channel
      </div>
    `;
  }

  private _renderSearchResults() {
    const isConnectMode = this.mode === 'connect' && this.connectTarget;

    // In connect mode, only show channels
    const filteredResults = isConnectMode
      ? this._searchResults.filter(r => r.type === 'channel')
      : this._searchResults;

    if (filteredResults.length === 0) {
      return html`
        <p class="empty">No ${isConnectMode ? 'channels' : 'results'} for "${this._searchQuery}"</p>
        ${isConnectMode ? html`
          <div class="create-channel" @click=${this._createChannel}>
            Create new channel "${this._searchQuery}"
          </div>
        ` : nothing}
      `;
    }

    const channels = filteredResults.filter(r => r.type === 'channel');
    const blocks = filteredResults.filter(r => r.type === 'block');

    return html`
      ${channels.length > 0 ? html`
        <div class="results-group">
          <div class="section-title">Channels</div>
          ${repeat(
            channels,
            item => item.id,
            (item) => html`
              <div
                class="item"
                ?data-selected=${this._searchResults.indexOf(item) === this._selectedIndex}
                tabindex="0"
                @click=${() => isConnectMode ? this._connect(item.id, item.title) : this._navigate(item.id, item.type, item.title)}
              >
                <span class="item-title">
                  ${this._highlightMatch(item.title, this._searchQuery)}
                </span>
                <span class="item-action">${isConnectMode ? '+' : `${item.blockCount || 0} blocks`}</span>
              </div>
            `
          )}
        </div>
        ${isConnectMode ? html`
          <div class="create-channel" @click=${this._createChannel}>
            Create new channel
          </div>
        ` : nothing}
      ` : nothing}

      ${blocks.length > 0 && !isConnectMode ? html`
        <div class="results-group">
          <div class="section-title">Blocks</div>
          ${repeat(
            blocks,
            item => item.id,
            item => html`
              <div
                class="item"
                ?data-selected=${this._searchResults.indexOf(item) === this._selectedIndex}
                tabindex="0"
                @click=${() => this._navigate(item.id, item.type, item.title)}
              >
                <span class="item-title">
                  ${this._highlightMatch(item.title, this._searchQuery)}
                  ${item.parentChannel ? html`
                    <span class="result-context">in ${item.parentChannel}</span>
                  ` : nothing}
                </span>
              </div>
            `
          )}
        </div>
      ` : nothing}
    `;
  }

  override render() {
    const showSearch = this._searchQuery.trim().length > 0;
    const isConnectMode = this.mode === 'connect' && this.connectTarget;

    return html`
      <div class="backdrop" @click=${this._handleBackdropClick}></div>
      <div class="modal" role="dialog" aria-modal="true" aria-label="${isConnectMode ? 'Connect block to channel' : 'Waypoint navigation'}">
        <div class="header">
          ${isConnectMode ? html`
            <span class="connect-header">
              Connect "<span class="target-title">${this.connectTarget!.title}</span>" to...
            </span>
          ` : nothing}
          <input
            class="search-input"
            type="text"
            placeholder="${isConnectMode ? 'Search channels...' : 'Search channels and blocks...'}"
            .value=${this._searchQuery}
            @input=${this._handleSearchInput}
            aria-label="Search"
          />
          <span class="hotkey">⌘/</span>
          <button class="close-btn" @click=${() => this.close()} aria-label="Close">×</button>
        </div>

        <div class="content">
          ${showSearch ? html`
            ${this._renderSearchResults()}
          ` : isConnectMode ? html`
            ${this._renderConnectContent()}
          ` : html`
            <div class="section">
              <div class="section-title">Your Path</div>
              ${this._renderPath()}
            </div>

            <div class="section">
              <div class="section-title">Connected From Here</div>
              ${this._renderConnections()}
            </div>

            <div class="section">
              <div class="section-title">Recent Wanderings</div>
              ${this._renderRecent()}
            </div>
          `}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'garden-waypoint': GardenWaypoint;
  }
}

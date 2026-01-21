import { html, css, CSSResultGroup, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { GardenElement } from '../GardenElement.js';

/**
 * Channel with blocks for search data.
 */
export interface SearchChannel {
  id: string;
  title: string;
  description?: string | null;
}

/**
 * Block for search data.
 */
export interface SearchBlock {
  id: string;
  title: string; // Display title (derived from content)
  channelId: string;
  channelTitle: string;
}

/**
 * Data passed to the search modal.
 */
export interface SearchData {
  channel: SearchChannel;
  blocks: SearchBlock[];
}

/**
 * Search result item (can be channel or block).
 */
interface SearchResult {
  type: 'channel' | 'block';
  id: string;
  title: string;
  subtitle?: string;
}

/**
 * Command palette style search modal for finding channels and blocks.
 *
 * Opens as an overlay near the top of the viewport. Type to filter,
 * use arrow keys to navigate, Enter to select.
 *
 * @fires garden:search-channel - When a channel is selected
 * @fires garden:search-block - When a block is selected
 * @fires garden:modal-close - When modal is closed
 */
@customElement('garden-search-modal')
export class GardenSearchModal extends GardenElement {
  static override styles: CSSResultGroup = [
    GardenElement.sharedStyles,
    css`
      :host {
        display: contents;
      }

      /* Backdrop overlay with dither */
      .backdrop {
        position: fixed;
        inset: 0;
        z-index: 100;
        background-color: color-mix(in srgb, var(--garden-bg) 70%, transparent);
        background-image: var(--garden-dither-25);
        background-size: 4px 4px;
      }

      /* Modal container - positioned near top for command palette feel */
      .modal {
        position: fixed;
        top: 15%;
        left: 50%;
        transform: translateX(-50%);
        z-index: 101;

        background-color: var(--garden-bg);
        border: 1px solid var(--garden-fg);

        width: 90%;
        max-width: 500px;
        max-height: 60vh;

        display: flex;
        flex-direction: column;
      }

      /* Search input container */
      .search-input-container {
        padding: var(--garden-space-3);
        border-bottom: 1px solid var(--garden-fg-muted);
      }

      .search-input {
        width: 100%;
        padding: var(--garden-space-2) var(--garden-space-3);
        border: 1px solid var(--garden-fg);
        background: transparent;
        color: var(--garden-fg);
        font-family: var(--garden-font-mono);
        font-size: var(--garden-text-base);
        transition:
          background-color var(--garden-duration-fast) var(--garden-ease-out),
          background-image var(--garden-duration-fast) var(--garden-ease-out);
      }

      .search-input:focus {
        outline: none;
        background-image: var(--garden-dither-50);
        background-size: 2px 2px;
        text-shadow:
          0 0 2px var(--garden-bg),
          0 0 4px var(--garden-bg),
          0 0 6px var(--garden-bg);
      }

      .search-input::placeholder {
        color: var(--garden-fg-muted);
      }

      .search-input:focus::placeholder {
        text-shadow:
          0 0 2px var(--garden-bg),
          0 0 4px var(--garden-bg);
      }

      /* Results list */
      .results {
        flex: 1;
        overflow-y: auto;
        margin: 0;
        padding: 0;
        list-style: none;
      }

      /* Result item */
      .result-item {
        display: block;
      }

      .result-link {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: var(--garden-space-3);
        text-decoration: none;
        color: var(--garden-fg);
        border-bottom: 1px solid var(--garden-fg-muted);
        cursor: pointer;
        transition: all var(--garden-duration-fast) var(--garden-ease-out);
      }

      .result-link:hover,
      .result-link.selected {
        background-image: var(--garden-dither-50);
        background-size: 2px 2px;
      }

      .result-link:hover .result-title,
      .result-link.selected .result-title {
        text-shadow:
          0 0 2px var(--garden-bg),
          0 0 4px var(--garden-bg);
      }

      .result-link:hover .result-type,
      .result-link.selected .result-type {
        text-shadow:
          0 0 2px var(--garden-bg),
          0 0 3px var(--garden-bg);
      }

      .result-link:focus-visible {
        outline: var(--garden-focus-ring);
        outline-offset: -2px;
      }

      .result-content {
        flex: 1;
        min-width: 0;
      }

      .result-title {
        font-size: var(--garden-text-sm);
        font-weight: 400;
        margin: 0;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .result-subtitle {
        font-size: var(--garden-text-xs);
        color: var(--garden-fg-muted);
        margin-top: 2px;
      }

      .result-link:hover .result-subtitle,
      .result-link.selected .result-subtitle {
        text-shadow:
          0 0 2px var(--garden-bg),
          0 0 3px var(--garden-bg);
      }

      .result-type {
        flex-shrink: 0;
        font-size: var(--garden-text-xs);
        color: var(--garden-fg-muted);
        margin-left: var(--garden-space-3);
      }

      /* Empty state */
      .empty {
        text-align: center;
        color: var(--garden-fg-muted);
        padding: var(--garden-space-6);
        font-size: var(--garden-text-sm);
      }

      /* Hidden state */
      :host(:not([open])) .backdrop,
      :host(:not([open])) .modal {
        display: none;
      }
    `,
  ];

  /** Whether the modal is open */
  @property({ type: Boolean, reflect: true })
  open = false;

  /** Search data: channels with their blocks */
  @property({ type: Array })
  data: SearchData[] = [];

  @state()
  private _query = '';

  @state()
  private _selectedIndex = 0;

  private get _results(): SearchResult[] {
    const query = this._query.toLowerCase().trim();
    const results: SearchResult[] = [];
    const maxResults = 15;

    if (!query) {
      // Show all channels when no query
      for (const item of this.data) {
        if (results.length >= maxResults) break;
        results.push({
          type: 'channel',
          id: item.channel.id,
          title: item.channel.title,
          subtitle: item.channel.description || undefined,
        });
      }
      return results;
    }

    // Track which channels we've already added
    const addedChannelIds = new Set<string>();

    // First, find matching channels
    for (const item of this.data) {
      if (results.length >= maxResults) break;

      const titleMatch = item.channel.title.toLowerCase().includes(query);
      const descMatch = item.channel.description?.toLowerCase().includes(query);

      if (titleMatch || descMatch) {
        results.push({
          type: 'channel',
          id: item.channel.id,
          title: item.channel.title,
          subtitle: item.channel.description || undefined,
        });
        addedChannelIds.add(item.channel.id);
      }
    }

    // Then, find matching blocks
    for (const item of this.data) {
      if (results.length >= maxResults) break;

      for (const block of item.blocks) {
        if (results.length >= maxResults) break;

        const titleMatch = block.title.toLowerCase().includes(query);
        if (titleMatch) {
          results.push({
            type: 'block',
            id: block.id,
            title: block.title,
            subtitle: `in ${block.channelTitle}`,
          });
        }
      }
    }

    return results;
  }

  override connectedCallback() {
    super.connectedCallback();
    this._handleKeydown = this._handleKeydown.bind(this);
  }

  override updated(changedProperties: Map<string, unknown>) {
    if (changedProperties.has('open')) {
      if (this.open) {
        document.addEventListener('keydown', this._handleKeydown);
        // Reset state and focus input
        this._query = '';
        this._selectedIndex = 0;
        this.updateComplete.then(() => {
          const input = this.shadowRoot?.querySelector('.search-input') as HTMLInputElement;
          input?.focus();
        });
      } else {
        document.removeEventListener('keydown', this._handleKeydown);
      }
    }
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener('keydown', this._handleKeydown);
  }

  private _handleKeydown(e: KeyboardEvent) {
    if (!this.open) return;

    const results = this._results;

    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        this._close();
        break;

      case 'ArrowDown':
        e.preventDefault();
        this._selectedIndex = Math.min(this._selectedIndex + 1, results.length - 1);
        this._scrollSelectedIntoView();
        break;

      case 'ArrowUp':
        e.preventDefault();
        this._selectedIndex = Math.max(this._selectedIndex - 1, 0);
        this._scrollSelectedIntoView();
        break;

      case 'Enter':
        e.preventDefault();
        if (results.length > 0 && this._selectedIndex < results.length) {
          this._selectResult(results[this._selectedIndex]);
        }
        break;
    }
  }

  private _scrollSelectedIntoView() {
    this.updateComplete.then(() => {
      const selectedEl = this.shadowRoot?.querySelector('.result-link.selected');
      selectedEl?.scrollIntoView({ block: 'nearest' });
    });
  }

  private _handleBackdropClick() {
    this._close();
  }

  private _close() {
    this.open = false;
    this.emit('modal-close', {});
  }

  private _handleInput(e: Event) {
    const input = e.target as HTMLInputElement;
    this._query = input.value;
    this._selectedIndex = 0;
  }

  private _selectResult(result: SearchResult) {
    if (result.type === 'channel') {
      this.emit('search-channel', { channelId: result.id });
    } else {
      this.emit('search-block', { blockId: result.id });
    }
    this._close();
  }

  private _handleResultClick(e: MouseEvent, result: SearchResult) {
    e.preventDefault();
    this._selectResult(result);
  }

  override render() {
    if (!this.open) return nothing;

    const results = this._results;

    return html`
      <div class="backdrop" @click=${this._handleBackdropClick}></div>
      <div
        class="modal"
        role="dialog"
        aria-modal="true"
        aria-label="Search"
      >
        <div class="search-input-container">
          <input
            type="text"
            class="search-input"
            placeholder="Search channels and blocks..."
            .value=${this._query}
            @input=${this._handleInput}
            autocomplete="off"
            spellcheck="false"
          />
        </div>

        ${results.length > 0 ? html`
          <ul class="results" role="listbox">
            ${results.map((result, index) => html`
              <li class="result-item" role="option">
                <a
                  class="result-link ${index === this._selectedIndex ? 'selected' : ''}"
                  href="#"
                  @click=${(e: MouseEvent) => this._handleResultClick(e, result)}
                  @mouseenter=${() => { this._selectedIndex = index; }}
                >
                  <div class="result-content">
                    <div class="result-title">${result.title}</div>
                    ${result.subtitle ? html`
                      <div class="result-subtitle">${result.subtitle}</div>
                    ` : nothing}
                  </div>
                  <span class="result-type">${result.type}</span>
                </a>
              </li>
            `)}
          </ul>
        ` : html`
          <div class="empty">
            ${this._query ? 'No results found' : 'Start typing to search...'}
          </div>
        `}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'garden-search-modal': GardenSearchModal;
  }
}

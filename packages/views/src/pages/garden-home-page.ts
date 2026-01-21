import { html, css, CSSResultGroup, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { GardenView } from '../GardenView.js';
import { garden, GardenError, getMediaAssetUrlSync } from '@garden/types';
import type { Channel, NewChannel, Block } from '@garden/types';
import { appDataDir } from '@tauri-apps/api/path';
import type { SearchData } from '@garden/components';

// Import components for side effects
import '@garden/components';

/**
 * Channel with loaded blocks for preview
 */
interface ChannelWithBlocks {
  channel: Channel;
  blocks: Block[];
  blockCount: number;
}

/**
 * Home page showing grid of channels with block previews.
 *
 * Events:
 * - garden:channel-created: When a new channel is created
 * - garden:channel-deleted: When a channel is deleted
 * - garden:channel-selected: When a channel is clicked
 */
@customElement('garden-home-page')
export class GardenHomePage extends GardenView {
  static override styles: CSSResultGroup = [
    GardenView.sharedStyles,
    css`
      /* Header with breadcrumb and add button */
      .header {
        margin-bottom: var(--garden-space-4);
        padding-bottom: var(--garden-space-4);
        border-bottom: 1px solid var(--garden-fg);
      }

      .header-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--garden-space-3);
      }

      .breadcrumb {
        display: flex;
        align-items: center;
        gap: var(--garden-space-2);
        margin: 0;
        font-size: var(--garden-text-2xl);
        font-weight: 700;
      }

      .breadcrumb-current {
        color: var(--garden-fg);
      }

      .add-button {
        flex-shrink: 0;
        width: 20px;
        height: 20px;
        border: 1px solid transparent;
        background: transparent;
        color: var(--garden-fg-muted);
        font-size: var(--garden-text-sm);
        font-family: var(--garden-font-mono);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all var(--garden-duration-fast) var(--garden-ease-out);
      }

      .add-button:hover {
        border-color: var(--garden-fg);
        color: var(--garden-fg);
      }

      .add-button:active {
        background-color: var(--garden-fg);
        color: var(--garden-bg);
      }

      .add-button:focus-visible {
        outline: var(--garden-focus-ring);
        outline-offset: 2px;
      }

      .stats {
        margin-bottom: var(--garden-space-4);
        font-size: var(--garden-text-sm);
        color: var(--garden-fg-muted);
      }

      /* Channel grid */
      .channel-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
        gap: var(--garden-space-4);
      }

      /* Channel card */
      .channel-card {
        border: 1px solid var(--garden-fg);
        cursor: pointer;
        display: flex;
        flex-direction: column;
        transition: all var(--garden-duration-fast) var(--garden-ease-out);
      }

      .channel-card:hover {
        background-image: var(--garden-dither-25);
        background-size: 4px 4px;
      }

      .channel-card:focus-visible {
        outline: var(--garden-focus-ring);
        outline-offset: 2px;
      }

      /* Block preview grid */
      .preview-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 1px;
        background: var(--garden-fg);
        aspect-ratio: 3 / 2;
      }

      .preview-cell {
        background: var(--garden-bg-subtle, var(--garden-skimming));
        overflow: hidden;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .preview-cell img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .preview-cell video {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .preview-cell-text {
        padding: var(--garden-space-1);
        font-size: 8px;
        line-height: 1.2;
        color: var(--garden-fg-muted);
        overflow: hidden;
        text-overflow: ellipsis;
        display: -webkit-box;
        -webkit-line-clamp: 3;
        -webkit-box-orient: vertical;
      }

      .preview-cell-empty {
        background: var(--garden-bg);
      }

      .preview-cell-icon {
        font-size: var(--garden-text-lg);
        color: var(--garden-fg-muted);
        opacity: 0.5;
      }

      /* Channel info */
      .channel-info {
        padding: var(--garden-space-3);
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: var(--garden-space-2);
        border-top: 1px solid var(--garden-fg);
      }

      .channel-details {
        flex: 1;
        min-width: 0;
      }

      .channel-title {
        font-weight: 700;
        font-size: var(--garden-text-base);
        margin: 0 0 var(--garden-space-1) 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .channel-meta {
        font-size: var(--garden-text-xs);
        color: var(--garden-fg-muted);
      }

      .channel-actions {
        flex-shrink: 0;
      }

      .empty {
        color: var(--garden-fg-muted);
        padding: var(--garden-space-6);
        text-align: center;
        border: 1px dashed var(--garden-fg-muted);
        grid-column: 1 / -1;
      }

      .error {
        padding: var(--garden-space-3);
        background: var(--garden-fg);
        color: var(--garden-bg);
        margin-bottom: var(--garden-space-4);
      }

      .loading {
        color: var(--garden-fg-muted);
        padding: var(--garden-space-4);
        text-align: center;
      }

      /* Create channel modal backdrop */
      .modal-backdrop {
        position: fixed;
        inset: 0;
        z-index: 100;
        background-color: color-mix(in srgb, var(--garden-bg) 70%, transparent);
        background-image: var(--garden-dither-25);
        background-size: 4px 4px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .modal-content {
        background: var(--garden-bg);
        border: 1px solid var(--garden-fg);
        padding: var(--garden-space-4);
        min-width: 320px;
        max-width: 400px;
      }

      .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: var(--garden-space-4);
        padding-bottom: var(--garden-space-3);
        border-bottom: 1px solid var(--garden-fg-muted);
      }

      .modal-title {
        font-size: var(--garden-text-lg);
        font-weight: 400;
        margin: 0;
      }

      .modal-close {
        background: transparent;
        border: none;
        cursor: pointer;
        color: var(--garden-fg-muted);
        font-size: var(--garden-text-xl);
        line-height: 1;
        padding: var(--garden-space-1);
      }

      .modal-close:hover {
        color: var(--garden-fg);
      }

      .modal-form {
        display: flex;
        flex-direction: column;
        gap: var(--garden-space-3);
      }

      .modal-footer {
        display: flex;
        justify-content: flex-end;
        gap: var(--garden-space-2);
        margin-top: var(--garden-space-4);
        padding-top: var(--garden-space-3);
        border-top: 1px solid var(--garden-fg-muted);
      }
    `,
  ];

  @property({ type: Array })
  channels: Channel[] = [];

  @state()
  private _channelsWithBlocks: ChannelWithBlocks[] = [];

  @state()
  private _loading = true;

  @state()
  private newChannelTitle = '';

  @state()
  private error: string | null = null;

  @state()
  private _createModalOpen = false;

  @state()
  private _searchModalOpen = false;

  @state()
  private _deleteConfirmOpen = false;

  @state()
  private _channelToDelete: Channel | null = null;

  @state()
  private _appDataPath: string | null = null;

  private _globalKeydownHandler: ((e: KeyboardEvent) => void) | null = null;

  override async connectedCallback() {
    super.connectedCallback();
    try {
      this._appDataPath = await appDataDir();
    } catch {
      console.warn('[GardenHomePage] Could not resolve appDataDir');
    }

    // Set up global keyboard shortcut for search
    this._globalKeydownHandler = (e: KeyboardEvent) => {
      // Don't trigger if already in an input or if a modal is open
      if (this._isInputFocused() || this._createModalOpen || this._searchModalOpen) return;

      // Cmd+K or / opens search
      if ((e.metaKey && e.key === 'k') || e.key === '/') {
        e.preventDefault();
        this._openSearchModal();
      }
    };
    window.addEventListener('keydown', this._globalKeydownHandler);
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    if (this._globalKeydownHandler) {
      window.removeEventListener('keydown', this._globalKeydownHandler);
      this._globalKeydownHandler = null;
    }
  }

  private _isInputFocused(): boolean {
    const activeEl = document.activeElement;
    if (!activeEl) return false;
    const tagName = activeEl.tagName.toLowerCase();
    return tagName === 'input' || tagName === 'textarea' || (activeEl as HTMLElement).isContentEditable;
  }

  override async updated(changedProperties: Map<string, unknown>) {
    // When channels prop changes, load blocks for each channel
    if (changedProperties.has('channels')) {
      await this._loadChannelBlocks();
    }
  }

  private async _loadChannelBlocks() {
    this._loading = true;

    try {
      const channelsWithBlocks: ChannelWithBlocks[] = await Promise.all(
        this.channels.map(async (channel) => {
          try {
            const blocks = await garden.connections.getBlocksInChannel(channel.id);
            return {
              channel,
              blocks: blocks.slice(0, 6), // Only need first 6 for preview
              blockCount: blocks.length,
            };
          } catch {
            return {
              channel,
              blocks: [],
              blockCount: 0,
            };
          }
        })
      );

      this._channelsWithBlocks = channelsWithBlocks;
    } catch (e) {
      console.error('[GardenHomePage] Error loading channel blocks:', e);
    } finally {
      this._loading = false;
    }
  }

  private _openCreateModal = () => {
    this._createModalOpen = true;
    this.newChannelTitle = '';
  };

  private _closeCreateModal = () => {
    this._createModalOpen = false;
    this.newChannelTitle = '';
  };

  private _openSearchModal = () => {
    this._searchModalOpen = true;
  };

  private _closeSearchModal = () => {
    this._searchModalOpen = false;
  };

  private _handleSearchChannel = (e: CustomEvent<{ channelId: string }>) => {
    this._closeSearchModal();
    this.emit('channel-selected', { id: e.detail.channelId });
  };

  private _handleSearchBlock = (e: CustomEvent<{ blockId: string }>) => {
    this._closeSearchModal();
    this.emit('navigate', { route: 'block', params: { id: e.detail.blockId } });
  };

  private get _searchData(): SearchData[] {
    return this._channelsWithBlocks.map(({ channel, blocks }) => ({
      channel: {
        id: channel.id,
        title: channel.title,
        description: channel.description,
      },
      blocks: blocks.map((block) => ({
        id: block.id,
        title: this._getBlockTitle(block),
        channelId: channel.id,
        channelTitle: channel.title,
      })),
    }));
  }

  private _getBlockTitle(block: Block): string {
    const content = block.content;
    if (content.type === 'text') {
      return content.body.slice(0, 50) || 'Text block';
    }
    if (content.type === 'link') {
      return content.title || content.url;
    }
    if (content.type === 'image') {
      return block.source_title || 'Image';
    }
    if (content.type === 'video') {
      return block.source_title || 'Video';
    }
    if (content.type === 'audio') {
      return block.source_title || 'Audio';
    }
    return 'Block';
  }

  private handleInput = (e: Event) => {
    const input = e.target as HTMLInputElement;
    this.newChannelTitle = input.value;
  };

  private handleKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      this.createChannel();
    } else if (e.key === 'Escape') {
      this._closeCreateModal();
    }
  };

  private async createChannel() {
    if (!this.newChannelTitle.trim()) return;

    try {
      const newChannel: NewChannel = {
        title: this.newChannelTitle.trim(),
        description: null,
      };

      const channel = await garden.channels.create(newChannel);
      this.newChannelTitle = '';
      this._createModalOpen = false;
      this.error = null;
      this.emit('channel-created', { channel });
    } catch (e) {
      this.error = e instanceof GardenError ? `${e.code}: ${e.message}` : String(e);
    }
  }

  private _openDeleteConfirm(channel: Channel, e: Event) {
    e.stopPropagation();
    this._channelToDelete = channel;
    this._deleteConfirmOpen = true;
  }

  private _closeDeleteConfirm = () => {
    this._deleteConfirmOpen = false;
    this._channelToDelete = null;
  };

  private _handleDeleteConfirm = async () => {
    if (!this._channelToDelete) return;
    const id = this._channelToDelete.id;
    this._closeDeleteConfirm();

    try {
      await garden.channels.delete(id);
      this.error = null;
      this.emit('channel-deleted', { id });
    } catch (e) {
      this.error = e instanceof GardenError ? `${e.code}: ${e.message}` : String(e);
    }
  };

  private handleChannelClick(channel: Channel) {
    this.emit('channel-selected', { id: channel.id });
  }

  private _getMediaUrl(filePath: string): string | null {
    if (!this._appDataPath) return null;
    return getMediaAssetUrlSync(filePath, this._appDataPath);
  }

  private _renderBlockPreview(block: Block) {
    const content = block.content;

    if (content.type === 'image') {
      const url = this._getMediaUrl(content.file_path);
      if (url) {
        return html`<img src=${url} alt="" loading="lazy" />`;
      }
    }

    if (content.type === 'video') {
      const url = this._getMediaUrl(content.file_path);
      if (url) {
        return html`<video src=${url} muted preload="metadata"></video>`;
      }
    }

    if (content.type === 'audio') {
      return html`<span class="preview-cell-icon">♫</span>`;
    }

    if (content.type === 'text') {
      return html`<span class="preview-cell-text">${content.body.slice(0, 50)}</span>`;
    }

    if (content.type === 'link') {
      return html`<span class="preview-cell-icon">↗</span>`;
    }

    return nothing;
  }

  private _renderPreviewGrid(blocks: Block[]) {
    // Create 6 cells, fill with blocks or empty
    const cells = [];
    for (let i = 0; i < 6; i++) {
      const block = blocks[i];
      if (block) {
        cells.push(html`
          <div class="preview-cell">
            ${this._renderBlockPreview(block)}
          </div>
        `);
      } else {
        cells.push(html`<div class="preview-cell preview-cell-empty"></div>`);
      }
    }
    return html`<div class="preview-grid">${cells}</div>`;
  }

  override render() {
    const totalBlocks = this._channelsWithBlocks.reduce((sum, c) => sum + c.blockCount, 0);

    return html`
      ${this.error ? html`<div class="error">${this.error}</div>` : null}

      <div class="header">
        <div class="header-row">
          <h1 class="breadcrumb">
            <span class="breadcrumb-current">Garden</span>
          </h1>
          <button
            class="add-button"
            @click=${this._openCreateModal}
            aria-label="Create channel"
            title="Create channel"
          >
            +
          </button>
        </div>
      </div>

      <div class="stats">
        ${this.channels.length} channel${this.channels.length !== 1 ? 's' : ''} · ${totalBlocks} block${totalBlocks !== 1 ? 's' : ''} · Press / to search
      </div>

      ${this._loading
        ? html`<div class="loading">Loading channels...</div>`
        : html`
            <div class="channel-grid">
              ${this._channelsWithBlocks.length === 0
                ? html`<div class="empty">No channels yet. Click + to create one!</div>`
                : this._channelsWithBlocks.map(
                    ({ channel, blocks, blockCount }) => html`
                      <div
                        class="channel-card"
                        @click=${() => this.handleChannelClick(channel)}
                        role="button"
                        tabindex="0"
                        @keydown=${(e: KeyboardEvent) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            this.handleChannelClick(channel);
                          }
                        }}
                      >
                        ${this._renderPreviewGrid(blocks)}
                        <div class="channel-info">
                          <div class="channel-details">
                            <h3 class="channel-title">${channel.title}</h3>
                            <span class="channel-meta">
                              ${blockCount} block${blockCount !== 1 ? 's' : ''}
                            </span>
                          </div>
                          <div class="channel-actions">
                            <garden-button
                              variant="ghost"
                              size="sm"
                              @click=${(e: Event) => this._openDeleteConfirm(channel, e)}
                            >
                              Delete
                            </garden-button>
                          </div>
                        </div>
                      </div>
                    `
                  )}
            </div>
          `}

      ${this._createModalOpen ? html`
        <div class="modal-backdrop" @click=${this._closeCreateModal}>
          <div class="modal-content" @click=${(e: Event) => e.stopPropagation()}>
            <header class="modal-header">
              <h2 class="modal-title">Create Channel</h2>
              <button class="modal-close" @click=${this._closeCreateModal} aria-label="Close">×</button>
            </header>
            <div class="modal-form">
              <garden-input
                placeholder="Channel title..."
                .value=${this.newChannelTitle}
                @input=${this.handleInput}
                @keydown=${this.handleKeydown}
                full
              ></garden-input>
            </div>
            <footer class="modal-footer">
              <garden-button variant="ghost" size="sm" @click=${this._closeCreateModal}>
                Cancel
              </garden-button>
              <garden-button size="sm" @click=${() => this.createChannel()}>
                Create
              </garden-button>
            </footer>
          </div>
        </div>
      ` : null}

      <garden-search-modal
        ?open=${this._searchModalOpen}
        .data=${this._searchData}
        @garden:search-channel=${this._handleSearchChannel}
        @garden:search-block=${this._handleSearchBlock}
        @garden:modal-close=${this._closeSearchModal}
      ></garden-search-modal>

      <garden-confirm-modal
        ?open=${this._deleteConfirmOpen}
        modalTitle="Delete Channel"
        message="Are you sure you want to delete "
        .itemName=${this._channelToDelete?.title ?? ''}
        confirmText="Delete"
        @garden:confirm=${this._handleDeleteConfirm}
        @garden:cancel=${this._closeDeleteConfirm}
        @garden:modal-close=${this._closeDeleteConfirm}
      ></garden-confirm-modal>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'garden-home-page': GardenHomePage;
  }
}

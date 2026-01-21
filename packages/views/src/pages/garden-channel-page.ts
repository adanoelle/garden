import { html, css, CSSResultGroup, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { GardenView } from '../GardenView.js';
import { garden, GardenError, getMediaAssetUrlSync } from '@garden/types';
import type { Channel, Block, NewBlock, BlockContent, MediaImportResult } from '@garden/types';
import type { ImportContentType, MediaSubtype, ImportFormValues } from '@garden/components';
import { appDataDir } from '@tauri-apps/api/path';

// Import components for side effects
import '@garden/components';

/**
 * Channel detail page showing blocks within the channel.
 *
 * Events:
 * - garden:block-created: When a new block is created and connected
 * - garden:block-deleted: When a block is disconnected from the channel
 * - garden:navigate-block: When a block is clicked to view its detail page
 */
@customElement('garden-channel-page')
export class GardenChannelPage extends GardenView {
  static override styles: CSSResultGroup = [
    GardenView.sharedStyles,
    css`
      .header {
        margin-bottom: var(--garden-space-4);
        padding-bottom: var(--garden-space-4);
        border-bottom: 1px solid var(--garden-fg);
      }

      .breadcrumb {
        display: flex;
        align-items: center;
        gap: var(--garden-space-2);
        margin: 0;
        font-size: var(--garden-text-2xl);
        font-weight: 700;
      }

      .breadcrumb-link {
        color: var(--garden-fg-muted);
        cursor: pointer;
      }

      .breadcrumb-link:hover {
        color: var(--garden-fg);
        text-decoration: underline;
      }

      .breadcrumb-separator {
        color: var(--garden-fg-muted);
        font-weight: 400;
      }

      .breadcrumb-current {
        color: var(--garden-fg);
      }

      .description {
        color: var(--garden-fg-muted);
        margin-top: var(--garden-space-2);
        margin-bottom: 0;
      }

      /* Header with breadcrumb and add button */
      .header-row {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: var(--garden-space-3);
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

      /* Grid section */
      .grid-section {
        margin-top: var(--garden-space-4);
      }

      /* Fixed-size block card */
      .block-card {
        cursor: pointer;
        aspect-ratio: 4 / 3;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        border: 1px solid var(--garden-fg);
        background: var(--garden-bg);
        transition: background-color var(--garden-duration-fast) var(--garden-ease-out);
      }

      .block-card:hover {
        background-image: var(--garden-dither-25);
        background-size: 4px 4px;
      }

      .block-card:focus-visible {
        outline: var(--garden-focus-ring);
        outline-offset: 2px;
      }

      /* Media preview container - fills the card */
      .media-preview {
        flex: 1;
        position: relative;
        overflow: hidden;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--garden-bg-subtle, var(--garden-skimming));
      }

      .media-preview img,
      .media-preview video {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      /* Title overlay for media blocks */
      .media-title-overlay {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        padding: var(--garden-space-2) var(--garden-space-3);
        background: linear-gradient(transparent, rgba(0, 0, 0, 0.7));
        color: white;
        font-size: var(--garden-text-sm);
        font-weight: 500;
      }

      /* Text/link content preview */
      .text-preview {
        flex: 1;
        padding: var(--garden-space-3);
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }

      .text-preview-title {
        font-weight: 700;
        margin-bottom: var(--garden-space-2);
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }

      .text-preview-body {
        flex: 1;
        font-size: var(--garden-text-sm);
        color: var(--garden-fg-muted);
        white-space: pre-wrap;
        word-break: break-word;
        display: -webkit-box;
        -webkit-line-clamp: 4;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }

      .text-preview-url {
        font-size: var(--garden-text-xs);
        color: var(--garden-fg-muted);
        text-decoration: underline;
        word-break: break-all;
        margin-top: auto;
        padding-top: var(--garden-space-2);
      }

      /* Audio preview */
      .audio-preview {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: var(--garden-space-2);
        background: var(--garden-bg-subtle, var(--garden-skimming));
        padding: var(--garden-space-4);
      }

      .audio-icon {
        font-size: var(--garden-text-3xl);
        opacity: 0.6;
      }

      .audio-title {
        font-size: var(--garden-text-sm);
        text-align: center;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }

      /* Card footer */
      .card-footer {
        padding: var(--garden-space-2) var(--garden-space-3);
        font-size: var(--garden-text-xs);
        color: var(--garden-fg-muted);
        border-top: 1px solid var(--garden-fg);
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .empty-slot {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: var(--garden-space-2);
      }

      .error {
        padding: var(--garden-space-3);
        background: var(--garden-fg);
        color: var(--garden-bg);
        margin-bottom: var(--garden-space-4);
      }

    `,
  ];

  @property({ type: Object })
  channel: Channel | null = null;

  @property({ type: Array })
  blocks: Block[] = [];

  @state()
  private error: string | null = null;

  @state()
  private currentPage = 1;

  @state()
  private _importModalOpen = false;

  @state()
  private _removeConfirmOpen = false;

  @state()
  private _blockToRemove: Block | null = null;

  @state()
  private appDataPath: string | null = null;

  private readonly pageSize = 9; // 3x3 grid per page

  private _keydownHandler = this._handleGlobalKeydown.bind(this);

  override async connectedCallback() {
    super.connectedCallback();
    // Resolve app data path once for sync media URL conversion
    try {
      this.appDataPath = await appDataDir();
    } catch {
      // May fail in non-Tauri environment, that's ok
      console.warn('[GardenChannelPage] Could not resolve appDataDir');
    }

    // Add keyboard shortcut listener
    window.addEventListener('keydown', this._keydownHandler);
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('keydown', this._keydownHandler);
  }

  private _handleGlobalKeydown(e: KeyboardEvent) {
    // Don't trigger when typing in inputs
    if (this._isInputFocused()) return;

    // Super+N to open import modal
    if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
      e.preventDefault();
      this._openImportModal();
    }
  }

  private _isInputFocused(): boolean {
    const active = this.shadowRoot?.activeElement || document.activeElement;
    if (!active) return false;
    const tagName = active.tagName.toLowerCase();
    return (
      tagName === 'input' ||
      tagName === 'textarea' ||
      (active as HTMLElement).isContentEditable
    );
  }

  private _openImportModal = () => {
    this._importModalOpen = true;
  };

  private _closeImportModal = () => {
    this._importModalOpen = false;
  };

  private _handleImport = async (
    e: CustomEvent<{
      type: ImportContentType;
      mediaSubtype: MediaSubtype;
      input: string;
      formValues: ImportFormValues;
    }>
  ) => {
    const { type: contentType, mediaSubtype, input: inputValue, formValues } = e.detail;
    if (!this.channel) return;

    try {
      let content: BlockContent;

      if (contentType === 'url-media' && mediaSubtype) {
        // Import media from URL first
        const result = await garden.media.importFromUrl(inputValue.trim());
        content = this.mediaResultToBlockContent(result, inputValue.trim());
      } else if (contentType === 'url-webpage') {
        content = {
          type: 'link',
          url: inputValue.trim(),
          title: formValues.title || null,
          description: null,
          alt_text: null,
        };
      } else {
        // Text content
        content = {
          type: 'text',
          body: inputValue.trim(),
        };
      }

      const newBlock: NewBlock = {
        content,
        source_url: formValues.sourceUrl || null,
        source_title: formValues.title || null,
        creator: formValues.creator || null,
        original_date: formValues.originalDate || null,
        notes: formValues.notes || null,
      };
      const block = await garden.blocks.create(newBlock);

      // Connect the block to this channel
      await garden.connections.connect(block.id, this.channel.id);

      this._importModalOpen = false;
      this.error = null;
      this.emit('block-created', { block });
    } catch (e) {
      const errorMessage = e instanceof GardenError ? `${e.code}: ${e.message}` : String(e);
      this.error = errorMessage;

      // Notify the modal of the error so it can reset its state
      const modal = this.shadowRoot?.querySelector('garden-import-modal') as { importError?: (msg: string) => void } | null;
      modal?.importError?.(errorMessage);
    }
  };

  private mediaResultToBlockContent(result: MediaImportResult, originalUrl: string): BlockContent {
    if (result.mime_type.startsWith('image/')) {
      return {
        type: 'image',
        file_path: result.file_path,
        original_url: originalUrl,
        width: result.width ?? null,
        height: result.height ?? null,
        mime_type: result.mime_type,
        alt_text: null,
      };
    } else if (result.mime_type.startsWith('video/')) {
      return {
        type: 'video',
        file_path: result.file_path,
        original_url: originalUrl,
        width: result.width ?? null,
        height: result.height ?? null,
        duration: result.duration ?? null,
        mime_type: result.mime_type,
        alt_text: null,
      };
    } else if (result.mime_type.startsWith('audio/')) {
      return {
        type: 'audio',
        file_path: result.file_path,
        original_url: originalUrl,
        duration: result.duration ?? null,
        mime_type: result.mime_type,
        title: null,
        artist: null,
      };
    }
    throw new Error(`Unsupported media type: ${result.mime_type}`);
  }

  private _openRemoveConfirm(block: Block, e: Event) {
    e.stopPropagation();
    this._blockToRemove = block;
    this._removeConfirmOpen = true;
  }

  private _closeRemoveConfirm = () => {
    this._removeConfirmOpen = false;
    this._blockToRemove = null;
  };

  private _handleRemoveConfirm = async () => {
    if (!this._blockToRemove || !this.channel) return;
    const blockId = this._blockToRemove.id;
    this._closeRemoveConfirm();

    try {
      await garden.connections.disconnect(blockId, this.channel.id);
      this.error = null;
      this.emit('block-deleted', { id: blockId });
    } catch (e) {
      this.error = e instanceof GardenError ? `${e.code}: ${e.message}` : String(e);
    }
  };

  private _getBlockDisplayName(block: Block): string {
    const content = block.content;
    if (content.type === 'text') {
      return content.body.slice(0, 30) + (content.body.length > 30 ? '...' : '');
    }
    if (content.type === 'link') {
      return content.title || new URL(content.url).hostname;
    }
    if (content.type === 'image') {
      return content.alt_text || block.source_title || 'Image';
    }
    if (content.type === 'video') {
      return content.alt_text || block.source_title || 'Video';
    }
    if (content.type === 'audio') {
      return content.title || content.artist || block.source_title || 'Audio';
    }
    return 'Block';
  }

  private handleBack = () => {
    this.goBack();
  };

  private handlePageChange = (e: CustomEvent<{ page: number }>) => {
    this.currentPage = e.detail.page;
  };

  private get paginatedBlocks(): Block[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.blocks.slice(start, start + this.pageSize);
  }

  private handleBlockClick = (block: Block) => {
    this.emit('navigate-block', { blockId: block.id });
  };

  private formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString();
  }

  private getMediaUrl(filePath: string): string | null {
    if (!this.appDataPath) return null;
    return getMediaAssetUrlSync(filePath, this.appDataPath);
  }

  private renderBlockCard(block: Block) {
    const content = block.content;

    if (content.type === 'image') {
      const url = this.getMediaUrl(content.file_path);
      return html`
        <div class="media-preview">
          ${url
            ? html`<img src=${url} alt=${content.alt_text || ''} loading="lazy" />`
            : html`<span>Loading...</span>`}
          <div class="media-title-overlay">${content.alt_text || 'Image'}</div>
        </div>
      `;
    }

    if (content.type === 'video') {
      const url = this.getMediaUrl(content.file_path);
      return html`
        <div class="media-preview">
          ${url
            ? html`<video src=${url} muted preload="metadata"></video>`
            : html`<span>Loading...</span>`}
          <div class="media-title-overlay">${content.alt_text || 'Video'}</div>
        </div>
      `;
    }

    if (content.type === 'audio') {
      return html`
        <div class="audio-preview">
          <span class="audio-icon">♫</span>
          <span class="audio-title">${content.title || content.artist || 'Audio'}</span>
        </div>
      `;
    }

    if (content.type === 'text') {
      const lines = content.body.split('\n');
      const title = lines[0].length > 60 ? lines[0].slice(0, 57) + '...' : lines[0];
      const body = lines.slice(1).join('\n').trim();
      return html`
        <div class="text-preview">
          <div class="text-preview-title">${title}</div>
          ${body ? html`<div class="text-preview-body">${body}</div>` : nothing}
        </div>
      `;
    }

    if (content.type === 'link') {
      const hostname = new URL(content.url).hostname;
      return html`
        <div class="text-preview">
          <div class="text-preview-title">${content.title || hostname}</div>
          ${content.description
            ? html`<div class="text-preview-body">${content.description}</div>`
            : nothing}
          <div class="text-preview-url">${hostname}</div>
        </div>
      `;
    }

    return html`<div class="text-preview"><div class="text-preview-title">Block</div></div>`;
  }

  override render() {
    if (!this.channel) {
      return html`<div class="error">Channel not found</div>`;
    }

    return html`
      ${this.error ? html`<div class="error">${this.error}</div>` : null}

      <div class="header">
        <div class="header-row">
          <h1 class="breadcrumb">
            <span class="breadcrumb-link" @click=${this.handleBack}>Garden</span>
            <span class="breadcrumb-separator">/</span>
            <span class="breadcrumb-current">${this.channel.title}</span>
          </h1>
          <button
            class="add-button"
            @click=${this._openImportModal}
            aria-label="Add block (⌘N)"
            title="Add block (⌘N)"
          >
            +
          </button>
        </div>
        ${this.channel.description
          ? html`<p class="description">${this.channel.description}</p>`
          : null}
      </div>

      <div class="grid-section">
        <garden-grid
          columns="3"
          gap="var(--garden-space-3)"
          .total=${this.blocks.length}
          .page=${this.currentPage}
          .pageSize=${this.pageSize}
          .fill=${this.pageSize}
          @garden:page-change=${this.handlePageChange}
        >
          ${this.paginatedBlocks.map(
            (block) => html`
              <div
                class="block-card"
                @click=${() => this.handleBlockClick(block)}
                role="button"
                tabindex="0"
                @keydown=${(e: KeyboardEvent) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.handleBlockClick(block);
                  }
                }}
              >
                ${this.renderBlockCard(block)}
                <div class="card-footer">
                  <span>${this.formatDate(block.created_at)}</span>
                  <garden-button
                    variant="ghost"
                    size="sm"
                    @click=${(e: Event) => this._openRemoveConfirm(block, e)}
                  >
                    Remove
                  </garden-button>
                </div>
              </div>
            `
          )}
          <div slot="empty" class="empty-slot">
            <span>No blocks in this channel yet</span>
            <span>Press ⌘N or click + to add one</span>
          </div>
        </garden-grid>
      </div>

      <garden-import-modal
        .open=${this._importModalOpen}
        .channelId=${this.channel.id}
        .channelTitle=${this.channel.title}
        @garden:modal-close=${this._closeImportModal}
        @garden:import=${this._handleImport}
      ></garden-import-modal>

      <garden-confirm-modal
        ?open=${this._removeConfirmOpen}
        modalTitle="Remove Block"
        message="Remove this block from the channel? "
        .itemName=${this._blockToRemove ? this._getBlockDisplayName(this._blockToRemove) : ''}
        confirmText="Remove"
        @garden:confirm=${this._handleRemoveConfirm}
        @garden:cancel=${this._closeRemoveConfirm}
        @garden:modal-close=${this._closeRemoveConfirm}
      ></garden-confirm-modal>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'garden-channel-page': GardenChannelPage;
  }
}

import { html, css, CSSResultGroup, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { GardenView } from '../GardenView.js';
import type { Block, Channel } from '@garden/types';
import { getMediaAssetUrl } from '@garden/types';
import type { MetadataValues, ContextMenuItem } from '@garden/components';

// Import components for side effects
import '@garden/components';

/**
 * Channel item for display in the channels modal.
 */
interface ChannelDisplayItem {
  id: string;
  title: string;
  description?: string;
  blockCount?: number;
}

/**
 * Block detail page showing a single block with archive metadata.
 *
 * Layout:
 * - Two-column layout: block frame (>50%) on left, archive info on right
 * - Context menu accessible via ellipsis button on block frame
 * - Notes section spanning full width below
 * - Channels modal for showing connected channels
 *
 * @fires garden:notes-update - When notes are saved
 * @fires garden:navigate-channel - When a channel is selected from modal
 * @fires garden:metadata-update - When metadata is saved
 */
@customElement('garden-block-page')
export class GardenBlockPage extends GardenView {
  static override styles: CSSResultGroup = [
    GardenView.sharedStyles,
    css`
      :host {
        display: block;
      }

      .header {
        margin-bottom: var(--garden-space-6);
      }

      .back-link {
        display: inline-flex;
        align-items: center;
        gap: var(--garden-space-1);
        color: var(--garden-fg-muted);
        font-size: var(--garden-text-sm);
        cursor: pointer;
        text-decoration: none;
      }

      .back-link:hover {
        color: var(--garden-fg);
        text-decoration: underline;
      }

      /* Main content area - two column layout */
      .main-content {
        display: flex;
        gap: var(--garden-space-8);
        margin-bottom: var(--garden-space-6);
        align-items: flex-start; /* Align info column to top of frame */
      }

      /* Block frame on the left - takes >50% width */
      .frame-column {
        flex: 1;
        min-width: 55%;
        max-width: 65%;
      }

      /* Archive info on the right - aligned to top */
      .info-column {
        flex-shrink: 0;
        width: auto;
        min-width: 180px;
        max-width: 280px;
      }

      /* Block content inside frame */
      .block-text {
        white-space: pre-wrap;
        word-break: break-word;
        font-size: var(--garden-text-lg);
        line-height: var(--garden-leading-relaxed);
        text-align: center;
        max-width: 100%;
      }

      .block-link {
        display: flex;
        flex-direction: column;
        gap: var(--garden-space-2);
        text-align: center;
      }

      .block-link a {
        color: var(--garden-fg);
        text-decoration: underline;
        word-break: break-all;
        font-size: var(--garden-text-base);
      }

      .block-link a:hover {
        text-decoration-thickness: 2px;
      }

      .block-link-title {
        font-weight: 700;
        font-size: var(--garden-text-lg);
      }

      .block-link-description {
        color: var(--garden-fg-muted);
        font-size: var(--garden-text-sm);
      }

      /* Notes section - full width */
      .notes-section {
        margin-top: var(--garden-space-4);
      }

      /* Responsive: stack on smaller screens */
      @media (max-width: 768px) {
        .main-content {
          flex-direction: column;
          align-items: stretch;
        }

        .frame-column {
          min-width: 100%;
          max-width: 100%;
        }

        .info-column {
          max-width: 100%;
        }
      }

      .error {
        padding: var(--garden-space-3);
        background: var(--garden-fg);
        color: var(--garden-bg);
      }

      .media-loading {
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 200px;
        color: var(--garden-fg-muted);
        font-size: var(--garden-text-sm);
      }

      .block-audio {
        display: flex;
        flex-direction: column;
        gap: var(--garden-space-3);
        padding: var(--garden-space-4);
        text-align: center;
      }

      .audio-info {
        display: flex;
        flex-direction: column;
        gap: var(--garden-space-1);
      }

      .audio-title {
        font-weight: 700;
        font-size: var(--garden-text-lg);
      }

      .audio-artist {
        color: var(--garden-fg-muted);
        font-size: var(--garden-text-sm);
      }

      .block-audio audio {
        width: 100%;
      }
    `,
  ];

  /** The block to display */
  @property({ type: Object })
  block: Block | null = null;

  /** Channels this block belongs to */
  @property({ type: Array })
  channels: Channel[] = [];

  /** Whether notes are editable */
  @property({ type: Boolean })
  notesEditable = true;

  /** Whether the channels modal is open */
  @state()
  private _channelsModalOpen = false;

  /** Whether the metadata modal is open */
  @state()
  private _metadataModalOpen = false;

  /** Context menu state */
  @state()
  private _contextMenuOpen = false;

  @state()
  private _contextMenuX = 0;

  @state()
  private _contextMenuY = 0;

  /** Resolved asset URL for media blocks */
  @state()
  private _mediaAssetUrl: string | null = null;

  /** Whether media URL resolution is in progress */
  @state()
  private _mediaLoading = true;

  /** Menu items for block actions */
  private _menuItems: ContextMenuItem[] = [
    { id: 'edit-metadata', label: 'Edit metadata' },
  ];

  override updated(changedProps: Map<string, unknown>) {
    super.updated(changedProps);

    // Resolve media URL whenever block changes or if we have a block but no URL yet
    if (this.block) {
      const content = this.block.content;
      const needsMediaUrl = content.type === 'image' || content.type === 'video' || content.type === 'audio';

      if (needsMediaUrl && !this._mediaAssetUrl && this._mediaLoading) {
        this._resolveMediaUrl();
      }
    }
  }

  private async _resolveMediaUrl() {
    if (!this.block) {
      this._mediaLoading = false;
      return;
    }

    const content = this.block.content;
    if (content.type === 'image' || content.type === 'video' || content.type === 'audio') {
      try {
        const url = await getMediaAssetUrl(content.file_path);
        this._mediaAssetUrl = url;
      } catch (e) {
        console.error('Failed to resolve media URL:', e);
        this._mediaAssetUrl = null;
      }
    }
    this._mediaLoading = false;
  }

  private _handleBack = () => {
    this.goBack();
  };

  private _handleMenuClick = (e: CustomEvent<{ x: number; y: number }>) => {
    this._contextMenuX = e.detail.x;
    this._contextMenuY = e.detail.y;
    this._contextMenuOpen = true;
  };

  private _handleMenuSelect = (e: CustomEvent<{ itemId: string }>) => {
    if (e.detail.itemId === 'edit-metadata') {
      this._handleEditMetadata();
    }
  };

  private _handleMenuClose = () => {
    this._contextMenuOpen = false;
  };

  private _getBlockType(block: Block): string {
    switch (block.content.type) {
      case 'text':
        return 'Text';
      case 'link':
        return 'Link';
      case 'image':
        return 'Image';
      case 'video':
        return 'Video';
      case 'audio':
        return 'Audio';
      default:
        return 'Unknown';
    }
  }

  private _handleChannelsClick = () => {
    this._channelsModalOpen = true;
  };

  private _handleModalClose = () => {
    this._channelsModalOpen = false;
  };

  private _handleChannelSelect = (e: CustomEvent<{ channel: ChannelDisplayItem }>) => {
    this._channelsModalOpen = false;
    this.emit('navigate-channel', { channelId: e.detail.channel.id });
  };

  private _handleEditMetadata = () => {
    this._metadataModalOpen = true;
  };

  private _handleMetadataModalClose = () => {
    this._metadataModalOpen = false;
  };

  private _handleMetadataSave = (e: CustomEvent<{ values: MetadataValues }>) => {
    if (this.block) {
      this._metadataModalOpen = false;
      this.emit('metadata-update', {
        blockId: this.block.id,
        values: e.detail.values,
      });
    }
  };

  private _getMetadataValues(): MetadataValues {
    if (!this.block) {
      return {
        sourceUrl: '',
        sourceTitle: '',
        creator: '',
        originalDate: '',
        altText: '',
      };
    }
    // Get alt_text from content if available (link, image, video)
    let altText = '';
    const content = this.block.content;
    if (content.type === 'link' && content.alt_text) {
      altText = content.alt_text;
    } else if (content.type === 'image' && content.alt_text) {
      altText = content.alt_text;
    } else if (content.type === 'video' && content.alt_text) {
      altText = content.alt_text;
    }
    return {
      sourceUrl: this.block.source_url ?? '',
      sourceTitle: this.block.source_title ?? '',
      creator: this.block.creator ?? '',
      originalDate: this.block.original_date ?? '',
      altText,
    };
  }

  private _handleNotesChange = (_e: CustomEvent<{ value: string; isDirty: boolean }>) => {
    // Could emit for real-time sync if needed
  };

  private _handleNotesSave = (e: CustomEvent<{ value: string }>) => {
    if (this.block) {
      this.emit('notes-update', {
        blockId: this.block.id,
        notes: e.detail.value,
      });
    }
  };

  private _renderBlockContent(block: Block) {
    const content = block.content;

    if (content.type === 'text') {
      return html`<div class="block-text">${content.body}</div>`;
    }

    if (content.type === 'link') {
      return html`
        <div class="block-link">
          ${content.title ? html`<span class="block-link-title">${content.title}</span>` : nothing}
          <a href=${content.url} target="_blank" rel="noopener noreferrer">${content.url}</a>
          ${content.description
            ? html`<span class="block-link-description">${content.description}</span>`
            : nothing}
        </div>
      `;
    }

    if (content.type === 'image') {
      if (!this._mediaAssetUrl) {
        return html`<div class="media-loading">Loading image...</div>`;
      }
      return html`
        <garden-image-block
          src=${this._mediaAssetUrl}
          alt=${content.alt_text ?? ''}
          width=${content.width ?? nothing}
          height=${content.height ?? nothing}
          constrained
        ></garden-image-block>
      `;
    }

    if (content.type === 'video') {
      if (!this._mediaAssetUrl) {
        return html`<div class="media-loading">Loading video...</div>`;
      }
      return html`
        <garden-video-block
          src=${this._mediaAssetUrl}
          width=${content.width ?? nothing}
          height=${content.height ?? nothing}
          duration=${content.duration ?? nothing}
        ></garden-video-block>
      `;
    }

    if (content.type === 'audio') {
      if (!this._mediaAssetUrl) {
        return html`<div class="media-loading">Loading audio...</div>`;
      }
      return html`
        <div class="block-audio">
          <div class="audio-info">
            ${content.title ? html`<div class="audio-title">${content.title}</div>` : nothing}
            ${content.artist ? html`<div class="audio-artist">${content.artist}</div>` : nothing}
          </div>
          <audio src=${this._mediaAssetUrl} controls></audio>
        </div>
      `;
    }

    return html`<div>Unknown block type</div>`;
  }

  private _getChannelItems(): ChannelDisplayItem[] {
    return this.channels.map(ch => ({
      id: ch.id,
      title: ch.title,
      description: ch.description ?? undefined,
    }));
  }

  override render() {
    if (!this.block) {
      return html`<div class="error">Block not found</div>`;
    }

    const block = this.block;

    return html`
      <div class="header">
        <a class="back-link" @click=${this._handleBack}>&larr; Back</a>
      </div>

      <div class="main-content">
        <!-- Block Frame -->
        <div class="frame-column">
          <garden-block-frame
            show-menu
            ?auto-height=${['text', 'link'].includes(block.content.type)}
            @garden:menu-click=${this._handleMenuClick}
          >
            ${this._renderBlockContent(block)}
          </garden-block-frame>
        </div>

        <!-- Archive Info - aligned to top of frame -->
        <div class="info-column">
          <garden-archive-info
            .archivedAt=${block.created_at}
            .type=${this._getBlockType(block)}
            .sourceUrl=${block.source_url ?? undefined}
            .sourceTitle=${block.source_title ?? undefined}
            .creator=${block.creator ?? undefined}
            .originalDate=${block.original_date ?? undefined}
            .channelCount=${this.channels.length}
            @garden:channels-click=${this._handleChannelsClick}
          ></garden-archive-info>
        </div>
      </div>

      <!-- Context Menu for block actions -->
      <garden-context-menu
        ?open=${this._contextMenuOpen}
        .items=${this._menuItems}
        .x=${this._contextMenuX}
        .y=${this._contextMenuY}
        @garden:menu-select=${this._handleMenuSelect}
        @garden:menu-close=${this._handleMenuClose}
      ></garden-context-menu>

      <!-- Notes Section -->
      <div class="notes-section">
        <garden-notes-section
          .value=${block.notes ?? ''}
          .editable=${this.notesEditable}
          show-divider
          @garden:notes-change=${this._handleNotesChange}
          @garden:notes-save=${this._handleNotesSave}
        ></garden-notes-section>
      </div>

      <!-- Channels Modal -->
      <garden-channels-modal
        ?open=${this._channelsModalOpen}
        .channels=${this._getChannelItems()}
        modalTitle="In ${this.channels.length} channel${this.channels.length !== 1 ? 's' : ''}"
        @garden:modal-close=${this._handleModalClose}
        @garden:channel-select=${this._handleChannelSelect}
      ></garden-channels-modal>

      <!-- Metadata Modal -->
      <garden-metadata-modal
        ?open=${this._metadataModalOpen}
        .values=${this._getMetadataValues()}
        ?is-link=${block.content.type === 'link'}
        @garden:modal-close=${this._handleMetadataModalClose}
        @garden:metadata-save=${this._handleMetadataSave}
      ></garden-metadata-modal>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'garden-block-page': GardenBlockPage;
  }
}

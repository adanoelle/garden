import { html, css, CSSResultGroup } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { GardenView } from '../GardenView.js';
import { garden, GardenError } from '@garden/types';
import type { Channel, Block, NewBlock, BlockContent, MediaImportResult } from '@garden/types';

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
      }

      .back-link {
        display: inline-flex;
        align-items: center;
        gap: var(--garden-space-1);
        color: var(--garden-fg-muted);
        font-size: var(--garden-text-sm);
        cursor: pointer;
        margin-bottom: var(--garden-space-2);
      }

      .back-link:hover {
        color: var(--garden-fg);
        text-decoration: underline;
      }

      h1 {
        margin: 0;
        font-size: var(--garden-text-2xl);
        font-weight: 700;
      }

      .description {
        color: var(--garden-fg-muted);
        margin-top: var(--garden-space-2);
      }

      .create-block {
        margin-bottom: var(--garden-space-4);
        padding: var(--garden-space-3);
        border: 1px dashed var(--garden-fg-muted);
      }

      .create-block-header {
        font-size: var(--garden-text-sm);
        color: var(--garden-fg-muted);
        margin-bottom: var(--garden-space-2);
      }

      .create-form {
        display: flex;
        flex-direction: column;
        gap: var(--garden-space-2);
      }

      .create-form textarea {
        width: 100%;
        min-height: 80px;
        padding: var(--garden-space-2);
        border: 1px solid var(--garden-fg);
        background: var(--garden-bg);
        color: var(--garden-fg);
        font-family: var(--garden-font-mono);
        font-size: var(--garden-text-sm);
        resize: vertical;
      }

      .create-form textarea:focus {
        outline: 2px solid var(--garden-fg);
        outline-offset: -2px;
      }

      .create-actions {
        display: flex;
        gap: var(--garden-space-2);
      }

      .blocks {
        display: flex;
        flex-direction: column;
        gap: var(--garden-space-3);
      }

      .block {
        padding: var(--garden-space-3);
        border: 1px solid var(--garden-fg);
        cursor: pointer;
      }

      .block:hover {
        background: var(--garden-bg-subtle, var(--garden-skimming));
      }

      .block-content {
        margin-bottom: var(--garden-space-2);
      }

      .block-text {
        white-space: pre-wrap;
        word-break: break-word;
      }

      .block-link {
        display: flex;
        flex-direction: column;
        gap: var(--garden-space-1);
      }

      .block-link a {
        color: var(--garden-fg);
        text-decoration: underline;
        word-break: break-all;
      }

      .block-link a:hover {
        text-decoration-thickness: 2px;
      }

      .block-link-title {
        font-weight: 700;
      }

      .block-link-description {
        color: var(--garden-fg-muted);
        font-size: var(--garden-text-sm);
      }

      .block-media {
        font-size: var(--garden-text-sm);
        color: var(--garden-fg-muted);
        font-family: var(--garden-font-mono);
      }

      .block-meta {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: var(--garden-text-xs);
        color: var(--garden-fg-muted);
      }

      .empty {
        color: var(--garden-fg-muted);
        padding: var(--garden-space-4);
        text-align: center;
        border: 1px dashed var(--garden-fg-muted);
      }

      .error {
        padding: var(--garden-space-3);
        background: var(--garden-fg);
        color: var(--garden-bg);
        margin-bottom: var(--garden-space-4);
      }

      .stats {
        margin-bottom: var(--garden-space-4);
        font-size: var(--garden-text-sm);
        color: var(--garden-fg-muted);
      }
    `,
  ];

  @property({ type: Object })
  channel: Channel | null = null;

  @property({ type: Array })
  blocks: Block[] = [];

  @state()
  private newBlockContent = '';

  @state()
  private blockType: 'text' | 'link' | 'media' = 'text';

  @state()
  private error: string | null = null;

  @state()
  private importing = false;

  private handleTextInput = (e: Event) => {
    const textarea = e.target as HTMLTextAreaElement;
    this.newBlockContent = textarea.value;
  };

  private handleTextKeydown = (e: KeyboardEvent) => {
    // Cmd/Ctrl + Enter to submit
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      this.createBlock();
    }
  };

  private async createBlock() {
    if (!this.newBlockContent.trim() || !this.channel) return;

    try {
      let content: BlockContent;

      if (this.blockType === 'media') {
        // Import media from URL first
        this.importing = true;
        const url = this.newBlockContent.trim();
        const result = await garden.media.importFromUrl(url);
        this.importing = false;

        // Create block content based on media type
        content = this.mediaResultToBlockContent(result, url);
      } else if (this.blockType === 'link') {
        content = {
          type: 'link',
          url: this.newBlockContent.trim(),
          title: null,
          description: null,
          alt_text: null,
        };
      } else {
        content = {
          type: 'text',
          body: this.newBlockContent.trim(),
        };
      }

      const newBlock: NewBlock = {
        content,
        source_url: null,
        source_title: null,
        creator: null,
        original_date: null,
        notes: null,
      };
      const block = await garden.blocks.create(newBlock);

      // Connect the block to this channel
      await garden.connections.connect(block.id, this.channel.id);

      this.newBlockContent = '';
      this.error = null;
      this.emit('block-created', { block });
    } catch (e) {
      this.importing = false;
      this.error = e instanceof GardenError ? `${e.code}: ${e.message}` : String(e);
    }
  }

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

  private async disconnectBlock(blockId: string) {
    if (!this.channel) return;

    try {
      await garden.connections.disconnect(blockId, this.channel.id);
      this.error = null;
      this.emit('block-deleted', { id: blockId });
    } catch (e) {
      this.error = e instanceof GardenError ? `${e.code}: ${e.message}` : String(e);
    }
  }

  private handleBack = () => {
    this.goBack();
  };

  private handleBlockClick = (block: Block) => {
    this.emit('navigate-block', { blockId: block.id });
  };

  private formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString();
  }

  private renderBlockContent(block: Block) {
    const content = block.content;

    if (content.type === 'text') {
      return html`<div class="block-text">${content.body}</div>`;
    }

    if (content.type === 'link') {
      return html`
        <div class="block-link">
          ${content.title ? html`<span class="block-link-title">${content.title}</span>` : null}
          <a href=${content.url} target="_blank" rel="noopener">${content.url}</a>
          ${content.description
            ? html`<span class="block-link-description">${content.description}</span>`
            : null}
        </div>
      `;
    }

    if (content.type === 'image') {
      return html`<div class="block-media">[Image: ${content.file_path}]</div>`;
    }

    if (content.type === 'video') {
      return html`<div class="block-media">[Video: ${content.file_path}]</div>`;
    }

    if (content.type === 'audio') {
      return html`<div class="block-media">[Audio: ${content.file_path}]</div>`;
    }

    return html`<div>Unknown block type</div>`;
  }

  override render() {
    if (!this.channel) {
      return html`<div class="error">Channel not found</div>`;
    }

    return html`
      ${this.error ? html`<div class="error">${this.error}</div>` : null}

      <div class="header">
        <span class="back-link" @click=${this.handleBack}>&larr; Back to channels</span>
        <h1>${this.channel.title}</h1>
        ${this.channel.description
          ? html`<p class="description">${this.channel.description}</p>`
          : null}
      </div>

      <div class="create-block">
        <div class="create-block-header">Add a block</div>
        <div class="create-form">
          <div class="create-actions">
            <garden-button
              variant=${this.blockType === 'text' ? 'solid' : 'ghost'}
              size="sm"
              @click=${() => (this.blockType = 'text')}
            >
              Text
            </garden-button>
            <garden-button
              variant=${this.blockType === 'link' ? 'solid' : 'ghost'}
              size="sm"
              @click=${() => (this.blockType = 'link')}
            >
              Link
            </garden-button>
            <garden-button
              variant=${this.blockType === 'media' ? 'solid' : 'ghost'}
              size="sm"
              @click=${() => (this.blockType = 'media')}
            >
              Media
            </garden-button>
          </div>
          <textarea
            placeholder=${this.blockType === 'text' ? 'Enter text...' : this.blockType === 'link' ? 'Enter URL...' : 'Enter media URL (image, video, audio)...'}
            .value=${this.newBlockContent}
            @input=${this.handleTextInput}
            @keydown=${this.handleTextKeydown}
            ?disabled=${this.importing}
          ></textarea>
          <garden-button @click=${() => this.createBlock()} ?disabled=${this.importing}>
            ${this.importing ? 'Importing...' : 'Add Block'}
          </garden-button>
        </div>
      </div>

      <div class="stats">
        ${this.blocks.length} block${this.blocks.length !== 1 ? 's' : ''}
      </div>

      ${this.blocks.length === 0
        ? html`<div class="empty">No blocks in this channel yet. Add one above!</div>`
        : html`
            <div class="blocks">
              ${this.blocks.map(
                (block) => html`
                  <div class="block" @click=${() => this.handleBlockClick(block)}>
                    <div class="block-content">${this.renderBlockContent(block)}</div>
                    <div class="block-meta">
                      <span>Added ${this.formatDate(block.created_at)}</span>
                      <garden-button
                        variant="ghost"
                        size="sm"
                        @click=${(e: Event) => {
                          e.stopPropagation();
                          this.disconnectBlock(block.id);
                        }}
                      >
                        Remove
                      </garden-button>
                    </div>
                  </div>
                `
              )}
            </div>
          `}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'garden-channel-page': GardenChannelPage;
  }
}

import { html, css, CSSResultGroup } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { GardenView } from '../GardenView.js';
import { garden, GardenError } from '@garden/types';
import type { Channel, Block, BlockUpdate } from '@garden/types';
import type { MetadataValues } from '@garden/components';

// Import components for side effects (custom element registration)
import '@garden/components';

export type Route =
  | { name: 'home' }
  | { name: 'channel'; id: string }
  | { name: 'block'; id: string };

/**
 * Main application shell that handles routing and layout.
 *
 * The app shell provides:
 * - A header with navigation
 * - A main content area that renders the appropriate page
 * - Route-based navigation
 */
@customElement('garden-app-shell')
export class GardenAppShell extends GardenView {
  static override styles: CSSResultGroup = [
    GardenView.sharedStyles,
    css`
      :host {
        display: flex;
        flex-direction: column;
        min-height: 100vh;
      }

      header {
        display: flex;
        align-items: center;
        gap: var(--garden-space-4);
        padding: var(--garden-space-3) var(--garden-space-4);
        border-bottom: 1px solid var(--garden-fg);
      }

      .logo {
        font-size: var(--garden-text-lg);
        font-weight: 700;
        text-decoration: none;
        color: var(--garden-fg);
        cursor: pointer;
      }

      .logo:hover {
        text-decoration: underline;
      }

      nav {
        display: flex;
        gap: var(--garden-space-3);
        margin-left: auto;
      }

      main {
        flex: 1;
        padding: var(--garden-space-4);
      }

      .error {
        padding: var(--garden-space-3);
        background: var(--garden-fg);
        color: var(--garden-bg);
        margin-bottom: var(--garden-space-4);
      }

      .loading {
        color: var(--garden-fg-muted);
      }
    `,
  ];

  @state()
  private route: Route = { name: 'home' };

  @state()
  private channels: Channel[] = [];

  @state()
  private currentChannel: Channel | null = null;

  @state()
  private currentBlock: Block | null = null;

  @state()
  private channelsForBlock: Channel[] = [];

  @state()
  private blocksInChannel: Block[] = [];

  @state()
  private loading = true;

  @state()
  private error: string | null = null;

  override connectedCallback() {
    super.connectedCallback();
    this.addEventListener('garden:navigate', this.handleNavigate as EventListener);
    this.addEventListener('garden:navigate-back', this.handleNavigateBack);
    this.loadInitialData();
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener('garden:navigate', this.handleNavigate as EventListener);
    this.removeEventListener('garden:navigate-back', this.handleNavigateBack);
  }

  private handleNavigate = (e: CustomEvent<{ route: string; params?: Record<string, string> }>) => {
    const { route, params } = e.detail;
    this.navigateTo(route, params);
  };

  private handleNavigateBack = () => {
    // Simple back navigation - go to home if on a detail page
    if (this.route.name !== 'home') {
      this.route = { name: 'home' };
      this.loadInitialData();
    }
  };

  private navigateTo(route: string, params?: Record<string, string>) {
    switch (route) {
      case 'home':
        this.route = { name: 'home' };
        this.loadInitialData();
        break;
      case 'channel':
        if (params?.id) {
          this.route = { name: 'channel', id: params.id };
          this.loadChannel(params.id);
        }
        break;
      case 'block':
        if (params?.id) {
          this.route = { name: 'block', id: params.id };
          this.loadBlock(params.id);
        }
        break;
    }
  }

  private async loadInitialData() {
    this.loading = true;
    this.error = null;

    try {
      const page = await garden.channels.list({ limit: 50 });
      this.channels = page.items;
    } catch (e) {
      this.error = e instanceof GardenError ? `${e.code}: ${e.message}` : String(e);
    } finally {
      this.loading = false;
    }
  }

  private async loadChannel(id: string) {
    this.loading = true;
    this.error = null;

    try {
      const [channel, blocks] = await Promise.all([
        garden.channels.get(id),
        garden.connections.getBlocksInChannel(id),
      ]);
      this.currentChannel = channel;
      this.blocksInChannel = blocks;
    } catch (e) {
      this.error = e instanceof GardenError ? `${e.code}: ${e.message}` : String(e);
    } finally {
      this.loading = false;
    }
  }

  private async loadBlock(id: string) {
    this.loading = true;
    this.error = null;

    try {
      const [block, channels] = await Promise.all([
        garden.blocks.get(id),
        garden.connections.getChannelsForBlock(id),
      ]);
      this.currentBlock = block;
      this.channelsForBlock = channels;
    } catch (e) {
      this.error = e instanceof GardenError ? `${e.code}: ${e.message}` : String(e);
    } finally {
      this.loading = false;
    }
  }

  private handleLogoClick = () => {
    this.navigateTo('home');
  };

  private handleChannelCreated = async (_e: CustomEvent<{ channel: Channel }>) => {
    await this.loadInitialData();
  };

  private handleChannelDeleted = async (_e: CustomEvent<{ id: string }>) => {
    await this.loadInitialData();
  };

  private handleChannelSelected = (e: CustomEvent<{ id: string }>) => {
    this.navigateTo('channel', { id: e.detail.id });
  };

  private handleBlockCreated = async () => {
    if (this.route.name === 'channel') {
      await this.loadChannel(this.route.id);
    }
  };

  private handleBlockDeleted = async () => {
    if (this.route.name === 'channel') {
      await this.loadChannel(this.route.id);
    }
  };

  private handleBlockSelected = (e: CustomEvent<{ blockId: string }>) => {
    this.navigateTo('block', { id: e.detail.blockId });
  };

  private handleNotesUpdate = async (e: CustomEvent<{ blockId: string; notes: string }>) => {
    const { blockId, notes } = e.detail;
    try {
      // Update only the notes field using FieldUpdate format
      // Other fields use 'keep' action (which is the default when not specified)
      const update: BlockUpdate = {
        notes: notes ? { action: 'set', value: notes } : { action: 'clear' },
      };
      const updatedBlock = await garden.blocks.update(blockId, update);
      // Update local state so the UI reflects the change
      this.currentBlock = updatedBlock;
    } catch (e) {
      this.error = e instanceof GardenError ? `${e.code}: ${e.message}` : String(e);
    }
  };

  private handleMetadataUpdate = async (
    e: CustomEvent<{ blockId: string; values: MetadataValues }>
  ) => {
    const { blockId, values } = e.detail;
    if (!this.currentBlock) return;

    try {
      // Build update object with only fields that have values
      // Absent fields = don't change, present fields = set to value
      const update: Record<string, unknown> = {};

      // Build content update for blocks with alt_text field
      const content = this.currentBlock.content;
      if (content.type === 'link') {
        update.content = {
          type: 'link',
          url: content.url,
          title: content.title,
          description: content.description,
          alt_text: values.altText || null,
        };
      } else if (content.type === 'image') {
        update.content = {
          type: 'image',
          file_path: content.file_path,
          width: content.width,
          height: content.height,
          alt_text: values.altText || null,
        };
      } else if (content.type === 'video') {
        update.content = {
          type: 'video',
          file_path: content.file_path,
          width: content.width,
          height: content.height,
          duration: content.duration,
          alt_text: values.altText || null,
        };
      }

      // Use FieldUpdate format: { action: 'set', value: string } for fields with values
      // Fields not included default to 'keep' (no change)
      if (values.sourceUrl) update.source_url = { action: 'set', value: values.sourceUrl };
      if (values.sourceTitle) update.source_title = { action: 'set', value: values.sourceTitle };
      if (values.creator) update.creator = { action: 'set', value: values.creator };
      if (values.originalDate) update.original_date = { action: 'set', value: values.originalDate };
      // Note: notes is handled separately via handleNotesUpdate

      const updatedBlock = await garden.blocks.update(blockId, update as BlockUpdate);
      this.currentBlock = updatedBlock;
    } catch (e) {
      console.error('[handleMetadataUpdate] Error:', e);
      this.error = e instanceof GardenError ? `${e.code}: ${e.message}` : String(e);
    }
  };

  override render() {
    return html`
      <header>
        <span class="logo" @click=${this.handleLogoClick}>Garden</span>
        <nav>
          <garden-button
            variant="ghost"
            size="sm"
            @click=${() => this.navigateTo('home')}
          >
            Channels
          </garden-button>
        </nav>
      </header>

      ${this.error ? html`<div class="error">${this.error}</div>` : null}

      <main>
        ${this.loading
          ? html`<div class="loading">Loading...</div>`
          : this.renderCurrentRoute()}
      </main>
    `;
  }

  private renderCurrentRoute() {
    switch (this.route.name) {
      case 'home':
        return html`
          <garden-home-page
            .channels=${this.channels}
            @garden:channel-created=${this.handleChannelCreated}
            @garden:channel-deleted=${this.handleChannelDeleted}
            @garden:channel-selected=${this.handleChannelSelected}
          ></garden-home-page>
        `;
      case 'channel':
        return html`
          <garden-channel-page
            .channel=${this.currentChannel}
            .blocks=${this.blocksInChannel}
            @garden:block-created=${this.handleBlockCreated}
            @garden:block-deleted=${this.handleBlockDeleted}
            @garden:navigate-block=${this.handleBlockSelected}
          ></garden-channel-page>
        `;
      case 'block':
        return html`
          <garden-block-page
            .block=${this.currentBlock}
            .channels=${this.channelsForBlock}
            @garden:notes-update=${this.handleNotesUpdate}
            @garden:metadata-update=${this.handleMetadataUpdate}
          ></garden-block-page>
        `;
      default:
        return html`<div>Not found</div>`;
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'garden-app-shell': GardenAppShell;
  }
}

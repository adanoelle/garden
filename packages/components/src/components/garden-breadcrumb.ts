import { html, css, CSSResultGroup, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';
import { GardenElement } from '../GardenElement.js';

/**
 * Breadcrumb item interface.
 */
export interface BreadcrumbItem {
  id: string;
  title: string;
  type?: 'home' | 'channel' | 'block' | 'page';
}

/**
 * Garden breadcrumb navigation component.
 *
 * Renders a minimal dot-based navigation history visualization.
 * Each dot represents a visited page, with tooltips on hover.
 * No connecting lines - just spaced dots for maximum minimalism.
 *
 * @fires garden:navigate - When a dot is clicked, with { item, index }
 */
@customElement('garden-breadcrumb')
export class GardenBreadcrumb extends GardenElement {
  static override styles: CSSResultGroup = [
    GardenElement.sharedStyles,
    css`
      :host {
        display: inline-flex;
        align-items: center;
        font-family: var(--garden-font-mono);
      }

      nav {
        display: flex;
        align-items: center;
        gap: var(--garden-space-2);
      }

      .dot {
        /* Reset */
        appearance: none;
        border: none;
        background: none;
        font: inherit;

        /* Sizing */
        width: 6px;
        height: 6px;
        padding: 0;
        margin: 0;

        /* Visual - hollow by default */
        border-radius: 50%;
        border: 1px solid var(--garden-fg);
        background: transparent;
        cursor: pointer;
        position: relative;
        box-sizing: content-box;

        /* Transitions */
        transition:
          background-color var(--garden-duration-fast) var(--garden-ease-out),
          background-image var(--garden-duration-fast) var(--garden-ease-out);

        /* Fade in animation */
        animation: fadeIn var(--garden-duration-fast) var(--garden-ease-out);
      }

      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }

      @media (prefers-reduced-motion: reduce) {
        .dot {
          animation: none;
        }
      }

      /* Touch target - invisible expanded hit area */
      .dot::before {
        content: '';
        position: absolute;
        inset: -9px;
      }

      /* Active dot - dithered fill on desktop */
      .dot[data-active] {
        background-image: var(--garden-dither-50);
        background-size: 2px 2px;
      }

      /* Hover - subtle dither for non-active dots */
      .dot:hover:not(:disabled):not([data-active]) {
        background-image: var(--garden-dither-25);
        background-size: 4px 4px;
      }

      /* Focus visible */
      .dot:focus-visible {
        outline: var(--garden-focus-ring);
        outline-offset: 4px;
      }

      /* Ellipsis container - JS controls [data-expanded] */
      .ellipsis-container {
        position: relative;
        display: flex;
        align-items: center;
      }

      /* Ellipsis button */
      .ellipsis {
        color: var(--garden-fg-muted);
        font-size: var(--garden-text-xs);
        letter-spacing: 2px;
        cursor: pointer;
        padding: var(--garden-space-1);
        background: none;
        border: none;
        font-family: inherit;
        max-width: 3em;
        overflow: hidden;
        transition:
          opacity 200ms var(--garden-ease-out),
          max-width 250ms var(--garden-ease-out),
          padding 250ms var(--garden-ease-out);
      }

      .ellipsis:hover {
        color: var(--garden-fg);
      }

      .ellipsis:focus-visible {
        outline: var(--garden-focus-ring);
        outline-offset: 2px;
      }

      /* Ellipsis hidden when expanded */
      .ellipsis-container[data-expanded] .ellipsis {
        opacity: 0;
        max-width: 0;
        padding: 0;
      }

      /* Hidden dots container */
      .hidden-dots {
        display: flex;
        align-items: center;
        gap: var(--garden-space-2);
        overflow: hidden;
        max-width: 0;
        opacity: 0;
        transition:
          max-width 250ms var(--garden-ease-out),
          opacity 200ms var(--garden-ease-out);
      }

      /* Expanded state - 500px accommodates ~30 dots with gaps */
      .ellipsis-container[data-expanded] .hidden-dots {
        max-width: 500px;
        opacity: 1;
      }

      /* Individual dots scale up */
      .hidden-dots .dot {
        transform: scale(0.6);
        opacity: 0;
        transition:
          transform 200ms var(--garden-ease-out),
          opacity 150ms var(--garden-ease-out);
      }

      .ellipsis-container[data-expanded] .hidden-dots .dot {
        transform: scale(1);
        opacity: 1;
      }

      /* Staggered delays on expand */
      .ellipsis-container[data-expanded] .hidden-dots .dot:nth-child(1) { transition-delay: 0ms; }
      .ellipsis-container[data-expanded] .hidden-dots .dot:nth-child(2) { transition-delay: 25ms; }
      .ellipsis-container[data-expanded] .hidden-dots .dot:nth-child(3) { transition-delay: 50ms; }
      .ellipsis-container[data-expanded] .hidden-dots .dot:nth-child(4) { transition-delay: 75ms; }
      .ellipsis-container[data-expanded] .hidden-dots .dot:nth-child(5) { transition-delay: 100ms; }
      .ellipsis-container[data-expanded] .hidden-dots .dot:nth-child(6) { transition-delay: 125ms; }
      .ellipsis-container[data-expanded] .hidden-dots .dot:nth-child(7) { transition-delay: 150ms; }
      .ellipsis-container[data-expanded] .hidden-dots .dot:nth-child(8) { transition-delay: 175ms; }
      .ellipsis-container[data-expanded] .hidden-dots .dot:nth-child(n+9) { transition-delay: 200ms; }

      @media (prefers-reduced-motion: reduce) {
        .hidden-dots,
        .hidden-dots .dot,
        .ellipsis {
          transition-duration: 0ms;
          transition-delay: 0ms;
        }
      }

      /* Tooltip */
      .tooltip {
        position: absolute;
        bottom: calc(100% + 8px);
        left: 50%;
        transform: translateX(-50%);
        padding: var(--garden-space-1) var(--garden-space-2);
        background: var(--garden-bg);
        border: 1px solid var(--garden-fg);
        color: var(--garden-fg);
        font-size: var(--garden-text-xs);
        white-space: nowrap;
        pointer-events: none;
        opacity: 0;
        z-index: 10;

        transition: opacity var(--garden-duration-fast) var(--garden-ease-out);
      }

      .dot:hover .tooltip,
      .dot:focus-visible .tooltip {
        opacity: 1;
      }

      .tooltip-type {
        color: var(--garden-fg-muted);
        margin-left: var(--garden-space-1);
      }

      /* Mobile: smaller dots, solid fill for active */
      @media (max-width: 640px) {
        :host(:not([density="full"])) nav {
          gap: var(--garden-space-1);
        }

        :host(:not([density="full"])) .dot {
          width: 4px;
          height: 4px;
        }

        /* Solid black on mobile for active dot */
        :host(:not([density="full"])) .dot[data-active] {
          background-image: none;
          background-color: var(--garden-fg);
        }

        :host(:not([density="full"])) .tooltip {
          display: none;
        }

        :host(:not([density="full"])) .ellipsis {
          font-size: 10px;
          letter-spacing: 1px;
          padding: var(--garden-space-1) 0;
        }
      }
    `
  ];

  /** Array of navigation history items */
  @property({ type: Array })
  items: BreadcrumbItem[] = [];

  /** Index of active item (-1 = last item) */
  @property({ type: Number })
  active = -1;

  /** Max dots before truncation */
  @property({ type: Number, attribute: 'max-visible' })
  maxVisible = 8;

  /** Density override (prevents auto-detection) */
  @property({ reflect: true })
  density?: 'minimal' | 'full';

  @state()
  private _expanded = false;

  private _collapseTimeout: number | null = null;

  private get _activeIndex(): number {
    return this.active < 0 ? this.items.length - 1 : this.active;
  }

  private get _needsTruncation(): boolean {
    return this.items.length > this.maxVisible;
  }

  /** Items that are always visible (first + last N-1) */
  private get _visibleItems(): { item: BreadcrumbItem; index: number }[] {
    if (!this._needsTruncation) {
      return this.items.map((item, index) => ({ item, index }));
    }

    const result: { item: BreadcrumbItem; index: number }[] = [];
    // Always show first item
    result.push({ item: this.items[0], index: 0 });
    // Show last N-1 items
    const startIndex = this.items.length - (this.maxVisible - 1);
    for (let i = startIndex; i < this.items.length; i++) {
      result.push({ item: this.items[i], index: i });
    }
    return result;
  }

  /** Items hidden behind ellipsis (middle items) */
  private get _hiddenItems(): { item: BreadcrumbItem; index: number }[] {
    if (!this._needsTruncation) {
      return [];
    }

    const result: { item: BreadcrumbItem; index: number }[] = [];
    const endIndex = this.items.length - (this.maxVisible - 1);
    for (let i = 1; i < endIndex; i++) {
      result.push({ item: this.items[i], index: i });
    }
    return result;
  }

  private _handleClick(index: number) {
    const item = this.items[index];
    this.emit('navigate', { item, index });
  }

  private _handleExpand() {
    // Cancel any pending collapse
    if (this._collapseTimeout) {
      clearTimeout(this._collapseTimeout);
      this._collapseTimeout = null;
    }
    this._expanded = true;
  }

  private _handleCollapse() {
    // Debounce collapse by 150ms
    if (this._collapseTimeout) return;
    this._collapseTimeout = window.setTimeout(() => {
      this._expanded = false;
      this._collapseTimeout = null;
    }, 150);
  }

  private _handleFocusOut(e: FocusEvent) {
    // Only collapse if focus moved outside the component
    const relatedTarget = e.relatedTarget as Node | null;
    if (relatedTarget && this.contains(relatedTarget)) {
      return; // Focus is still within component
    }
    this._handleCollapse();
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    if (this._collapseTimeout) {
      clearTimeout(this._collapseTimeout);
    }
  }

  override willUpdate(changedProperties: Map<string, unknown>) {
    // Reset expanded state if items no longer need truncation
    if (changedProperties.has('items') || changedProperties.has('maxVisible')) {
      if (!this._needsTruncation && this._expanded) {
        this._expanded = false;
      }
    }
  }

  private _renderDot(item: BreadcrumbItem, index: number) {
    return html`
      <button
        class="dot"
        ?data-active=${index === this._activeIndex}
        @click=${() => this._handleClick(index)}
        aria-label="${item.title}"
        aria-current=${index === this._activeIndex ? 'page' : nothing}
      >
        <span class="tooltip">
          ${item.title}${item.type ? html`<span class="tooltip-type">${item.type}</span>` : nothing}
        </span>
      </button>
    `;
  }

  override render() {
    if (this.items.length === 0) {
      return nothing;
    }

    const hiddenItems = this._hiddenItems;
    const visibleItems = this._visibleItems;

    return html`
      <nav
        aria-label="Navigation history"
        @mouseleave=${this._handleCollapse}
        @focusout=${this._handleFocusOut}
      >
        <!-- First dot (always visible) -->
        ${visibleItems.length > 0
          ? this._renderDot(visibleItems[0].item, visibleItems[0].index)
          : nothing}

        <!-- Ellipsis with hidden dots that expand on hover -->
        ${hiddenItems.length > 0 ? html`
          <div class="ellipsis-container" ?data-expanded=${this._expanded}>
            <button
              class="ellipsis"
              aria-label="Hover to show ${hiddenItems.length} hidden pages"
              aria-expanded=${this._expanded}
              @mouseenter=${this._handleExpand}
              @focus=${this._handleExpand}
            >···</button>
            <div class="hidden-dots" role="group" aria-label="Hidden pages">
              ${repeat(
                hiddenItems,
                (entry) => entry.item.id,
                (entry) => this._renderDot(entry.item, entry.index)
              )}
            </div>
          </div>
        ` : nothing}

        <!-- Remaining visible dots -->
        ${repeat(
          visibleItems.slice(1),
          (entry) => entry.item.id,
          (entry) => this._renderDot(entry.item, entry.index)
        )}
      </nav>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'garden-breadcrumb': GardenBreadcrumb;
  }
}

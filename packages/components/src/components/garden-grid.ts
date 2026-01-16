import { html, css, CSSResultGroup, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { GardenElement } from '../GardenElement.js';

/**
 * Garden grid component.
 *
 * A paginated content grid for displaying collections of blocks/cards.
 * Uses CSS Grid with responsive auto-fit columns and built-in pagination.
 *
 * @slot - Grid items (cards, blocks, etc.)
 * @slot empty - Content shown when no items
 * @fires garden:page-change - When page changes, with { page, pageSize }
 */
@customElement('garden-grid')
export class GardenGrid extends GardenElement {
  static override styles: CSSResultGroup = [
    GardenElement.sharedStyles,
    css`
      :host {
        display: block;
      }

      .grid {
        display: grid;
        grid-template-columns: repeat(
          auto-fit,
          minmax(var(--garden-grid-min-width, 200px), 1fr)
        );
        gap: var(--garden-grid-gap, var(--garden-space-4));
        transition: opacity var(--garden-duration-normal) var(--garden-ease-out);
      }

      /* Fixed columns override */
      .grid[data-columns] {
        grid-template-columns: repeat(var(--garden-grid-columns), 1fr);
      }

      /* Loading state */
      :host([loading]) .grid {
        opacity: 0.5;
        pointer-events: none;
      }

      /* Empty state */
      .empty {
        grid-column: 1 / -1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: var(--garden-space-8);
        color: var(--garden-fg-muted);
        text-align: center;
        min-height: 200px;
      }

      /* Auto-fill placeholders */
      .placeholder {
        background-color: var(--garden-bg);
        border: var(--garden-border-width) solid var(--garden-fg);
        opacity: 0.25;
        min-height: var(--garden-placeholder-height, 120px);
      }

      /* Pagination */
      .pagination {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: var(--garden-space-4);
        margin-top: var(--garden-space-6);
        font-size: var(--garden-text-sm);
      }

      .page-btn {
        /* Reset */
        appearance: none;
        background: none;
        font: inherit;

        /* Sizing - circular button */
        width: 28px;
        height: 28px;
        padding: 0;

        /* Visual */
        border: 1px solid var(--garden-fg);
        border-radius: 50%;
        cursor: pointer;
        color: var(--garden-fg);

        /* Layout */
        display: inline-flex;
        align-items: center;
        justify-content: center;

        /* Transitions */
        transition:
          background-color var(--garden-duration-fast) var(--garden-ease-out),
          background-image var(--garden-duration-fast) var(--garden-ease-out),
          opacity var(--garden-duration-fast) var(--garden-ease-out);
      }

      .page-btn:hover:not(:disabled) {
        background-image: var(--garden-dither-50);
        background-size: 2px 2px;
        color: var(--garden-bg);
        text-shadow:
          0 0 2px var(--garden-fg),
          0 0 4px var(--garden-fg);
      }

      .page-btn:active:not(:disabled) {
        background-image: none;
        background-color: var(--garden-fg);
        color: var(--garden-bg);
      }

      .page-btn:disabled {
        opacity: 0.3;
        cursor: not-allowed;
      }

      .page-btn:focus-visible {
        outline: var(--garden-focus-ring);
        outline-offset: 2px;
      }

      .page-info {
        color: var(--garden-fg-muted);
        min-width: 80px;
        text-align: center;
      }

      /* Mobile adjustments */
      @media (max-width: 640px) {
        :host(:not([density="full"])) .grid {
          grid-template-columns: 1fr;
          gap: var(--garden-space-2);
        }

        :host(:not([density="full"])) .page-btn {
          width: 36px;
          height: 36px;
        }

        :host(:not([density="full"])) .pagination {
          margin-top: var(--garden-space-4);
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .grid {
          transition: none;
        }
      }
    `
  ];

  /** Number of columns (omit for responsive auto-fit) */
  @property({ type: Number })
  columns?: number;

  /** Gap between items (CSS value) */
  @property({ type: String })
  gap?: string;

  /** Items per page */
  @property({ type: Number, attribute: 'page-size' })
  pageSize = 24;

  /** Current page (1-indexed) */
  @property({ type: Number })
  page = 1;

  /** Total item count for pagination */
  @property({ type: Number })
  total = 0;

  /** Loading state - fades content */
  @property({ type: Boolean, reflect: true })
  loading = false;

  /** Hide built-in pagination controls */
  @property({ type: Boolean, attribute: 'hide-pagination' })
  hidePagination = false;

  /** Density override (prevents mobile auto-detection) */
  @property({ reflect: true })
  density?: 'minimal' | 'full';

  /** Fill grid to this many slots with placeholders */
  @property({ type: Number })
  fill?: number;

  @state()
  private _hasSlottedContent = false;

  @state()
  private _slottedCount = 0;

  private get _totalPages(): number {
    return Math.max(1, Math.ceil(this.total / this.pageSize));
  }

  private get _showPagination(): boolean {
    return !this.hidePagination && this._totalPages > 1;
  }

  private get _showEmpty(): boolean {
    return this.total === 0 && !this._hasSlottedContent;
  }

  private _handlePrev() {
    if (this.page > 1) {
      this.page--;
      this.emit('page-change', { page: this.page, pageSize: this.pageSize });
    }
  }

  private _handleNext() {
    if (this.page < this._totalPages) {
      this.page++;
      this.emit('page-change', { page: this.page, pageSize: this.pageSize });
    }
  }

  private _handleSlotChange(e: Event) {
    const slot = e.target as HTMLSlotElement;
    const nodes = slot.assignedNodes({ flatten: true });
    // Count element nodes for fill calculation
    const elements = nodes.filter(node => node.nodeType === Node.ELEMENT_NODE);
    this._slottedCount = elements.length;
    this._hasSlottedContent = elements.length > 0 || nodes.some(
      node => node.nodeType === Node.TEXT_NODE && node.textContent?.trim()
    );
  }

  private get _placeholderCount(): number {
    if (!this.fill || this.fill <= this._slottedCount) return 0;
    return this.fill - this._slottedCount;
  }

  override render() {
    const gridStyle = [
      this.columns ? `--garden-grid-columns: ${this.columns}` : '',
      this.gap ? `--garden-grid-gap: ${this.gap}` : '',
    ].filter(Boolean).join('; ');

    // Generate placeholder elements
    const placeholders = Array.from(
      { length: this._placeholderCount },
      () => html`<div class="placeholder" aria-hidden="true"></div>`
    );

    return html`
      <div
        class="grid"
        style=${gridStyle || nothing}
        ?data-columns=${!!this.columns}
        role="list"
      >
        <slot @slotchange=${this._handleSlotChange}></slot>
        ${placeholders}
        ${this._showEmpty ? html`
          <div class="empty" role="status">
            <slot name="empty">No items</slot>
          </div>
        ` : nothing}
      </div>

      ${this._showPagination ? html`
        <nav class="pagination" aria-label="Pagination">
          <button
            class="page-btn"
            @click=${this._handlePrev}
            ?disabled=${this.page <= 1 || this.loading}
            aria-label="Previous page"
          >←</button>
          <span class="page-info" aria-live="polite">
            ${this.page} of ${this._totalPages}
          </span>
          <button
            class="page-btn"
            @click=${this._handleNext}
            ?disabled=${this.page >= this._totalPages || this.loading}
            aria-label="Next page"
          >→</button>
        </nav>
      ` : nothing}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'garden-grid': GardenGrid;
  }
}

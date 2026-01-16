import { html, css, CSSResultGroup, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';
import { GardenElement } from '../GardenElement.js';

/**
 * Menu item configuration.
 */
export interface ContextMenuItem {
  id: string;
  label: string;
  icon?: string;           // Optional right-aligned icon (e.g., "→" for submenu, "⚠" for destructive)
  shortcut?: string;       // Keyboard shortcut hint
  disabled?: boolean;
  destructive?: boolean;   // Styled as warning
  separator?: boolean;     // Render as separator line instead of item
}

/**
 * Context for what was right-clicked.
 */
export interface MenuContext {
  type: 'block' | 'channel' | 'empty';
  id?: string;
  title?: string;
}

/**
 * Garden context menu component.
 *
 * A floating menu that appears on right-click or from a trigger button.
 * Supports keyboard navigation and follows the Garden interaction model.
 *
 * @fires garden:menu-select - When an item is selected, with { itemId, context }
 * @fires garden:menu-close - When the menu is closed
 *
 * @example
 * ```html
 * <garden-context-menu
 *   .items=${[
 *     { id: 'edit', label: 'Edit' },
 *     { id: 'sep1', separator: true },
 *     { id: 'delete', label: 'Delete', destructive: true, icon: '⚠' }
 *   ]}
 *   .x=${100}
 *   .y=${200}
 *   open
 * ></garden-context-menu>
 * ```
 */
@customElement('garden-context-menu')
export class GardenContextMenu extends GardenElement {
  static override styles: CSSResultGroup = [
    GardenElement.sharedStyles,
    css`
      :host {
        position: fixed;
        z-index: 1000;
        display: none;
      }

      :host([open]) {
        display: block;
      }

      .menu {
        background: var(--garden-bg);
        border: 1px solid var(--garden-fg);
        min-width: 180px;
        max-width: 280px;
        padding: var(--garden-space-1) 0;
      }

      .menu-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--garden-space-3);
        padding: var(--garden-space-2) var(--garden-space-3);
        cursor: pointer;
        font-size: var(--garden-text-sm);
        color: var(--garden-fg);
        background: transparent;
        border: none;
        width: 100%;
        text-align: left;
        font-family: inherit;
        transition:
          background-image var(--garden-duration-fast) var(--garden-ease-out),
          color var(--garden-duration-fast) var(--garden-ease-out);
      }

      .menu-item:focus {
        outline: none;
      }

      /* Hover/Focus - Dither pattern */
      .menu-item:hover:not(.disabled),
      .menu-item:focus-visible:not(.disabled),
      .menu-item.highlighted:not(.disabled) {
        background-image: var(--garden-dither-50);
        background-size: 2px 2px;
        color: var(--garden-bg);
        text-shadow:
          0 0 2px var(--garden-fg),
          0 0 4px var(--garden-fg),
          0 0 6px var(--garden-fg);
      }

      /* Active - Solid inversion */
      .menu-item:active:not(.disabled) {
        background-image: none;
        background-color: var(--garden-fg);
        color: var(--garden-bg);
        text-shadow: none;
      }

      /* Disabled */
      .menu-item.disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      /* Destructive */
      .menu-item.destructive {
        /* Same styling, just has warning icon */
      }

      .menu-item-label {
        flex: 1;
      }

      .menu-item-meta {
        display: flex;
        align-items: center;
        gap: var(--garden-space-2);
        color: var(--garden-fg-muted);
        font-size: var(--garden-text-xs);
      }

      /* Keep meta visible on hover */
      .menu-item:hover:not(.disabled) .menu-item-meta,
      .menu-item:focus-visible:not(.disabled) .menu-item-meta,
      .menu-item.highlighted:not(.disabled) .menu-item-meta {
        color: var(--garden-bg);
        opacity: 0.8;
      }

      .shortcut {
        font-family: var(--garden-font-mono);
      }

      .icon {
        /* Right-aligned icon */
      }

      /* Separator */
      .separator {
        height: 1px;
        background: var(--garden-fg-muted);
        margin: var(--garden-space-1) var(--garden-space-3);
        opacity: 0.3;
      }

      /* Mobile: larger touch targets */
      @media (max-width: 640px) {
        .menu-item {
          padding: var(--garden-space-3) var(--garden-space-4);
          min-height: 44px;
        }
      }
    `
  ];

  /** Menu items to display */
  @property({ type: Array })
  items: ContextMenuItem[] = [];

  /** X position (left edge) */
  @property({ type: Number })
  x = 0;

  /** Y position (top edge) */
  @property({ type: Number })
  y = 0;

  /** Whether menu is visible */
  @property({ type: Boolean, reflect: true })
  open = false;

  /** Context about what was right-clicked */
  @property({ type: Object })
  context?: MenuContext;

  /** Currently highlighted item index */
  @state()
  private _highlightedIndex = -1;

  private _boundHandleClickOutside = this._handleClickOutside.bind(this);
  private _boundHandleKeydown = this._handleKeydown.bind(this);

  override connectedCallback() {
    super.connectedCallback();
    document.addEventListener('click', this._boundHandleClickOutside);
    document.addEventListener('keydown', this._boundHandleKeydown);
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener('click', this._boundHandleClickOutside);
    document.removeEventListener('keydown', this._boundHandleKeydown);
  }

  override updated(changedProperties: Map<string, unknown>) {
    if (changedProperties.has('open')) {
      if (this.open) {
        this._highlightedIndex = -1;
        this._adjustPosition();
      }
    }
    if (changedProperties.has('x') || changedProperties.has('y')) {
      if (this.open) {
        this._adjustPosition();
      }
    }
  }

  /**
   * Adjust position to stay within viewport.
   */
  private _adjustPosition() {
    requestAnimationFrame(() => {
      const menu = this.shadowRoot?.querySelector('.menu') as HTMLElement;
      if (!menu) return;

      const rect = menu.getBoundingClientRect();
      const viewport = {
        width: window.innerWidth,
        height: window.innerHeight
      };

      let adjustedX = this.x;
      let adjustedY = this.y;

      // Flip horizontal if near right edge
      if (adjustedX + rect.width > viewport.width - 8) {
        adjustedX = this.x - rect.width;
      }

      // Flip vertical if near bottom
      if (adjustedY + rect.height > viewport.height - 8) {
        adjustedY = this.y - rect.height;
      }

      // Clamp to viewport
      adjustedX = Math.max(8, adjustedX);
      adjustedY = Math.max(8, adjustedY);

      this.style.left = `${adjustedX}px`;
      this.style.top = `${adjustedY}px`;
    });
  }

  private _handleClickOutside(e: MouseEvent) {
    if (!this.open) return;

    const path = e.composedPath();
    if (!path.includes(this)) {
      this._close();
    }
  }

  private _handleKeydown(e: KeyboardEvent) {
    if (!this.open) return;

    const selectableIndices = this.items
      .map((item, idx) => (!item.separator && !item.disabled) ? idx : -1)
      .filter(idx => idx !== -1);

    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        this._close();
        break;

      case 'ArrowDown':
        e.preventDefault();
        if (this._highlightedIndex === -1) {
          // Find first selectable
          this._highlightedIndex = selectableIndices[0] ?? -1;
        } else {
          // Find next selectable
          const currentSelectableIdx = selectableIndices.indexOf(this._highlightedIndex);
          if (currentSelectableIdx < selectableIndices.length - 1) {
            this._highlightedIndex = selectableIndices[currentSelectableIdx + 1];
          }
        }
        break;

      case 'ArrowUp':
        e.preventDefault();
        if (this._highlightedIndex === -1) {
          // Find last selectable
          this._highlightedIndex = selectableIndices[selectableIndices.length - 1] ?? -1;
        } else {
          // Find previous selectable
          const currentSelectableIdx = selectableIndices.indexOf(this._highlightedIndex);
          if (currentSelectableIdx > 0) {
            this._highlightedIndex = selectableIndices[currentSelectableIdx - 1];
          }
        }
        break;

      case 'Enter':
        e.preventDefault();
        if (this._highlightedIndex >= 0) {
          const item = this.items[this._highlightedIndex];
          if (item && !item.disabled && !item.separator) {
            this._selectItem(item);
          }
        }
        break;

      case 'Home':
        e.preventDefault();
        this._highlightedIndex = selectableIndices[0] ?? -1;
        break;

      case 'End':
        e.preventDefault();
        this._highlightedIndex = selectableIndices[selectableIndices.length - 1] ?? -1;
        break;
    }
  }

  private _selectItem(item: ContextMenuItem) {
    this.emit('menu-select', {
      itemId: item.id,
      context: this.context
    });
    this._close();
  }

  private _close() {
    this.open = false;
    this._highlightedIndex = -1;
    this.emit('menu-close');
  }

  private _handleItemClick(item: ContextMenuItem, e: MouseEvent) {
    e.stopPropagation();
    if (item.disabled) return;
    this._selectItem(item);
  }

  private _handleItemMouseEnter(index: number) {
    const item = this.items[index];
    if (!item.separator && !item.disabled) {
      this._highlightedIndex = index;
    }
  }

  override render() {
    return html`
      <div class="menu" role="menu" aria-hidden=${!this.open}>
        ${repeat(
          this.items,
          item => item.id,
          (item, index) => {
            if (item.separator) {
              return html`<div class="separator" role="separator"></div>`;
            }

            const classes = [
              'menu-item',
              item.disabled ? 'disabled' : '',
              item.destructive ? 'destructive' : '',
              index === this._highlightedIndex ? 'highlighted' : ''
            ].filter(Boolean).join(' ');

            return html`
              <button
                class=${classes}
                role="menuitem"
                tabindex=${item.disabled ? -1 : 0}
                aria-disabled=${item.disabled || nothing}
                @click=${(e: MouseEvent) => this._handleItemClick(item, e)}
                @mouseenter=${() => this._handleItemMouseEnter(index)}
              >
                <span class="menu-item-label">${item.label}</span>
                ${item.shortcut || item.icon ? html`
                  <span class="menu-item-meta">
                    ${item.shortcut ? html`<span class="shortcut">${item.shortcut}</span>` : nothing}
                    ${item.icon ? html`<span class="icon">${item.icon}</span>` : nothing}
                  </span>
                ` : nothing}
              </button>
            `;
          }
        )}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'garden-context-menu': GardenContextMenu;
  }
}

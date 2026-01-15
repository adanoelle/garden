import { html, css, CSSResultGroup } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { GardenElement } from '../GardenElement.js';

/**
 * Garden checkbox component.
 *
 * Uses Unicode symbols: ☐ (unchecked) and ☑ (checked)
 *
 * @slot - Label content
 * @fires garden:change - When checked state changes
 */
@customElement('garden-checkbox')
export class GardenCheckbox extends GardenElement {
  static formAssociated = true;

  static override styles: CSSResultGroup = [
    GardenElement.sharedStyles,
    css`
      :host {
        display: inline-flex;
        align-items: center;
        gap: var(--garden-space-2);
        cursor: pointer;
      }

      :host([disabled]) {
        cursor: not-allowed;
        opacity: 0.5;
      }

      .checkbox {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: var(--garden-text-lg);
        line-height: 1;
        user-select: none;
      }

      .checkbox-input {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border: 0;
      }

      .checkbox-control {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 1.25em;
        height: 1.25em;
        border: var(--garden-border-width) solid var(--garden-fg);
        background: transparent;
        font-size: var(--garden-text-base);
        transition:
          background-color var(--garden-duration-fast) var(--garden-ease-out),
          background-image var(--garden-duration-fast) var(--garden-ease-out);
      }

      /* Hover state */
      :host(:not([disabled])) .checkbox:hover .checkbox-control {
        background-image: var(--garden-dither-50);
        background-size: 2px 2px;
      }

      /* Focus state */
      .checkbox-input:focus-visible + .checkbox-control {
        outline: var(--garden-focus-ring);
        outline-offset: var(--garden-focus-offset);
      }

      /* Checked state */
      :host([checked]) .checkbox-control {
        background-color: var(--garden-fg);
        color: var(--garden-bg);
      }

      :host([checked]:not([disabled])) .checkbox:hover .checkbox-control {
        background-image: var(--garden-dither-50);
        background-color: var(--garden-bg);
        color: var(--garden-fg);
      }

      .check-symbol {
        font-size: 0.85em;
        line-height: 1;
      }

      .label {
        font-size: var(--garden-text-sm);
        user-select: none;
      }

      /* === MINIMAL/MOBILE MODE === */

      :host([minimal]) .checkbox-control,
      :host([minimal]) .check-symbol {
        display: none;
      }

      :host([minimal]) .checkbox::after {
        content: '[ ]';
        font-size: var(--garden-text-sm);
      }

      :host([minimal][checked]) .checkbox::after {
        content: '[x]';
      }

      /* Auto-detect mobile */
      @media (max-width: 640px) {
        :host(:not([density="full"])) .checkbox-control,
        :host(:not([density="full"])) .check-symbol {
          display: none;
        }

        :host(:not([density="full"])) .checkbox::after {
          content: '[ ]';
          font-size: var(--garden-text-sm);
        }

        :host(:not([density="full"])[checked]) .checkbox::after {
          content: '[x]';
        }
      }
    `,
  ];

  private _internals: ElementInternals;

  constructor() {
    super();
    this._internals = this.attachInternals();
    this.addEventListener('click', (e) => {
      // Prevent double-toggle from label triggering native checkbox
      e.preventDefault();
      this._handleClick();
    });
  }

  /** Whether the checkbox is checked */
  @property({ type: Boolean, reflect: true })
  checked = false;

  /** Whether the checkbox is disabled */
  @property({ type: Boolean, reflect: true })
  disabled = false;

  /** Checkbox name for form submission */
  @property()
  name = '';

  /** Checkbox value for form submission */
  @property()
  value = 'on';

  /** Force minimal/mobile style */
  @property({ type: Boolean, reflect: true })
  minimal = false;

  /** Density override (prevents auto-detection) */
  @property({ reflect: true })
  density?: 'minimal' | 'full';

  /** Focus the checkbox */
  focus(options?: FocusOptions) {
    this.shadowRoot?.querySelector('input')?.focus(options);
  }

  /** Blur the checkbox */
  blur() {
    this.shadowRoot?.querySelector('input')?.blur();
  }

  private _handleClick() {
    if (this.disabled) return;
    this.checked = !this.checked;
    this._internals.setFormValue(this.checked ? this.value : null);
    this.emit('change', { checked: this.checked, value: this.value });
  }

  private _handleKeydown(e: KeyboardEvent) {
    if (this.disabled) return;
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      this._handleClick();
    }
  }

  override render() {
    return html`
      <label class="checkbox">
        <input
          type="checkbox"
          class="checkbox-input"
          .checked=${this.checked}
          ?disabled=${this.disabled}
          name=${this.name}
          value=${this.value}
          @keydown=${this._handleKeydown}
        />
        <span class="checkbox-control">
          ${this.checked ? html`<span class="check-symbol">✓</span>` : ''}
        </span>
      </label>
      <span class="label">
        <slot></slot>
      </span>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'garden-checkbox': GardenCheckbox;
  }
}

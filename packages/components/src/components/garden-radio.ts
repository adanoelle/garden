import { html, css, CSSResultGroup } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { GardenElement } from '../GardenElement.js';

/**
 * Garden radio component.
 *
 * Uses Unicode symbols: ○ (unselected) and ● (selected)
 *
 * @slot - Label content
 * @fires garden:change - When selection changes
 */
@customElement('garden-radio')
export class GardenRadio extends GardenElement {
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

      .radio {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: var(--garden-text-lg);
        line-height: 1;
        user-select: none;
      }

      .radio-input {
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

      .radio-control {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 1.25em;
        height: 1.25em;
        border: var(--garden-border-width) solid var(--garden-fg);
        border-radius: 50%;
        background: transparent;
        font-size: var(--garden-text-base);
        transition:
          background-color var(--garden-duration-fast) var(--garden-ease-out),
          background-image var(--garden-duration-fast) var(--garden-ease-out);
      }

      /* Hover state */
      :host(:not([disabled])) .radio:hover .radio-control {
        background-image: var(--garden-dither-50);
        background-size: 2px 2px;
      }

      /* Focus state */
      .radio-input:focus-visible + .radio-control {
        outline: var(--garden-focus-ring);
        outline-offset: var(--garden-focus-offset);
      }

      /* Selected state */
      :host([checked]) .radio-control {
        background-color: var(--garden-fg);
        color: var(--garden-bg);
      }

      :host([checked]:not([disabled])) .radio:hover .radio-control {
        background-image: var(--garden-dither-50);
        background-color: var(--garden-bg);
        color: var(--garden-fg);
      }

      .radio-symbol {
        font-size: 0.5em;
        line-height: 1;
      }

      .label {
        font-size: var(--garden-text-sm);
        user-select: none;
      }

      /* === MINIMAL/MOBILE MODE === */

      :host([minimal]) .radio-control,
      :host([minimal]) .radio-symbol {
        display: none;
      }

      :host([minimal]) .radio::after {
        content: '( )';
        font-size: var(--garden-text-sm);
      }

      :host([minimal][checked]) .radio::after {
        content: '(*)';
      }

      /* Auto-detect mobile */
      @media (max-width: 640px) {
        :host(:not([density="full"])) .radio-control,
        :host(:not([density="full"])) .radio-symbol {
          display: none;
        }

        :host(:not([density="full"])) .radio::after {
          content: '( )';
          font-size: var(--garden-text-sm);
        }

        :host(:not([density="full"])[checked]) .radio::after {
          content: '(*)';
        }
      }
    `,
  ];

  private _internals: ElementInternals;

  constructor() {
    super();
    this._internals = this.attachInternals();
    this.addEventListener('click', (e) => {
      // Prevent double-toggle from label triggering native radio
      e.preventDefault();
      this._handleClick();
    });
  }

  /** Whether the radio is selected */
  @property({ type: Boolean, reflect: true })
  checked = false;

  /** Whether the radio is disabled */
  @property({ type: Boolean, reflect: true })
  disabled = false;

  /** Radio name for grouping */
  @property()
  name = '';

  /** Radio value for form submission */
  @property()
  value = '';

  /** Force minimal/mobile style */
  @property({ type: Boolean, reflect: true })
  minimal = false;

  /** Density override (prevents auto-detection) */
  @property({ reflect: true })
  density?: 'minimal' | 'full';

  /** Focus the radio */
  focus(options?: FocusOptions) {
    this.shadowRoot?.querySelector('input')?.focus(options);
  }

  /** Blur the radio */
  blur() {
    this.shadowRoot?.querySelector('input')?.blur();
  }

  private _handleClick() {
    if (this.disabled || this.checked) return;

    // Uncheck other radios in the same group
    // Scope to nearest form, or fallback to document
    if (this.name) {
      const form = this.closest('form');
      const container = form || document;
      const escapedName = CSS.escape(this.name);
      const group = container.querySelectorAll(`garden-radio[name="${escapedName}"]`);

      group.forEach((radio) => {
        if (radio !== this && radio instanceof GardenRadio && radio.checked) {
          radio.checked = false;
        }
      });
    }

    this.checked = true;
    this._internals.setFormValue(this.value);
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
      <label class="radio">
        <input
          type="radio"
          class="radio-input"
          .checked=${this.checked}
          ?disabled=${this.disabled}
          name=${this.name}
          value=${this.value}
          @keydown=${this._handleKeydown}
        />
        <span class="radio-control">
          ${this.checked ? html`<span class="radio-symbol">●</span>` : ''}
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
    'garden-radio': GardenRadio;
  }
}

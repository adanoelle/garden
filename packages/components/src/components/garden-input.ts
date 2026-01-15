import { html, css, CSSResultGroup, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { GardenElement } from '../GardenElement.js';

/**
 * Garden input component.
 *
 * Interaction states:
 * - Rest: clean border, transparent background
 * - Focus: dithered pattern fills background, text stays readable
 * - Disabled: 50% opacity, no interactions
 *
 * @fires garden:input - On every keystroke
 * @fires garden:change - On blur or Enter (value committed)
 */
@customElement('garden-input')
export class GardenInput extends GardenElement {
  static formAssociated = true;

  static override styles: CSSResultGroup = [
    GardenElement.sharedStyles,
    css`
      :host {
        display: block;
      }

      input {
        /* Reset */
        appearance: none;
        border: none;
        background: none;
        font: inherit;

        /* Layout */
        display: block;
        width: 100%;
        padding: var(--garden-space-2) var(--garden-space-3);
        min-height: 2.5rem;

        /* Typography */
        font-family: var(--garden-font-mono);
        font-size: var(--garden-text-sm);
        line-height: var(--garden-leading-tight);

        /* Visual - Rest state */
        color: var(--garden-fg);
        background-color: transparent;
        border: var(--garden-border-width) solid var(--garden-fg);

        /* Transitions */
        transition:
          background-color var(--garden-duration-fast) var(--garden-ease-out),
          background-image var(--garden-duration-fast) var(--garden-ease-out);
      }

      /* Placeholder styling */
      input::placeholder {
        color: var(--garden-fg-muted);
        opacity: 1;
      }

      /* Focus state - dither-50 background with soft halo for readability */
      input:focus {
        outline: none;
        background-image: var(--garden-dither-50);
        background-size: 2px 2px;
        text-shadow:
          0 0 2px var(--garden-bg),
          0 0 4px var(--garden-bg),
          0 0 6px var(--garden-bg);
      }

      /* Focus-visible for keyboard navigation */
      input:focus-visible {
        outline: var(--garden-focus-ring);
        outline-offset: var(--garden-focus-offset);
      }

      /* Disabled */
      input:disabled {
        cursor: not-allowed;
        opacity: 0.5;
      }

      /* Read-only - subtle differentiation */
      input:read-only:not(:disabled) {
        background-color: var(--garden-bg-subtle);
      }

      /* === SIZES === */

      :host([size='sm']) input {
        padding: var(--garden-space-1) var(--garden-space-2);
        min-height: 2rem;
        font-size: var(--garden-text-xs);
      }

      :host([size='lg']) input {
        padding: var(--garden-space-3) var(--garden-space-4);
        min-height: 3rem;
        font-size: var(--garden-text-base);
      }

      /* === MINIMAL/MOBILE MODE === */

      :host([minimal]) input {
        border: none;
        border-bottom: var(--garden-divider-width) solid var(--garden-divider-color);
        padding: var(--garden-space-2) 0;
        min-height: auto;
      }

      :host([minimal]) input:focus {
        background-image: none;
        text-shadow: none;
        border-bottom-color: var(--garden-fg);
      }

      :host([minimal]) input:read-only:not(:disabled) {
        background-color: transparent;
      }

      /* Auto-detect mobile */
      @media (max-width: 640px) {
        :host(:not([density="full"])) input {
          border: none;
          border-bottom: var(--garden-divider-width) solid var(--garden-divider-color);
          padding: var(--garden-space-2) 0;
          min-height: auto;
        }

        :host(:not([density="full"])) input:focus {
          background-image: none;
          text-shadow: none;
          border-bottom-color: var(--garden-fg);
        }

        :host(:not([density="full"])) input:read-only:not(:disabled) {
          background-color: transparent;
        }
      }
    `,
  ];

  private _internals: ElementInternals;

  constructor() {
    super();
    this._internals = this.attachInternals();
  }

  /** Input type */
  @property({ reflect: true })
  type: 'text' | 'email' | 'password' | 'number' | 'search' | 'tel' | 'url' = 'text';

  /** Current value */
  @property()
  value = '';

  /** Placeholder text */
  @property()
  placeholder = '';

  /** Disabled state */
  @property({ type: Boolean, reflect: true })
  disabled = false;

  /** Read-only state */
  @property({ type: Boolean, reflect: true })
  readonly = false;

  /** Required validation */
  @property({ type: Boolean, reflect: true })
  required = false;

  /** Input name for form submission */
  @property()
  name = '';

  /** Input size */
  @property({ reflect: true })
  size: 'sm' | 'md' | 'lg' = 'md';

  /** Autocomplete hint */
  @property()
  autocomplete = 'off';

  /** Maximum length */
  @property({ type: Number })
  maxlength?: number;

  /** Minimum length */
  @property({ type: Number })
  minlength?: number;

  /** Pattern for validation (regex string) */
  @property()
  pattern?: string;

  /** Force minimal/mobile style */
  @property({ type: Boolean, reflect: true })
  minimal = false;

  /** Density override (prevents auto-detection) */
  @property({ reflect: true })
  density?: 'minimal' | 'full';

  private _handleInput(e: InputEvent) {
    const input = e.target as HTMLInputElement;
    this.value = input.value;
    this._internals.setFormValue(this.value);
    this.emit('input', { value: this.value, originalEvent: e });
  }

  private _handleChange(e: Event) {
    const input = e.target as HTMLInputElement;
    this.value = input.value;
    this._internals.setFormValue(this.value);
    this.emit('change', { value: this.value, originalEvent: e });
  }

  /** Focus the input */
  focus(options?: FocusOptions) {
    this.shadowRoot?.querySelector('input')?.focus(options);
  }

  /** Blur the input */
  blur() {
    this.shadowRoot?.querySelector('input')?.blur();
  }

  /** Select all text */
  select() {
    this.shadowRoot?.querySelector('input')?.select();
  }

  override render() {
    return html`
      <input
        type=${this.type}
        .value=${this.value}
        placeholder=${this.placeholder || nothing}
        ?disabled=${this.disabled}
        ?readonly=${this.readonly}
        ?required=${this.required}
        name=${this.name || nothing}
        autocomplete=${this.autocomplete}
        maxlength=${this.maxlength ?? nothing}
        minlength=${this.minlength ?? nothing}
        pattern=${this.pattern || nothing}
        @input=${this._handleInput}
        @change=${this._handleChange}
      />
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'garden-input': GardenInput;
  }
}

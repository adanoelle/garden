import { expect, fixture, html, oneEvent } from '@open-wc/testing';
import { GardenInput } from './garden-input.js';

// Helper to query shadow DOM
function queryShadow<T extends Element>(host: HTMLElement, selector: string): T | null {
  return host.shadowRoot?.querySelector<T>(selector) ?? null;
}

describe('GardenInput', () => {
  describe('rendering', () => {
    it('renders with default values', async () => {
      const el = await fixture<GardenInput>(html`<garden-input></garden-input>`);

      expect(el).to.be.instanceOf(GardenInput);
      expect(el.type).to.equal('text');
      expect(el.value).to.equal('');
      expect(el.disabled).to.be.false;
      expect(el.readonly).to.be.false;
    });

    it('renders a native input element in shadow DOM', async () => {
      const el = await fixture<GardenInput>(html`<garden-input></garden-input>`);
      const input = queryShadow<HTMLInputElement>(el, 'input');

      expect(input).to.exist;
      expect(input?.tagName.toLowerCase()).to.equal('input');
    });

    it('renders placeholder', async () => {
      const el = await fixture<GardenInput>(
        html`<garden-input placeholder="Enter text..."></garden-input>`
      );
      const input = queryShadow<HTMLInputElement>(el, 'input')!;

      expect(input.placeholder).to.equal('Enter text...');
    });
  });

  describe('property reflection', () => {
    it('reflects type to attribute', async () => {
      const el = await fixture<GardenInput>(html`<garden-input type="email"></garden-input>`);

      expect(el.getAttribute('type')).to.equal('email');
    });

    it('reflects disabled to attribute', async () => {
      const el = await fixture<GardenInput>(html`<garden-input disabled></garden-input>`);

      expect(el.hasAttribute('disabled')).to.be.true;

      el.disabled = false;
      await el.updateComplete;
      expect(el.hasAttribute('disabled')).to.be.false;
    });

    it('reflects readonly to attribute', async () => {
      const el = await fixture<GardenInput>(html`<garden-input readonly></garden-input>`);

      expect(el.hasAttribute('readonly')).to.be.true;
    });

    it('reflects size to attribute', async () => {
      const el = await fixture<GardenInput>(html`<garden-input size="lg"></garden-input>`);

      expect(el.getAttribute('size')).to.equal('lg');
    });
  });

  describe('types', () => {
    it('supports text type', async () => {
      const el = await fixture<GardenInput>(html`<garden-input type="text"></garden-input>`);
      const input = queryShadow<HTMLInputElement>(el, 'input')!;

      expect(input.type).to.equal('text');
    });

    it('supports email type', async () => {
      const el = await fixture<GardenInput>(html`<garden-input type="email"></garden-input>`);
      const input = queryShadow<HTMLInputElement>(el, 'input')!;

      expect(input.type).to.equal('email');
    });

    it('supports password type', async () => {
      const el = await fixture<GardenInput>(html`<garden-input type="password"></garden-input>`);
      const input = queryShadow<HTMLInputElement>(el, 'input')!;

      expect(input.type).to.equal('password');
    });

    it('supports number type', async () => {
      const el = await fixture<GardenInput>(html`<garden-input type="number"></garden-input>`);
      const input = queryShadow<HTMLInputElement>(el, 'input')!;

      expect(input.type).to.equal('number');
    });
  });

  describe('events', () => {
    it('fires garden:input event on input', async () => {
      const el = await fixture<GardenInput>(html`<garden-input></garden-input>`);
      const input = queryShadow<HTMLInputElement>(el, 'input')!;

      const listener = oneEvent(el, 'garden:input');
      input.value = 'test';
      input.dispatchEvent(new InputEvent('input', { bubbles: true }));
      const event = await listener;

      expect(event).to.exist;
      expect(event.type).to.equal('garden:input');
      expect(event.detail.value).to.equal('test');
    });

    it('fires garden:change event on change', async () => {
      const el = await fixture<GardenInput>(html`<garden-input></garden-input>`);
      const input = queryShadow<HTMLInputElement>(el, 'input')!;

      const listener = oneEvent(el, 'garden:change');
      input.value = 'changed';
      input.dispatchEvent(new Event('change', { bubbles: true }));
      const event = await listener;

      expect(event).to.exist;
      expect(event.type).to.equal('garden:change');
      expect(event.detail.value).to.equal('changed');
    });

    it('updates value property on input', async () => {
      const el = await fixture<GardenInput>(html`<garden-input></garden-input>`);
      const input = queryShadow<HTMLInputElement>(el, 'input')!;

      input.value = 'new value';
      input.dispatchEvent(new InputEvent('input', { bubbles: true }));

      expect(el.value).to.equal('new value');
    });
  });

  describe('disabled state', () => {
    it('sets disabled attribute on native input', async () => {
      const el = await fixture<GardenInput>(html`<garden-input disabled></garden-input>`);
      const input = queryShadow<HTMLInputElement>(el, 'input')!;

      expect(input.disabled).to.be.true;
    });

    it('applies disabled styles (opacity)', async () => {
      const el = await fixture<GardenInput>(html`<garden-input disabled></garden-input>`);
      const input = queryShadow<HTMLInputElement>(el, 'input')!;
      const styles = getComputedStyle(input);

      expect(styles.opacity).to.equal('0.5');
    });
  });

  describe('readonly state', () => {
    it('sets readonly attribute on native input', async () => {
      const el = await fixture<GardenInput>(html`<garden-input readonly></garden-input>`);
      const input = queryShadow<HTMLInputElement>(el, 'input')!;

      expect(input.readOnly).to.be.true;
    });
  });

  describe('sizes', () => {
    it('sm size has smaller height', async () => {
      const smEl = await fixture<GardenInput>(html`<garden-input size="sm"></garden-input>`);
      const mdEl = await fixture<GardenInput>(html`<garden-input size="md"></garden-input>`);

      const smInput = queryShadow<HTMLInputElement>(smEl, 'input')!;
      const mdInput = queryShadow<HTMLInputElement>(mdEl, 'input')!;

      const smHeight = smInput.getBoundingClientRect().height;
      const mdHeight = mdInput.getBoundingClientRect().height;

      expect(smHeight).to.be.lessThan(mdHeight);
    });

    it('lg size has larger height', async () => {
      const mdEl = await fixture<GardenInput>(html`<garden-input size="md"></garden-input>`);
      const lgEl = await fixture<GardenInput>(html`<garden-input size="lg"></garden-input>`);

      const mdInput = queryShadow<HTMLInputElement>(mdEl, 'input')!;
      const lgInput = queryShadow<HTMLInputElement>(lgEl, 'input')!;

      const mdHeight = mdInput.getBoundingClientRect().height;
      const lgHeight = lgInput.getBoundingClientRect().height;

      expect(lgHeight).to.be.greaterThan(mdHeight);
    });
  });

  describe('methods', () => {
    it('focus() focuses the input', async () => {
      const el = await fixture<GardenInput>(html`<garden-input></garden-input>`);
      const input = queryShadow<HTMLInputElement>(el, 'input')!;

      el.focus();

      expect(el.shadowRoot?.activeElement).to.equal(input);
    });

    it('select() selects all text', async () => {
      const el = await fixture<GardenInput>(
        html`<garden-input value="select me"></garden-input>`
      );
      const input = queryShadow<HTMLInputElement>(el, 'input')!;

      el.focus();
      el.select();

      expect(input.selectionStart).to.equal(0);
      expect(input.selectionEnd).to.equal(9);
    });
  });
});

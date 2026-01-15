import { expect } from '@open-wc/testing';
import { fixture, html, oneEvent } from '@open-wc/testing';
import { GardenButton } from './garden-button.js';

// Helper to query shadow DOM
function queryShadow<T extends Element>(host: HTMLElement, selector: string): T | null {
  return host.shadowRoot?.querySelector<T>(selector) ?? null;
}

describe('GardenButton', () => {
  describe('rendering', () => {
    it('renders with default values', async () => {
      const el = await fixture<GardenButton>(html`<garden-button>Click me</garden-button>`);

      expect(el).to.be.instanceOf(GardenButton);
      expect(el.variant).to.equal('default');
      expect(el.size).to.equal('md');
      expect(el.disabled).to.be.false;
    });

    it('renders slot content', async () => {
      const el = await fixture<GardenButton>(html`<garden-button>Test Label</garden-button>`);

      expect(el.textContent?.trim()).to.equal('Test Label');
    });

    it('renders a native button element in shadow DOM', async () => {
      const el = await fixture<GardenButton>(html`<garden-button>Test</garden-button>`);
      const button = queryShadow<HTMLButtonElement>(el, 'button');

      expect(button).to.exist;
      expect(button?.tagName.toLowerCase()).to.equal('button');
    });
  });

  describe('property reflection', () => {
    it('reflects variant to attribute', async () => {
      const el = await fixture<GardenButton>(html`<garden-button variant="ghost">Test</garden-button>`);

      expect(el.getAttribute('variant')).to.equal('ghost');

      el.variant = 'solid';
      await el.updateComplete;
      expect(el.getAttribute('variant')).to.equal('solid');
    });

    it('reflects size to attribute', async () => {
      const el = await fixture<GardenButton>(html`<garden-button size="lg">Test</garden-button>`);

      expect(el.getAttribute('size')).to.equal('lg');
    });

    it('reflects disabled to attribute', async () => {
      const el = await fixture<GardenButton>(html`<garden-button disabled>Test</garden-button>`);

      expect(el.hasAttribute('disabled')).to.be.true;

      el.disabled = false;
      await el.updateComplete;
      expect(el.hasAttribute('disabled')).to.be.false;
    });
  });

  describe('events', () => {
    it('fires garden:click event on click', async () => {
      const el = await fixture<GardenButton>(html`<garden-button>Test</garden-button>`);
      const button = queryShadow<HTMLButtonElement>(el, 'button')!;

      const listener = oneEvent(el, 'garden:click');
      button.click();
      const event = await listener;

      expect(event).to.exist;
      expect(event.type).to.equal('garden:click');
    });

    it('includes original event in detail', async () => {
      const el = await fixture<GardenButton>(html`<garden-button>Test</garden-button>`);
      const button = queryShadow<HTMLButtonElement>(el, 'button')!;

      const listener = oneEvent(el, 'garden:click');
      button.click();
      const event = await listener;

      expect(event.detail).to.have.property('originalEvent');
    });
  });

  describe('disabled state', () => {
    it('does not fire events when disabled', async () => {
      const el = await fixture<GardenButton>(html`<garden-button disabled>Test</garden-button>`);
      const button = queryShadow<HTMLButtonElement>(el, 'button')!;

      let eventFired = false;
      el.addEventListener('garden:click', () => { eventFired = true; });

      button.click();

      expect(eventFired).to.be.false;
    });

    it('sets disabled attribute on native button', async () => {
      const el = await fixture<GardenButton>(html`<garden-button disabled>Test</garden-button>`);
      const button = queryShadow<HTMLButtonElement>(el, 'button')!;

      expect(button.disabled).to.be.true;
    });
  });

  describe('variants', () => {
    it('default variant has visible border', async () => {
      const el = await fixture<GardenButton>(html`<garden-button>Test</garden-button>`);
      const button = queryShadow<HTMLButtonElement>(el, 'button')!;
      const styles = getComputedStyle(button);

      expect(styles.borderStyle).to.not.equal('none');
    });

    it('ghost variant exists', async () => {
      const el = await fixture<GardenButton>(html`<garden-button variant="ghost">Test</garden-button>`);

      expect(el.variant).to.equal('ghost');
    });

    it('solid variant exists', async () => {
      const el = await fixture<GardenButton>(html`<garden-button variant="solid">Test</garden-button>`);

      expect(el.variant).to.equal('solid');
    });
  });

  describe('sizes', () => {
    it('sm size has smaller height', async () => {
      const smEl = await fixture<GardenButton>(html`<garden-button size="sm">Test</garden-button>`);
      const mdEl = await fixture<GardenButton>(html`<garden-button size="md">Test</garden-button>`);

      const smButton = queryShadow<HTMLButtonElement>(smEl, 'button')!;
      const mdButton = queryShadow<HTMLButtonElement>(mdEl, 'button')!;

      const smHeight = smButton.getBoundingClientRect().height;
      const mdHeight = mdButton.getBoundingClientRect().height;

      expect(smHeight).to.be.lessThan(mdHeight);
    });

    it('lg size has larger height', async () => {
      const mdEl = await fixture<GardenButton>(html`<garden-button size="md">Test</garden-button>`);
      const lgEl = await fixture<GardenButton>(html`<garden-button size="lg">Test</garden-button>`);

      const mdButton = queryShadow<HTMLButtonElement>(mdEl, 'button')!;
      const lgButton = queryShadow<HTMLButtonElement>(lgEl, 'button')!;

      const mdHeight = mdButton.getBoundingClientRect().height;
      const lgHeight = lgButton.getBoundingClientRect().height;

      expect(lgHeight).to.be.greaterThan(mdHeight);
    });
  });

  describe('full width', () => {
    it('full attribute makes host display block', async () => {
      const el = await fixture<GardenButton>(html`<garden-button full>Test</garden-button>`);
      const styles = getComputedStyle(el);

      expect(styles.display).to.equal('block');
    });
  });
});

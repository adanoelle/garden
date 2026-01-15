import { expect, fixture, html, oneEvent } from '@open-wc/testing';
import { GardenCard } from './garden-card.js';

// Helper to query shadow DOM
function queryShadow<T extends Element>(host: HTMLElement, selector: string): T | null {
  return host.shadowRoot?.querySelector<T>(selector) ?? null;
}

describe('GardenCard', () => {
  describe('rendering', () => {
    it('renders with default values', async () => {
      const el = await fixture<GardenCard>(html`<garden-card>Content</garden-card>`);

      expect(el).to.be.instanceOf(GardenCard);
      expect(el.clickable).to.be.false;
      expect(el.href).to.be.undefined;
    });

    it('renders a div by default', async () => {
      const el = await fixture<GardenCard>(html`<garden-card>Content</garden-card>`);
      const card = queryShadow<HTMLDivElement>(el, '.card');

      expect(card).to.exist;
      expect(card?.tagName.toLowerCase()).to.equal('div');
    });

    it('renders slot content', async () => {
      const el = await fixture<GardenCard>(html`<garden-card>Test Content</garden-card>`);

      expect(el.textContent?.trim()).to.equal('Test Content');
    });
  });

  describe('slots', () => {
    it('renders header slot', async () => {
      const el = await fixture<GardenCard>(html`
        <garden-card>
          <span slot="header">Header</span>
          Content
        </garden-card>
      `);

      const headerSlot = queryShadow<HTMLSlotElement>(el, 'slot[name="header"]');
      expect(headerSlot).to.exist;

      const assignedNodes = headerSlot?.assignedNodes({ flatten: true }) || [];
      expect(assignedNodes.length).to.be.greaterThan(0);
    });

    it('renders footer slot', async () => {
      const el = await fixture<GardenCard>(html`
        <garden-card>
          Content
          <span slot="footer">Footer</span>
        </garden-card>
      `);

      const footerSlot = queryShadow<HTMLSlotElement>(el, 'slot[name="footer"]');
      expect(footerSlot).to.exist;

      const assignedNodes = footerSlot?.assignedNodes({ flatten: true }) || [];
      expect(assignedNodes.length).to.be.greaterThan(0);
    });

    it('renders default slot for content', async () => {
      const el = await fixture<GardenCard>(html`<garden-card>Main content</garden-card>`);

      const contentSlot = queryShadow<HTMLSlotElement>(el, '.card-content slot:not([name])');
      expect(contentSlot).to.exist;
    });
  });

  describe('clickable state', () => {
    it('reflects clickable to attribute', async () => {
      const el = await fixture<GardenCard>(html`<garden-card clickable>Content</garden-card>`);

      expect(el.hasAttribute('clickable')).to.be.true;
    });

    it('adds tabindex when clickable', async () => {
      const el = await fixture<GardenCard>(html`<garden-card clickable>Content</garden-card>`);
      const card = queryShadow<HTMLDivElement>(el, '.card')!;

      expect(card.getAttribute('tabindex')).to.equal('0');
    });

    it('adds role="button" when clickable', async () => {
      const el = await fixture<GardenCard>(html`<garden-card clickable>Content</garden-card>`);
      const card = queryShadow<HTMLDivElement>(el, '.card')!;

      expect(card.getAttribute('role')).to.equal('button');
    });

    it('fires garden:click event when clicked', async () => {
      const el = await fixture<GardenCard>(html`<garden-card clickable>Content</garden-card>`);
      const card = queryShadow<HTMLDivElement>(el, '.card')!;

      const listener = oneEvent(el, 'garden:click');
      card.click();
      const event = await listener;

      expect(event).to.exist;
      expect(event.type).to.equal('garden:click');
    });

    it('fires garden:click on Enter key', async () => {
      const el = await fixture<GardenCard>(html`<garden-card clickable>Content</garden-card>`);
      const card = queryShadow<HTMLDivElement>(el, '.card')!;

      const listener = oneEvent(el, 'garden:click');
      card.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      const event = await listener;

      expect(event).to.exist;
    });

    it('fires garden:click on Space key', async () => {
      const el = await fixture<GardenCard>(html`<garden-card clickable>Content</garden-card>`);
      const card = queryShadow<HTMLDivElement>(el, '.card')!;

      const listener = oneEvent(el, 'garden:click');
      card.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
      const event = await listener;

      expect(event).to.exist;
    });

    it('does not fire events when not clickable', async () => {
      const el = await fixture<GardenCard>(html`<garden-card>Content</garden-card>`);
      const card = queryShadow<HTMLDivElement>(el, '.card')!;

      let eventFired = false;
      el.addEventListener('garden:click', () => {
        eventFired = true;
      });

      card.click();

      expect(eventFired).to.be.false;
    });
  });

  describe('link mode (href)', () => {
    it('renders as anchor when href is set', async () => {
      const el = await fixture<GardenCard>(
        html`<garden-card href="https://example.com">Content</garden-card>`
      );
      const card = queryShadow<HTMLAnchorElement>(el, '.card');

      expect(card).to.exist;
      expect(card?.tagName.toLowerCase()).to.equal('a');
    });

    it('sets href attribute on anchor', async () => {
      const el = await fixture<GardenCard>(
        html`<garden-card href="https://example.com">Content</garden-card>`
      );
      const card = queryShadow<HTMLAnchorElement>(el, '.card')!;

      expect(card.href).to.equal('https://example.com/');
    });

    it('sets target attribute when provided', async () => {
      const el = await fixture<GardenCard>(
        html`<garden-card href="https://example.com" target="_blank">Content</garden-card>`
      );
      const card = queryShadow<HTMLAnchorElement>(el, '.card')!;

      expect(card.target).to.equal('_blank');
    });

    it('auto-adds rel="noopener noreferrer" for target="_blank"', async () => {
      const el = await fixture<GardenCard>(
        html`<garden-card href="https://example.com" target="_blank">Content</garden-card>`
      );
      const card = queryShadow<HTMLAnchorElement>(el, '.card')!;

      expect(card.rel).to.include('noopener');
      expect(card.rel).to.include('noreferrer');
    });

    it('uses custom rel when provided', async () => {
      const el = await fixture<GardenCard>(
        html`<garden-card href="https://example.com" rel="custom">Content</garden-card>`
      );
      const card = queryShadow<HTMLAnchorElement>(el, '.card')!;

      expect(card.rel).to.equal('custom');
    });
  });

  describe('styles', () => {
    it('has visible border', async () => {
      const el = await fixture<GardenCard>(html`<garden-card>Content</garden-card>`);
      const card = queryShadow<HTMLDivElement>(el, '.card')!;
      const styles = getComputedStyle(card);

      expect(styles.borderStyle).to.not.equal('none');
    });

    it('clickable card has cursor pointer', async () => {
      const el = await fixture<GardenCard>(html`<garden-card clickable>Content</garden-card>`);
      const card = queryShadow<HTMLDivElement>(el, '.card')!;
      const styles = getComputedStyle(card);

      expect(styles.cursor).to.equal('pointer');
    });
  });
});

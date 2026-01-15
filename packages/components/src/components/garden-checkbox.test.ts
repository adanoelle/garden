import { expect, fixture, html, oneEvent } from '@open-wc/testing';
import { GardenCheckbox } from './garden-checkbox.js';

// Helper to query shadow DOM
function queryShadow<T extends Element>(host: HTMLElement, selector: string): T | null {
  return host.shadowRoot?.querySelector<T>(selector) ?? null;
}

describe('GardenCheckbox', () => {
  describe('rendering', () => {
    it('renders with default values', async () => {
      const el = await fixture<GardenCheckbox>(html`<garden-checkbox></garden-checkbox>`);

      expect(el).to.be.instanceOf(GardenCheckbox);
      expect(el.checked).to.be.false;
      expect(el.disabled).to.be.false;
      expect(el.name).to.equal('');
      expect(el.value).to.equal('on');
    });

    it('renders checkbox structure', async () => {
      const el = await fixture<GardenCheckbox>(html`<garden-checkbox></garden-checkbox>`);

      const checkbox = queryShadow(el, '.checkbox');
      const input = queryShadow(el, '.checkbox-input');
      const control = queryShadow(el, '.checkbox-control');
      const label = queryShadow(el, '.label');

      expect(checkbox).to.exist;
      expect(input).to.exist;
      expect(control).to.exist;
      expect(label).to.exist;
    });

    it('renders slot for label content', async () => {
      const el = await fixture<GardenCheckbox>(
        html`<garden-checkbox>Accept terms</garden-checkbox>`
      );
      const slot = queryShadow(el, 'slot');

      expect(slot).to.exist;
    });
  });

  describe('checked state', () => {
    it('shows check symbol when checked', async () => {
      const el = await fixture<GardenCheckbox>(
        html`<garden-checkbox checked></garden-checkbox>`
      );
      const symbol = queryShadow(el, '.check-symbol');

      expect(symbol).to.exist;
      expect(symbol?.textContent).to.equal('✓');
    });

    it('hides check symbol when unchecked', async () => {
      const el = await fixture<GardenCheckbox>(html`<garden-checkbox></garden-checkbox>`);
      const symbol = queryShadow(el, '.check-symbol');

      expect(symbol).to.be.null;
    });

    it('toggles checked on click', async () => {
      const el = await fixture<GardenCheckbox>(html`<garden-checkbox></garden-checkbox>`);

      expect(el.checked).to.be.false;
      el.click();
      expect(el.checked).to.be.true;
      el.click();
      expect(el.checked).to.be.false;
    });
  });

  describe('property reflection', () => {
    it('reflects checked to attribute', async () => {
      const el = await fixture<GardenCheckbox>(html`<garden-checkbox></garden-checkbox>`);

      expect(el.hasAttribute('checked')).to.be.false;

      el.checked = true;
      await el.updateComplete;
      expect(el.hasAttribute('checked')).to.be.true;
    });

    it('reflects disabled to attribute', async () => {
      const el = await fixture<GardenCheckbox>(
        html`<garden-checkbox disabled></garden-checkbox>`
      );

      expect(el.hasAttribute('disabled')).to.be.true;
    });
  });

  describe('disabled state', () => {
    it('does not toggle when disabled', async () => {
      const el = await fixture<GardenCheckbox>(
        html`<garden-checkbox disabled></garden-checkbox>`
      );

      expect(el.checked).to.be.false;
      el.click();
      expect(el.checked).to.be.false;
    });

    it('does not toggle checked item when disabled', async () => {
      const el = await fixture<GardenCheckbox>(
        html`<garden-checkbox checked disabled></garden-checkbox>`
      );

      expect(el.checked).to.be.true;
      el.click();
      expect(el.checked).to.be.true;
    });
  });

  describe('events', () => {
    it('fires garden:change event on click', async () => {
      const el = await fixture<GardenCheckbox>(html`<garden-checkbox></garden-checkbox>`);

      const listener = oneEvent(el, 'garden:change');
      el.click();
      const event = await listener;

      expect(event).to.exist;
      expect(event.type).to.equal('garden:change');
      expect(event.detail.checked).to.be.true;
      expect(event.detail.value).to.equal('on');
    });

    it('includes custom value in event', async () => {
      const el = await fixture<GardenCheckbox>(
        html`<garden-checkbox value="custom-value"></garden-checkbox>`
      );

      const listener = oneEvent(el, 'garden:change');
      el.click();
      const event = await listener;

      expect(event.detail.value).to.equal('custom-value');
    });

    it('does not fire event when disabled', async () => {
      const el = await fixture<GardenCheckbox>(
        html`<garden-checkbox disabled></garden-checkbox>`
      );

      let eventFired = false;
      el.addEventListener('garden:change', () => {
        eventFired = true;
      });

      el.click();
      await el.updateComplete;

      expect(eventFired).to.be.false;
    });
  });

  describe('keyboard interaction', () => {
    it('toggles on Space key', async () => {
      const el = await fixture<GardenCheckbox>(html`<garden-checkbox></garden-checkbox>`);
      const input = queryShadow<HTMLInputElement>(el, '.checkbox-input')!;

      expect(el.checked).to.be.false;
      input.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
      expect(el.checked).to.be.true;
    });

    it('toggles on Enter key', async () => {
      const el = await fixture<GardenCheckbox>(html`<garden-checkbox></garden-checkbox>`);
      const input = queryShadow<HTMLInputElement>(el, '.checkbox-input')!;

      expect(el.checked).to.be.false;
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      expect(el.checked).to.be.true;
    });

    it('does not toggle on other keys', async () => {
      const el = await fixture<GardenCheckbox>(html`<garden-checkbox></garden-checkbox>`);
      const input = queryShadow<HTMLInputElement>(el, '.checkbox-input')!;

      expect(el.checked).to.be.false;
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }));
      expect(el.checked).to.be.false;
    });
  });

  describe('form association', () => {
    it('has formAssociated static property', () => {
      expect(GardenCheckbox.formAssociated).to.be.true;
    });

    it('sets name attribute on input', async () => {
      const el = await fixture<GardenCheckbox>(
        html`<garden-checkbox name="my-checkbox"></garden-checkbox>`
      );
      const input = queryShadow<HTMLInputElement>(el, '.checkbox-input')!;

      expect(input.name).to.equal('my-checkbox');
    });
  });

  describe('styles', () => {
    it('has pointer cursor when not disabled', async () => {
      const el = await fixture<GardenCheckbox>(html`<garden-checkbox></garden-checkbox>`);
      const styles = getComputedStyle(el);

      expect(styles.cursor).to.equal('pointer');
    });

    it('checkbox control has visible border', async () => {
      const el = await fixture<GardenCheckbox>(html`<garden-checkbox></garden-checkbox>`);
      const control = queryShadow<HTMLSpanElement>(el, '.checkbox-control')!;
      const styles = getComputedStyle(control);

      expect(styles.borderStyle).to.not.equal('none');
    });
  });
});

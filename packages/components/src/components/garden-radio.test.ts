import { expect, fixture, html, oneEvent } from '@open-wc/testing';
import { GardenRadio } from './garden-radio.js';

// Helper to query shadow DOM
function queryShadow<T extends Element>(host: HTMLElement, selector: string): T | null {
  return host.shadowRoot?.querySelector<T>(selector) ?? null;
}

describe('GardenRadio', () => {
  describe('rendering', () => {
    it('renders with default values', async () => {
      const el = await fixture<GardenRadio>(html`<garden-radio></garden-radio>`);

      expect(el).to.be.instanceOf(GardenRadio);
      expect(el.checked).to.be.false;
      expect(el.disabled).to.be.false;
      expect(el.name).to.equal('');
      expect(el.value).to.equal('');
    });

    it('renders radio structure', async () => {
      const el = await fixture<GardenRadio>(html`<garden-radio></garden-radio>`);

      const radio = queryShadow(el, '.radio');
      const input = queryShadow(el, '.radio-input');
      const control = queryShadow(el, '.radio-control');
      const label = queryShadow(el, '.label');

      expect(radio).to.exist;
      expect(input).to.exist;
      expect(control).to.exist;
      expect(label).to.exist;
    });

    it('renders slot for label content', async () => {
      const el = await fixture<GardenRadio>(
        html`<garden-radio>Option A</garden-radio>`
      );
      const slot = queryShadow(el, 'slot');

      expect(slot).to.exist;
    });
  });

  describe('checked state', () => {
    it('shows radio symbol when checked', async () => {
      const el = await fixture<GardenRadio>(
        html`<garden-radio checked></garden-radio>`
      );
      const symbol = queryShadow(el, '.radio-symbol');

      expect(symbol).to.exist;
      expect(symbol?.textContent).to.equal('●');
    });

    it('hides radio symbol when unchecked', async () => {
      const el = await fixture<GardenRadio>(html`<garden-radio></garden-radio>`);
      const symbol = queryShadow(el, '.radio-symbol');

      expect(symbol).to.be.null;
    });

    it('checks on click when unchecked', async () => {
      const el = await fixture<GardenRadio>(html`<garden-radio></garden-radio>`);

      expect(el.checked).to.be.false;
      el.click();
      expect(el.checked).to.be.true;
    });

    it('stays checked when clicking already checked radio', async () => {
      const el = await fixture<GardenRadio>(
        html`<garden-radio checked></garden-radio>`
      );

      expect(el.checked).to.be.true;
      el.click();
      expect(el.checked).to.be.true;
    });
  });

  describe('radio group behavior', () => {
    it('unchecks other radios in same group', async () => {
      const container = await fixture<HTMLDivElement>(html`
        <div>
          <garden-radio name="group1" value="a" checked></garden-radio>
          <garden-radio name="group1" value="b"></garden-radio>
          <garden-radio name="group1" value="c"></garden-radio>
        </div>
      `);

      const radios = container.querySelectorAll<GardenRadio>('garden-radio');
      const [radioA, radioB, radioC] = Array.from(radios);

      expect(radioA.checked).to.be.true;
      expect(radioB.checked).to.be.false;
      expect(radioC.checked).to.be.false;

      radioB.click();

      expect(radioA.checked).to.be.false;
      expect(radioB.checked).to.be.true;
      expect(radioC.checked).to.be.false;

      radioC.click();

      expect(radioA.checked).to.be.false;
      expect(radioB.checked).to.be.false;
      expect(radioC.checked).to.be.true;
    });

    it('does not affect radios in different groups', async () => {
      const container = await fixture<HTMLDivElement>(html`
        <div>
          <garden-radio name="group1" value="a" checked></garden-radio>
          <garden-radio name="group2" value="b" checked></garden-radio>
        </div>
      `);

      const radios = container.querySelectorAll<GardenRadio>('garden-radio');
      const [radioA, radioB] = Array.from(radios);

      expect(radioA.checked).to.be.true;
      expect(radioB.checked).to.be.true;

      // Both should remain checked since they're in different groups
      radioA.click();

      expect(radioA.checked).to.be.true;
      expect(radioB.checked).to.be.true;
    });
  });

  describe('property reflection', () => {
    it('reflects checked to attribute', async () => {
      const el = await fixture<GardenRadio>(html`<garden-radio></garden-radio>`);

      expect(el.hasAttribute('checked')).to.be.false;

      el.checked = true;
      await el.updateComplete;
      expect(el.hasAttribute('checked')).to.be.true;
    });

    it('reflects disabled to attribute', async () => {
      const el = await fixture<GardenRadio>(
        html`<garden-radio disabled></garden-radio>`
      );

      expect(el.hasAttribute('disabled')).to.be.true;
    });
  });

  describe('disabled state', () => {
    it('does not check when disabled', async () => {
      const el = await fixture<GardenRadio>(
        html`<garden-radio disabled></garden-radio>`
      );

      expect(el.checked).to.be.false;
      el.click();
      expect(el.checked).to.be.false;
    });

    it('stays checked when disabled and clicked', async () => {
      const el = await fixture<GardenRadio>(
        html`<garden-radio checked disabled></garden-radio>`
      );

      expect(el.checked).to.be.true;
      el.click();
      expect(el.checked).to.be.true;
    });
  });

  describe('events', () => {
    it('fires garden:change event on selection', async () => {
      const el = await fixture<GardenRadio>(
        html`<garden-radio value="my-value"></garden-radio>`
      );

      const listener = oneEvent(el, 'garden:change');
      el.click();
      const event = await listener;

      expect(event).to.exist;
      expect(event.type).to.equal('garden:change');
      expect(event.detail.checked).to.be.true;
      expect(event.detail.value).to.equal('my-value');
    });

    it('does not fire event when already checked', async () => {
      const el = await fixture<GardenRadio>(
        html`<garden-radio checked></garden-radio>`
      );

      let eventFired = false;
      el.addEventListener('garden:change', () => {
        eventFired = true;
      });

      el.click();
      await el.updateComplete;

      expect(eventFired).to.be.false;
    });

    it('does not fire event when disabled', async () => {
      const el = await fixture<GardenRadio>(
        html`<garden-radio disabled></garden-radio>`
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
    it('checks on Space key', async () => {
      const el = await fixture<GardenRadio>(html`<garden-radio></garden-radio>`);
      const input = queryShadow<HTMLInputElement>(el, '.radio-input')!;

      expect(el.checked).to.be.false;
      input.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
      expect(el.checked).to.be.true;
    });

    it('checks on Enter key', async () => {
      const el = await fixture<GardenRadio>(html`<garden-radio></garden-radio>`);
      const input = queryShadow<HTMLInputElement>(el, '.radio-input')!;

      expect(el.checked).to.be.false;
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      expect(el.checked).to.be.true;
    });

    it('does not check on other keys', async () => {
      const el = await fixture<GardenRadio>(html`<garden-radio></garden-radio>`);
      const input = queryShadow<HTMLInputElement>(el, '.radio-input')!;

      expect(el.checked).to.be.false;
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }));
      expect(el.checked).to.be.false;
    });
  });

  describe('form association', () => {
    it('has formAssociated static property', () => {
      expect(GardenRadio.formAssociated).to.be.true;
    });

    it('sets name attribute on input', async () => {
      const el = await fixture<GardenRadio>(
        html`<garden-radio name="my-radio"></garden-radio>`
      );
      const input = queryShadow<HTMLInputElement>(el, '.radio-input')!;

      expect(input.name).to.equal('my-radio');
    });
  });

  describe('styles', () => {
    it('has pointer cursor when not disabled', async () => {
      const el = await fixture<GardenRadio>(html`<garden-radio></garden-radio>`);
      const styles = getComputedStyle(el);

      expect(styles.cursor).to.equal('pointer');
    });

    it('radio control has circular border', async () => {
      const el = await fixture<GardenRadio>(html`<garden-radio></garden-radio>`);
      const control = queryShadow<HTMLSpanElement>(el, '.radio-control')!;
      const styles = getComputedStyle(control);

      expect(styles.borderRadius).to.equal('50%');
    });

    it('radio control has visible border', async () => {
      const el = await fixture<GardenRadio>(html`<garden-radio></garden-radio>`);
      const control = queryShadow<HTMLSpanElement>(el, '.radio-control')!;
      const styles = getComputedStyle(control);

      expect(styles.borderStyle).to.not.equal('none');
    });
  });
});

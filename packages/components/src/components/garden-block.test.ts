import { expect, fixture, html, oneEvent } from '@open-wc/testing';
import { GardenBlock } from './garden-block.js';

// Helper to query shadow DOM
function queryShadow<T extends Element>(host: HTMLElement, selector: string): T | null {
  return host.shadowRoot?.querySelector<T>(selector) ?? null;
}

describe('GardenBlock', () => {
  describe('rendering', () => {
    it('renders with default values', async () => {
      const el = await fixture<GardenBlock>(html`<garden-block></garden-block>`);

      expect(el).to.be.instanceOf(GardenBlock);
      expect(el.code).to.equal('');
      expect(el.playing).to.be.false;
      expect(el.readonly).to.be.false;
    });

    it('renders block structure', async () => {
      const el = await fixture<GardenBlock>(html`<garden-block></garden-block>`);

      const block = queryShadow(el, '.block');
      const header = queryShadow(el, '.block-header');
      const controls = queryShadow(el, '.block-controls');

      expect(block).to.exist;
      expect(header).to.exist;
      expect(controls).to.exist;
    });

    it('renders play and stop buttons', async () => {
      const el = await fixture<GardenBlock>(html`<garden-block></garden-block>`);

      const buttons = el.shadowRoot?.querySelectorAll('.control-btn');
      expect(buttons?.length).to.equal(2);

      const playBtn = buttons?.[0] as HTMLButtonElement;
      const stopBtn = buttons?.[1] as HTMLButtonElement;

      expect(playBtn.textContent?.trim()).to.equal('▶');
      expect(stopBtn.textContent?.trim()).to.equal('■');
    });

    it('renders label', async () => {
      const el = await fixture<GardenBlock>(html`<garden-block></garden-block>`);
      const label = queryShadow(el, '.block-label');

      expect(label).to.exist;
      expect(label?.textContent?.trim()).to.equal('strudel pattern');
    });
  });

  describe('code property', () => {
    it('renders code in textarea when not readonly', async () => {
      const el = await fixture<GardenBlock>(
        html`<garden-block code="note('c3')"></garden-block>`
      );
      const textarea = queryShadow<HTMLTextAreaElement>(el, '.block-textarea');

      expect(textarea).to.exist;
      expect(textarea?.value).to.equal("note('c3')");
    });

    it('renders code in pre when readonly', async () => {
      const el = await fixture<GardenBlock>(
        html`<garden-block code="note('c3')" readonly></garden-block>`
      );
      const pre = queryShadow<HTMLPreElement>(el, '.block-code');
      const textarea = queryShadow(el, '.block-textarea');

      expect(pre).to.exist;
      // Code is rendered with syntax highlighting, check it contains the function name
      expect(pre?.textContent).to.include('note');
      expect(pre?.textContent).to.include('c3');
      expect(textarea).to.be.null;
    });
  });

  describe('property reflection', () => {
    it('reflects playing to attribute', async () => {
      const el = await fixture<GardenBlock>(html`<garden-block></garden-block>`);

      expect(el.hasAttribute('playing')).to.be.false;

      el.playing = true;
      await el.updateComplete;
      expect(el.hasAttribute('playing')).to.be.true;
    });

    it('reflects readonly to attribute', async () => {
      const el = await fixture<GardenBlock>(html`<garden-block readonly></garden-block>`);

      expect(el.hasAttribute('readonly')).to.be.true;
    });
  });

  describe('controls state', () => {
    it('stop button is disabled when not playing', async () => {
      const el = await fixture<GardenBlock>(html`<garden-block></garden-block>`);
      const stopBtn = el.shadowRoot?.querySelectorAll('.control-btn')[1] as HTMLButtonElement;

      expect(stopBtn.disabled).to.be.true;
    });

    it('stop button is enabled when playing', async () => {
      const el = await fixture<GardenBlock>(html`<garden-block playing></garden-block>`);
      const stopBtn = el.shadowRoot?.querySelectorAll('.control-btn')[1] as HTMLButtonElement;

      expect(stopBtn.disabled).to.be.false;
    });

    it('play button is disabled when playing', async () => {
      const el = await fixture<GardenBlock>(html`<garden-block playing></garden-block>`);
      const playBtn = el.shadowRoot?.querySelectorAll('.control-btn')[0] as HTMLButtonElement;

      expect(playBtn.disabled).to.be.true;
    });
  });

  describe('events', () => {
    it('fires garden:change event on textarea input', async () => {
      const el = await fixture<GardenBlock>(html`<garden-block></garden-block>`);
      const textarea = queryShadow<HTMLTextAreaElement>(el, '.block-textarea')!;

      const listener = oneEvent(el, 'garden:change');
      textarea.value = 'note("c4")';
      textarea.dispatchEvent(new InputEvent('input', { bubbles: true }));
      const event = await listener;

      expect(event).to.exist;
      expect(event.type).to.equal('garden:change');
      expect(event.detail.code).to.equal('note("c4")');
    });

    it('updates code property on input', async () => {
      const el = await fixture<GardenBlock>(html`<garden-block></garden-block>`);
      const textarea = queryShadow<HTMLTextAreaElement>(el, '.block-textarea')!;

      textarea.value = 'new pattern';
      textarea.dispatchEvent(new InputEvent('input', { bubbles: true }));

      expect(el.code).to.equal('new pattern');
    });

    it('fires garden:stop event on stop button click', async () => {
      const el = await fixture<GardenBlock>(html`<garden-block playing></garden-block>`);
      const stopBtn = el.shadowRoot?.querySelectorAll('.control-btn')[1] as HTMLButtonElement;

      const listener = oneEvent(el, 'garden:stop');
      stopBtn.click();
      const event = await listener;

      expect(event).to.exist;
      expect(event.type).to.equal('garden:stop');
    });

    it('sets playing to false on stop', async () => {
      const el = await fixture<GardenBlock>(html`<garden-block playing></garden-block>`);
      const stopBtn = el.shadowRoot?.querySelectorAll('.control-btn')[1] as HTMLButtonElement;

      stopBtn.click();
      await el.updateComplete;

      expect(el.playing).to.be.false;
    });
  });

  describe('Strudel lazy loading', () => {
    it('play button is enabled by default (lazy loading)', async () => {
      const el = await fixture<GardenBlock>(html`<garden-block></garden-block>`);

      // Play button should be enabled - Strudel loads on first click
      const playBtn = el.shadowRoot?.querySelectorAll('.control-btn')[0] as HTMLButtonElement;
      expect(playBtn.disabled).to.be.false;
    });

    it('shows error when Strudel fails to load', async () => {
      const el = await fixture<GardenBlock>(html`<garden-block code="test"></garden-block>`);

      // Manually set error state (simulating load failure)
      (el as any)._error = 'Test error message';
      await el.updateComplete;

      const errorDiv = queryShadow(el, '.block-error');
      expect(errorDiv).to.exist;
      expect(errorDiv?.textContent).to.equal('Test error message');
    });
  });

  describe('styles', () => {
    it('has visible border', async () => {
      const el = await fixture<GardenBlock>(html`<garden-block></garden-block>`);
      const block = queryShadow<HTMLDivElement>(el, '.block')!;
      const styles = getComputedStyle(block);

      expect(styles.borderStyle).to.not.equal('none');
    });

    it('control buttons have cursor pointer', async () => {
      const el = await fixture<GardenBlock>(html`<garden-block></garden-block>`);
      const btn = queryShadow<HTMLButtonElement>(el, '.control-btn')!;
      const styles = getComputedStyle(btn);

      // Disabled buttons have not-allowed cursor
      // But the CSS rule is cursor: pointer on enabled buttons
      expect(styles.cursor).to.be.oneOf(['pointer', 'not-allowed']);
    });
  });

  describe('accessibility', () => {
    it('play button has aria-label', async () => {
      const el = await fixture<GardenBlock>(html`<garden-block></garden-block>`);
      const playBtn = el.shadowRoot?.querySelectorAll('.control-btn')[0] as HTMLButtonElement;

      expect(playBtn.getAttribute('aria-label')).to.equal('Play pattern');
    });

    it('stop button has aria-label', async () => {
      const el = await fixture<GardenBlock>(html`<garden-block></garden-block>`);
      const stopBtn = el.shadowRoot?.querySelectorAll('.control-btn')[1] as HTMLButtonElement;

      expect(stopBtn.getAttribute('aria-label')).to.equal('Stop pattern');
    });

    it('textarea has aria-label', async () => {
      const el = await fixture<GardenBlock>(html`<garden-block></garden-block>`);
      const textarea = queryShadow<HTMLTextAreaElement>(el, '.block-textarea');

      expect(textarea?.getAttribute('aria-label')).to.equal('Strudel pattern code');
    });
  });
});

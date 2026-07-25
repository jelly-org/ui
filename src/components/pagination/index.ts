/*
 * Page navigation built from jelly buttons, with a windowed page list
 * and previous / next arrows that follow the reading direction
 *
 * Emits `change` with event.detail.page when the page changes.
 */

import { canonicalizeSize }  from '../../utilities/index.js';
import { emit }              from '../../utilities/index.js';
import { isRTL }             from '../../utilities/index.js';

import { ensureThemeTokens } from '../../theme/index.js';

import '../button/index.js';

import paginationStyles      from './pagination.css?inline';

// Options for one rendered page button
interface PageButtonOptions {
  current?: boolean;
  disabled?: boolean;
  name?: string | null;
}

/**
 * Page navigation built from jelly buttons, with a windowed page list.
 *
 * @element jelly-pagination
 *
 * @attr {number} total - Total page count.
 * @attr {number} page - The current page (1-based).
 * @attr {"small"|"medium"|"large"} size - Button size.
 *
 * @fires change - With `detail.page` when the page changes.
 */
export class JellyPagination extends HTMLElement {

  built = false;

  // Populated in connectedCallback()
  row!: HTMLElement;
  onDirectionChange: () => void = () => this.render();

  // Tells the browser to trigger attributeChangedCallback when these attributes change
  static get observedAttributes (): string[] {
    return ['total', 'page', 'size'];
  }

  // Lifecycle method: Called automatically when the element is appended to the DOM
  connectedCallback (): void {
    ensureThemeTokens();
    canonicalizeSize(this);

    if (this.built) {
      return;
    }

    this.built = true;

    // Encapsulate styles and markup inside a Shadow DOM so they don't leak out
    this.attachShadow({ mode: 'open', delegatesFocus: true });

    this.shadowRoot!.innerHTML = `
      <style>${paginationStyles}</style>

      <div class="row" role="navigation" aria-label="Pagination"></div>
    `;

    this.row = this.shadowRoot!.querySelector('.row')!;

    // The arrow glyphs are direction-dependent, so re-render on a dir flip
    window.addEventListener('jelly-theme-change', this.onDirectionChange);

    this.render();
  }

  // Lifecycle method: Called automatically when the element leaves the DOM
  disconnectedCallback (): void {
    window.removeEventListener('jelly-theme-change', this.onDirectionChange);
  }

  // Lifecycle method: Fires when observed HTML attributes change dynamically
  attributeChangedCallback (name: string): void {
    if (name === 'size') {
      canonicalizeSize(this);
    }

    if (this.row) {
      this.render();
    }
  }

  // Total page count (at least one)
  get total (): number {
    return Math.max(1, parseInt(this.getAttribute('total') ?? '', 10) || 1);
  }

  // The current page, clamped into range
  get page (): number {
    return Math.min(this.total, Math.max(1, parseInt(this.getAttribute('page') ?? '', 10) || 1));
  }

  set page (value: number) {
    this.setAttribute('page', String(value));
  }

  // The size passed to the child buttons (pagination defaults to small)
  get buttonSize (): string {
    return this.getAttribute('size') || 'small';
  }

  // The windowed page list: first, last, current ±1, with … in the gaps
  pagesToShow (): (number | '…')[] {
    const total = this.total;
    const cur   = this.page;
    const out: (number | '…')[] = [];
    const win   = 1;
    const pages = new Set<number>([1, total]);

    for (let p = cur - win; p <= cur + win; p++) {
      if (p >= 1 && p <= total) {
        pages.add(p);
      }
    }

    let previous: number | null = null;

    for (const p of [...pages].sort((a, b) => a - b)) {
      if (previous !== null && p - previous > 1) {
        out.push('…');
      }

      out.push(p);
      previous = p;
    }

    return out;
  }

  // Navigate to a page and announce the change
  go (page: number): void {
    if (page < 1 || page > this.total || page === this.page) {
      return;
    }

    this.page = page;

    emit(this, 'change', { page });
  }

  // Rebuild the row of page buttons for the current state
  render (): void {
    const cur = this.page;
    const rtl = isRTL(this);

    const makeButton = (label: string, page: number, { current = false, disabled = false, name = null }: PageButtonOptions = {}): HTMLElement => {
      const button = document.createElement('jelly-button');

      button.setAttribute('size', this.buttonSize);
      button.textContent = label;

      if (current) {
        button.setAttribute('aria-current', 'page');
      }

      if (disabled) {
        button.setAttribute('disabled', '');
      }

      if (name) {
        button.setAttribute('label', name);
      }

      button.addEventListener('click', () => this.go(page));

      return button;
    };

    // The arrow glyphs point along the reading direction
    const prevGlyph = rtl ? '›' : '‹';
    const nextGlyph = rtl ? '‹' : '›';

    this.row.textContent = '';

    this.row.appendChild(makeButton(prevGlyph, cur - 1, { disabled: cur === 1, name: 'Previous page' }));

    for (const p of this.pagesToShow()) {
      if (p === '…') {
        const gap = document.createElement('span');

        gap.className   = 'gap';
        gap.textContent = '…';
        gap.setAttribute('aria-hidden', 'true');

        this.row.appendChild(gap);
      } else {
        this.row.appendChild(makeButton(String(p), p, { current: p === cur }));
      }
    }

    this.row.appendChild(makeButton(nextGlyph, cur + 1, { disabled: cur === this.total, name: 'Next page' }));
  }

  // Route programmatic host focus onto the current (or first enabled) page
  override focus (options?: FocusOptions): void {
    const current = this.shadowRoot!.querySelector('[aria-current]') as HTMLElement | null;
    const first   = [...this.shadowRoot!.querySelectorAll('jelly-button')].find((b) => !b.hasAttribute('disabled'));

    (current || first)?.focus(options);
  }

}

// Register the custom element
customElements.define('jelly-pagination', JellyPagination);

declare global {
  interface HTMLElementTagNameMap {
    'jelly-pagination': JellyPagination;
  }
}

import { expect, test } from 'vitest';

import { mount, raf } from '../../testing/index.js';

import './index.js';
import type { JellyPagination } from './index.js';

test('renders a windowed page list with a current page', async () => {
  const host = mount('<jelly-pagination total="12" page="3"></jelly-pagination>');
  const el = host.querySelector('jelly-pagination') as JellyPagination;
  await raf();

  expect(el.page).toBe(3);
  const current = el.shadowRoot!.querySelector('jelly-button[aria-current]');
  expect(current?.textContent).toBe('3');

  host.remove();
});

test('clicking a page button navigates and fires change', async () => {
  const host = mount('<jelly-pagination total="5" page="1"></jelly-pagination>');
  const el = host.querySelector('jelly-pagination') as JellyPagination;
  await raf();

  let detailPage = 0;
  el.addEventListener('change', (event) => { detailPage = (event as CustomEvent).detail.page; });

  const buttons = [...el.shadowRoot!.querySelectorAll('jelly-button')];
  const pageTwo = buttons.find((b) => b.textContent === '2')!;
  pageTwo.dispatchEvent(new MouseEvent('click', { bubbles: true }));

  expect(el.page).toBe(2);
  expect(detailPage).toBe(2);

  host.remove();
});

test('moving from page 1 to 6 does not duplicate page numbers', async () => {
  const host = mount('<jelly-pagination total="12" page="1"></jelly-pagination>');
  const el = host.querySelector('jelly-pagination') as JellyPagination;
  await raf();

  for (let i = 0; i < 5; i++) {
    const next = [...el.shadowRoot!.querySelectorAll('jelly-button')].find((button) => button.getAttribute('label') === 'Next page');

    next?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await raf();
  }

  expect(el.page).toBe(6);

  const labels = [...el.shadowRoot!.querySelectorAll('jelly-button')].map((button) => button.textContent?.trim() ?? '');
  const pages  = labels.filter((label) => /^\d+$/.test(label));

  expect(pages.filter((label) => label === '5')).toHaveLength(1);
  expect(new Set(pages).size).toBe(pages.length);

  host.remove();
});

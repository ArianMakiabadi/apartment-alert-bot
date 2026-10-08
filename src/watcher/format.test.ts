import assert from 'node:assert/strict';
import { test } from 'node:test';

import { escapeHtml, formatDiff, formatInitial } from './format.js';
import type { Listing } from './types.js';

const listing = (id: number, overrides: Partial<Listing> = {}): Listing => ({
  id,
  titel: `Stellplatz ${id}`,
  strasse: 'Wolkausweg',
  hausnummer: '17 a',
  plz: '22337',
  ort: 'Hamburg',
  searchRegion: 'Ohlsdorf',
  category: 'Tiefgarage',
  monatlGesamtkosten: '90,44',
  nutzflaeche: 12,
  ...overrides,
});

const LINK =
  '<a href="https://hpm2.immosolve.eu/immosolve_presentation/pub/modern/2223228/stellplaetze/immo.jsp?newSearch=true">Open the dhu Stellplatz listings</a>';

test('escapeHtml escapes the characters Telegram HTML treats as markup', () => {
  assert.equal(escapeHtml(`<b>A & "B"</b>`), '&lt;b&gt;A &amp; &quot;B&quot;&lt;/b&gt;');
});

test('the initial message lists every listing and ends with the page link', () => {
  assert.equal(
    formatInitial([listing(1), listing(2, { nutzflaeche: 12.5 })]),
    [
      '👀 Watcher started — 2 Stellplatz listings currently listed',
      '<b>Stellplatz 1</b>\nWolkausweg 17 a, 22337 Hamburg\nTiefgarage · 12 m² · 90,44 €/month',
      '<b>Stellplatz 2</b>\nWolkausweg 17 a, 22337 Hamburg\nTiefgarage · 12,5 m² · 90,44 €/month',
      LINK,
    ].join('\n\n'),
  );
});

test('the initial message works without listings', () => {
  assert.equal(
    formatInitial([]),
    `👀 Watcher started — 0 Stellplatz listings currently listed\n\n${LINK}`,
  );
});

test('an empty diff formats to an empty string', () => {
  assert.equal(formatDiff({ added: [], removed: [], changed: [] }), '');
});

test('sections without entries are omitted', () => {
  const message = formatDiff({ added: [listing(1)], removed: [], changed: [] });

  assert.equal(
    message,
    [
      '<b>🆕 New (1)</b>',
      '<b>Stellplatz 1</b>\nWolkausweg 17 a, 22337 Hamburg\nTiefgarage · 12 m² · 90,44 €/month',
      LINK,
    ].join('\n\n'),
  );
  assert.ok(!message.includes('Removed'));
  assert.ok(!message.includes('Changed'));
});

test('all three sections appear in the order new, removed, changed', () => {
  const message = formatDiff({
    added: [listing(1)],
    removed: [listing(2)],
    changed: [
      {
        before: listing(3),
        after: listing(3, { monatlGesamtkosten: '95,00', nutzflaeche: null, category: '' }),
        fields: ['monatlGesamtkosten', 'category', 'nutzflaeche'],
      },
    ],
  });

  const positions = ['🆕 New (1)', '❌ Removed (1)', '✏️ Changed (1)'].map((heading) =>
    message.indexOf(heading),
  );
  assert.ok(positions.every((position) => position !== -1));
  assert.deepEqual(
    positions,
    [...positions].sort((a, b) => a - b),
  );
  assert.ok(
    message.includes(
      [
        '<b>Stellplatz 3</b>',
        'Wolkausweg 17 a, 22337 Hamburg',
        'Price: 90,44 € → 95,00 €',
        'Category: Tiefgarage → –',
        'Area: 12 m² → –',
      ].join('\n'),
    ),
  );
  assert.ok(message.endsWith(LINK));
});

test('dynamic text is HTML-escaped', () => {
  const hostile = listing(1, {
    titel: 'Platz <b>A</b> & B',
    strasse: 'Weg <1>',
    category: 'Tief & garage',
  });

  const initial = formatInitial([hostile]);
  assert.ok(initial.includes('<b>Platz &lt;b&gt;A&lt;/b&gt; &amp; B</b>'));
  assert.ok(initial.includes('Weg &lt;1&gt; 17 a'));
  assert.ok(initial.includes('Tief &amp; garage'));

  const changed = formatDiff({
    added: [],
    removed: [],
    changed: [{ before: listing(1), after: hostile, fields: ['titel'] }],
  });
  assert.ok(changed.includes('Title: Stellplatz 1 → Platz &lt;b&gt;A&lt;/b&gt; &amp; B'));
});

test('a listing with missing details leaves out the empty parts', () => {
  const sparse = listing(1, {
    strasse: '',
    hausnummer: '',
    category: '',
    monatlGesamtkosten: '',
    nutzflaeche: null,
  });

  assert.equal(
    formatDiff({ added: [], removed: [sparse], changed: [] }),
    ['<b>❌ Removed (1)</b>', '<b>Stellplatz 1</b>\n22337 Hamburg', LINK].join('\n\n'),
  );
});

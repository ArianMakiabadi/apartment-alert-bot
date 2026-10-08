import assert from 'node:assert/strict';
import { test } from 'node:test';

import { diff, isEmptyDiff } from './diff.js';
import { toListingRecord } from './state.js';
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

test('unchanged listings give an empty diff', () => {
  const result = diff(toListingRecord([listing(1), listing(2)]), [listing(2), listing(1)]);

  assert.deepEqual(result, { added: [], removed: [], changed: [] });
  assert.equal(isEmptyDiff(result), true);
});

test('nothing before and nothing now is an empty diff', () => {
  assert.equal(isEmptyDiff(diff({}, [])), true);
});

test('a listing with an unknown id is added', () => {
  const result = diff(toListingRecord([listing(1)]), [listing(1), listing(2)]);

  assert.deepEqual(result, { added: [listing(2)], removed: [], changed: [] });
  assert.equal(isEmptyDiff(result), false);
});

test('a listing that is no longer present is removed', () => {
  const result = diff(toListingRecord([listing(1), listing(2)]), [listing(2)]);

  assert.deepEqual(result, { added: [], removed: [listing(1)], changed: [] });
});

test('all listings disappearing removes each of them', () => {
  const result = diff(toListingRecord([listing(1), listing(2)]), []);

  assert.deepEqual(result.removed, [listing(1), listing(2)]);
});

test('a changed listing names the fields that differ', () => {
  const before = listing(1);
  const after = listing(1, { monatlGesamtkosten: '95,00', nutzflaeche: null });

  const result = diff(toListingRecord([before]), [after]);

  assert.deepEqual(result, {
    added: [],
    removed: [],
    changed: [{ before, after, fields: ['monatlGesamtkosten', 'nutzflaeche'] }],
  });
});

test('a change of searchRegion alone is not reported', () => {
  const result = diff(toListingRecord([listing(1)]), [listing(1, { searchRegion: 'Alsterdorf' })]);

  assert.equal(isEmptyDiff(result), true);
});

test('added, removed and changed are reported together', () => {
  const result = diff(toListingRecord([listing(1), listing(2)]), [
    listing(2, { titel: 'Neu' }),
    listing(3),
  ]);

  assert.deepEqual(result.added, [listing(3)]);
  assert.deepEqual(result.removed, [listing(1)]);
  assert.deepEqual(
    result.changed.map(({ after, fields }) => [after.id, fields]),
    [[2, ['titel']]],
  );
});

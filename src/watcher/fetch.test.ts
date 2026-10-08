import assert from 'node:assert/strict';
import { test } from 'node:test';

import { buildRequestBody, fetchListings } from './fetch.js';
import type { ParsedReply } from './parse.js';
import type { Listing } from './types.js';

const listing = (id: number): Listing => ({
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
});

// Serves the given pages and records which page numbers were requested.
const pages = (totalObjects: number, ...ids: number[][]) => {
  const requested: number[] = [];
  const getPage = (page: number): Promise<ParsedReply> => {
    requested.push(page);
    return Promise.resolve({
      listings: (ids[page - 1] ?? []).map(listing),
      totalObjects,
      totalPages: ids.length,
      currentPage: page,
    });
  };
  return { getPage, requested };
};

test('request body substitutes only the page number', () => {
  const first = buildRequestBody(1).split('\n');
  const third = buildRequestBody(3).split('\n');

  assert.equal(first.length, 41);
  assert.equal(first.at(-1), '');
  assert.equal(first.at(-2), 'batchId=0');
  assert.equal(first[11], 'c0-e5=number:1');
  assert.equal(third[11], 'c0-e5=number:3');
  assert.deepEqual(
    first.filter((_, index) => index !== 11),
    third.filter((_, index) => index !== 11),
  );
});

test('request body rejects an invalid page number', () => {
  assert.throws(() => buildRequestBody(0), /Invalid listings page number/);
  assert.throws(() => buildRequestBody(1.5), /Invalid listings page number/);
});

test('a single page needs one request', async () => {
  const { getPage, requested } = pages(1, [7]);

  assert.deepEqual(await fetchListings(getPage), [listing(7)]);
  assert.deepEqual(requested, [1]);
});

test('no listings is a valid result', async () => {
  const { getPage, requested } = pages(0, []);

  assert.deepEqual(await fetchListings(getPage), []);
  assert.deepEqual(requested, [1]);
});

test('further pages are fetched and concatenated in order', async () => {
  const { getPage, requested } = pages(5, [1, 2], [3, 4], [5]);

  const listings = await fetchListings(getPage);

  assert.deepEqual(
    listings.map(({ id }) => id),
    [1, 2, 3, 4, 5],
  );
  assert.deepEqual(requested, [1, 2, 3]);
});

test('a count that differs from totalObjects is an error', async () => {
  const { getPage } = pages(5, [1, 2], [3]);

  await assert.rejects(fetchListings(getPage), /Fetched 3 listings but Immosolve reports 5/);
});

test('an implausible page count is refused before any further request', async () => {
  const { getPage, requested } = pages(900, ...Array.from({ length: 11 }, () => [1]));

  await assert.rejects(fetchListings(getPage), /refusing more than 10/);
  assert.deepEqual(requested, [1]);
});

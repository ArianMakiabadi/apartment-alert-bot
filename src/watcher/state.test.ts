import assert from 'node:assert/strict';
import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test, type TestContext } from 'node:test';

import { loadState, saveState, toListingRecord, type State } from './state.js';
import type { Listing } from './types.js';

const listing: Listing = {
  id: 2371631,
  titel: 'Tiefgaragen-Stellplatz zur Anmietung!',
  strasse: 'Wolkausweg',
  hausnummer: '17 a',
  plz: '22337',
  ort: 'Hamburg',
  searchRegion: 'Ohlsdorf',
  category: 'Tiefgarage',
  monatlGesamtkosten: '90,44',
  nutzflaeche: 12,
};

// A fresh temporary directory, removed when the test ends.
const temporaryDirectory = async (t: TestContext): Promise<string> => {
  const directory = await mkdtemp(join(tmpdir(), 'dhu-watch-state-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  return directory;
};

test('toListingRecord keys listings by id', () => {
  assert.deepEqual(toListingRecord([listing]), { '2371631': listing });
});

test('a missing state file is a first run', async (t) => {
  const directory = await temporaryDirectory(t);

  assert.equal(await loadState(join(directory, 'state.json')), null);
});

test('saved state loads back unchanged, creating the directory', async (t) => {
  const directory = await temporaryDirectory(t);
  const file = join(directory, 'nested', 'data', 'state.json');
  const state: State = { listings: toListingRecord([listing]), lastError: 'boom' };

  await saveState(file, state);

  assert.deepEqual(await loadState(file), state);
  assert.deepEqual(await readdir(join(directory, 'nested', 'data')), ['state.json']);
});

test('saving replaces the previous state', async (t) => {
  const directory = await temporaryDirectory(t);
  const file = join(directory, 'state.json');

  await saveState(file, { listings: toListingRecord([listing]) });
  await saveState(file, { listings: {} });

  assert.deepEqual(await loadState(file), { listings: {} });
  assert.equal(await readFile(file, 'utf8'), '{\n  "listings": {}\n}\n');
});

test('a damaged state file is an error, not a first run', async (t) => {
  const directory = await temporaryDirectory(t);
  const file = join(directory, 'state.json');

  await writeFile(file, '{"listings":', 'utf8');
  await assert.rejects(loadState(file), /is not valid JSON/);

  await writeFile(file, '{"listings":[]}', 'utf8');
  await assert.rejects(loadState(file), /does not have the expected shape/);

  await writeFile(file, '{"listings":{"1":{"titel":"no id"}}}', 'utf8');
  await assert.rejects(loadState(file), /does not have the expected shape/);
});

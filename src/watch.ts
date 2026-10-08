import { config } from './config.js';
import { diff, isEmptyDiff } from './watcher/diff.js';
import { fetchListings } from './watcher/fetch.js';
import { formatDiff, formatInitial } from './watcher/format.js';
import { loadState, saveState, toListingRecord } from './watcher/state.js';

const DRY_RUN_FLAG = '--dry-run';

async function run(dryRun: boolean): Promise<void> {
  // State first: a damaged state file fails the run before any request is made.
  const state = await loadState(config.stateFile);
  const listings = await fetchListings();

  if (state === null) {
    console.log(formatInitial(listings));
  } else {
    const changes = diff(state.listings, listings);
    if (!isEmptyDiff(changes)) {
      console.log(formatDiff(changes));
    }
  }

  if (!dryRun) {
    await saveState(config.stateFile, { listings: toListingRecord(listings) });
  }
}

try {
  const args = process.argv.slice(2);
  const unknown = args.filter((arg) => arg !== DRY_RUN_FLAG);
  if (unknown.length > 0) {
    throw new Error(`unknown argument ${unknown.join(' ')} (only ${DRY_RUN_FLAG} is supported)`);
  }
  await run(args.includes(DRY_RUN_FLAG));
} catch (error) {
  console.error(`Watcher failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}

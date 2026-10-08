import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

import type { Listing } from './types.js';

export interface State {
  /** The listings seen by the last successful run, keyed by listing id. */
  listings: Record<string, Listing>;
  /** Set while the watcher is failing, so the failure is only reported once. */
  lastError?: string;
}

export function toListingRecord(listings: Listing[]): Record<string, Listing> {
  return Object.fromEntries(listings.map((listing) => [String(listing.id), listing]));
}

/**
 * Reads the state file. A missing file is `null` (first run); an unreadable or malformed one
 * throws, so a damaged state is never mistaken for a first run.
 */
export async function loadState(file: string): Promise<State | null> {
  let text: string;
  try {
    text = await readFile(file, 'utf8');
  } catch (error) {
    if (isNodeError(error) && error.code === 'ENOENT') return null;
    throw error;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(`State file ${file} is not valid JSON`);
  }
  if (!isState(parsed)) {
    throw new Error(`State file ${file} does not have the expected shape`);
  }
  return parsed;
}

/** Writes the state file atomically: a `.tmp` file next to it, then a rename over it. */
export async function saveState(file: string, state: State): Promise<void> {
  await mkdir(dirname(file), { recursive: true });
  const temporary = `${file}.tmp`;
  await writeFile(temporary, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
  await rename(temporary, file);
}

function isState(value: unknown): value is State {
  if (!isRecord(value) || !isRecord(value.listings)) return false;
  if (value.lastError !== undefined && typeof value.lastError !== 'string') return false;
  return Object.values(value.listings).every(
    (listing) => isRecord(listing) && typeof listing.id === 'number',
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error;
}

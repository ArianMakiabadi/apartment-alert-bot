import type { Listing } from './types.js';

/** The fields whose change is worth a notification. `searchRegion` is deliberately not one. */
export const COMPARED_FIELDS = [
  'monatlGesamtkosten',
  'titel',
  'strasse',
  'hausnummer',
  'plz',
  'ort',
  'category',
  'nutzflaeche',
] as const satisfies readonly (keyof Listing)[];

export type ComparedField = (typeof COMPARED_FIELDS)[number];

export interface ListingChange {
  before: Listing;
  after: Listing;
  fields: ComparedField[];
}

export interface ListingDiff {
  added: Listing[];
  removed: Listing[];
  changed: ListingChange[];
}

/** Compares the listings of the previous run (keyed by id) with the current ones. Pure. */
export function diff(prev: Record<string, Listing>, current: Listing[]): ListingDiff {
  const added: Listing[] = [];
  const changed: ListingChange[] = [];
  const currentIds = new Set<string>();

  for (const after of current) {
    const key = String(after.id);
    currentIds.add(key);
    const before = prev[key];
    if (before === undefined) {
      added.push(after);
      continue;
    }
    const fields = COMPARED_FIELDS.filter((field) => before[field] !== after[field]);
    if (fields.length > 0) {
      changed.push({ before, after, fields });
    }
  }

  const removed = Object.entries(prev)
    .filter(([key]) => !currentIds.has(key))
    .map(([, listing]) => listing);

  return { added, removed, changed };
}

export function isEmptyDiff({ added, removed, changed }: ListingDiff): boolean {
  return added.length === 0 && removed.length === 0 && changed.length === 0;
}

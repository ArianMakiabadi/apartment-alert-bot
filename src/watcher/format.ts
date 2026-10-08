import type { ComparedField, ListingChange, ListingDiff } from './diff.js';
import { LISTINGS_PAGE_URL } from './fetch.js';
import type { Listing } from './types.js';

// Messages are Telegram HTML (`parse_mode: 'HTML'`): every dynamic value goes through escapeHtml.

const FIELD_LABELS: Record<ComparedField, string> = {
  monatlGesamtkosten: 'Price',
  titel: 'Title',
  strasse: 'Street',
  hausnummer: 'House number',
  plz: 'Postcode',
  ort: 'City',
  category: 'Category',
  nutzflaeche: 'Area',
};

const NO_VALUE = '–';

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** The message for the very first run: everything that is currently listed. */
export function formatInitial(listings: Listing[]): string {
  const heading = `👀 Watcher started — ${count(listings.length)} currently listed`;
  return [heading, ...listings.map(formatListing), pageLink()].join('\n\n');
}

/** The message for a later run. Sections without entries are omitted; an empty diff is `''`. */
export function formatDiff({ added, removed, changed }: ListingDiff): string {
  const sections: string[] = [];
  if (added.length > 0) {
    sections.push(section(`🆕 New (${added.length})`, added.map(formatListing)));
  }
  if (removed.length > 0) {
    sections.push(section(`❌ Removed (${removed.length})`, removed.map(formatListing)));
  }
  if (changed.length > 0) {
    sections.push(section(`✏️ Changed (${changed.length})`, changed.map(formatChange)));
  }
  if (sections.length === 0) return '';
  return [...sections, pageLink()].join('\n\n');
}

function section(heading: string, entries: string[]): string {
  return [`<b>${heading}</b>`, ...entries].join('\n\n');
}

function formatListing(listing: Listing): string {
  const details = [
    listing.category,
    listing.nutzflaeche === null ? '' : fieldValue(listing, 'nutzflaeche'),
    listing.monatlGesamtkosten === '' ? '' : `${listing.monatlGesamtkosten} €/month`,
  ].filter((detail) => detail !== '');

  return [
    `<b>${escapeHtml(listing.titel)}</b>`,
    escapeHtml(address(listing)),
    escapeHtml(details.join(' · ')),
  ]
    .filter((line) => line !== '')
    .join('\n');
}

function formatChange({ before, after, fields }: ListingChange): string {
  const changes = fields.map(
    (field) =>
      `${FIELD_LABELS[field]}: ${escapeHtml(fieldValue(before, field))} → ${escapeHtml(fieldValue(after, field))}`,
  );
  return [`<b>${escapeHtml(after.titel)}</b>`, escapeHtml(address(after)), ...changes]
    .filter((line) => line !== '')
    .join('\n');
}

function fieldValue(listing: Listing, field: ComparedField): string {
  if (field === 'nutzflaeche') {
    const area = listing.nutzflaeche;
    return area === null ? NO_VALUE : `${String(area).replace('.', ',')} m²`;
  }
  const value = listing[field];
  if (value === '') return NO_VALUE;
  return field === 'monatlGesamtkosten' ? `${value} €` : value;
}

function address(listing: Listing): string {
  const street = `${listing.strasse} ${listing.hausnummer}`.trim();
  const city = `${listing.plz} ${listing.ort}`.trim();
  return [street, city].filter((part) => part !== '').join(', ');
}

function count(listings: number): string {
  return `${listings} Stellplatz ${listings === 1 ? 'listing' : 'listings'}`;
}

function pageLink(): string {
  return `<a href="${escapeHtml(LISTINGS_PAGE_URL)}">Open the dhu Stellplatz listings</a>`;
}

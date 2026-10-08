import { fetchListings, LISTINGS_PAGE_URL } from './watcher/fetch.js';
import type { Listing } from './watcher/types.js';

function describe(listing: Listing): string {
  const address = `${listing.strasse} ${listing.hausnummer}, ${listing.plz} ${listing.ort}`
    .replace(/\s+/g, ' ')
    .trim();
  const details = [
    listing.category,
    listing.nutzflaeche === null ? '' : `${listing.nutzflaeche} m²`,
    listing.monatlGesamtkosten === '' ? '' : `${listing.monatlGesamtkosten} €/month`,
  ].filter((detail) => detail !== '');

  return [`- ${listing.titel} (#${listing.id})`, `  ${address}`, `  ${details.join(' · ')}`].join(
    '\n',
  );
}

try {
  const listings = await fetchListings();
  console.log(`${listings.length} Stellplatz listing(s) at ${LISTINGS_PAGE_URL}`);
  for (const listing of listings) {
    console.log(`\n${describe(listing)}`);
  }
} catch (error) {
  console.error(`Watcher failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}

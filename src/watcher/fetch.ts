import { parseReply, type ParsedReply } from './parse.js';
import type { Listing } from './types.js';

/** The human-facing Stellplatz listings page, for links in messages. */
export const LISTINGS_PAGE_URL =
  'https://hpm2.immosolve.eu/immosolve_presentation/pub/modern/2223228/stellplaetze/immo.jsp?newSearch=true';

const ENDPOINT =
  'https://hpm2.immosolve.eu/immosolve2/dwr/call/plaincall/ImmoObjectDWRManager.getDisponibleObjects.dwr';
const TIMEOUT_MS = 30_000;
// Far above anything dhu lists (80 listings per page); stops a bogus totalPages from causing a request loop.
const MAX_PAGES = 10;

// The request body from automation.md, byte-for-byte. Only `c0-e5` (currentPage) varies.
const bodyLines = (page: number): string[] => [
  'callCount=1',
  'page=/immosolve_presentation/pub/modern/2223228/stellplaetze/immo.jsp?newSearch=true',
  'httpSessionId=',
  'scriptSessionId=',
  'c0-scriptName=ImmoObjectDWRManager',
  'c0-methodName=getDisponibleObjects',
  'c0-id=0',
  'c0-e1=string:893c67f69dddbeefe96b5946debbcb17',
  'c0-e2=string:b0445a6d416710027702c9fba19b8a7c',
  'c0-e3=null:null',
  'c0-e4=string:80',
  `c0-e5=number:${page}`,
  'c0-e6=string:immoObject.monatlGesamtkosten%20desc',
  'c0-e7=number:2',
  'c0-e9=number:13',
  'c0-e8=Array:[reference:c0-e9]',
  'c0-e10=string:0',
  'c0-e11=string:900000',
  'c0-e12=string:0',
  'c0-e13=string:10',
  'c0-e14=string:0',
  'c0-e15=string:250',
  'c0-e16=null:null',
  'c0-e17=null:null',
  'c0-e18=null:null',
  'c0-e19=null:null',
  'c0-e20=null:null',
  'c0-e21=Array:[]',
  'c0-e22=null:null',
  'c0-e23=null:null',
  'c0-e24=null:null',
  'c0-e25=null:null',
  'c0-e26=boolean:false',
  'c0-e27=boolean:false',
  'c0-e28=boolean:false',
  'c0-e29=Array:[]',
  'c0-e30=null:null',
  'c0-e31=null:null',
  'c0-param0=Object_LoginParameters:{presentationId:reference:c0-e1, mandatorId:reference:c0-e2, userCode:reference:c0-e3, elementsPerPage:reference:c0-e4, currentPage:reference:c0-e5, orderBy:reference:c0-e6, objectIdentifier:reference:c0-e7, allowedObjectIdentifiers:reference:c0-e8, priceStart:reference:c0-e10, priceEnd:reference:c0-e11, roomsStart:reference:c0-e12, roomsEnd:reference:c0-e13, areaStart:reference:c0-e14, areaEnd:reference:c0-e15, chosenLocation:reference:c0-e16, radius:reference:c0-e17, city:reference:c0-e18, minimumLocation:reference:c0-e19, maximumLocation:reference:c0-e20, regions:reference:c0-e21, category:reference:c0-e22, personCount:reference:c0-e23, dateStart:reference:c0-e24, dateEnd:reference:c0-e25, calendarData:reference:c0-e26, parking:reference:c0-e27, wbs:reference:c0-e28, specialties:reference:c0-e29, objectId:reference:c0-e30, objectCode:reference:c0-e31}',
  'batchId=0',
];

export function buildRequestBody(page: number): string {
  if (!Number.isInteger(page) || page < 1) {
    throw new Error(`Invalid listings page number: ${page}`);
  }
  return `${bodyLines(page).join('\n')}\n`;
}

/** Fetches and parses one page of Stellplatz listings. Throws on a non-200 status or a bad reply. */
export async function fetchPage(page: number): Promise<ParsedReply> {
  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: buildRequestBody(page),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (response.status !== 200) {
    throw new Error(`Immosolve answered HTTP ${response.status} for listings page ${page}`);
  }
  return parseReply(await response.text());
}

/**
 * Fetches all Stellplatz listings, following pagination. Throws unless the number of listings
 * equals the `totalObjects` the server reported, so a partial result is never returned.
 */
export async function fetchListings(
  getPage: (page: number) => Promise<ParsedReply> = fetchPage,
): Promise<Listing[]> {
  const first = await getPage(1);
  if (first.totalPages > MAX_PAGES) {
    throw new Error(`Immosolve reports ${first.totalPages} pages; refusing more than ${MAX_PAGES}`);
  }

  const listings = [...first.listings];
  for (let page = 2; page <= first.totalPages; page++) {
    listings.push(...(await getPage(page)).listings);
  }

  if (listings.length !== first.totalObjects) {
    throw new Error(
      `Fetched ${listings.length} listings but Immosolve reports ${first.totalObjects}`,
    );
  }
  return listings;
}

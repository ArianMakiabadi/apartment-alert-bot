import type { Listing } from './types.js';

export interface ParsedReply {
  listings: Listing[];
  totalObjects: number;
  totalPages: number;
  currentPage: number;
}

type DwrObject = Map<string, DwrValue>;
// `undefined` stands for a value the parser does not understand (e.g. `new Date(...)`).
type DwrValue = string | number | boolean | null | undefined | DwrObject | DwrValue[];

const REPLY_MARKER = '//#DWR-REPLY';
const CALLBACK = 'dwr.engine._remoteHandleCallback(';

// `var sN=[];` / `var sN={};` declarations and `sN.key=value;` / `sN[i]=value;` assignments.
// String literals are matched as a whole because they may contain `;`.
const STATEMENT =
  /(?:var\s+(s\d+)\s*=\s*(\[\]|\{\})|(s\d+)(?:\.(\w+)|\[(\d+)\])\s*=\s*("(?:[^"\\]|\\.)*"|[^;]*))\s*;/g;
const CALLBACK_ARGS = /^\(\s*'[^']*'\s*,\s*'[^']*'\s*,\s*\{([^{}]*)\}\s*\)/;
const NUMBER = /^-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?$/;
const REFERENCE = /^s\d+$/;

type LabelField = Exclude<keyof Listing, 'id' | 'nutzflaeche'>;

/**
 * Parses the JavaScript text of an Immosolve DWR `getDisponibleObjects` reply.
 * The reply is read as text and never executed. Throws on anything unexpected, so a broken
 * reply is never mistaken for "no listings".
 */
export function parseReply(text: string): ParsedReply {
  if (!text.includes(REPLY_MARKER)) {
    throw new Error(`DWR reply marker "${REPLY_MARKER}" not found; reply starts: ${excerpt(text)}`);
  }
  const callbackAt = text.lastIndexOf(CALLBACK);
  if (callbackAt === -1) {
    const reason = text.includes('_remoteHandleException')
      ? 'the server returned a DWR exception'
      : 'callback line not found';
    throw new Error(`DWR reply has no ${CALLBACK}...): ${reason}; reply starts: ${excerpt(text)}`);
  }

  const table = buildTable(text.slice(0, callbackAt));
  const payload = parsePayload(text.slice(callbackAt + CALLBACK.length - 1));

  const totalObjects = payloadInteger(payload, 'totalObjects');
  const totalPages = payloadInteger(payload, 'totalPages');
  const currentPage = payloadInteger(payload, 'currentPage');

  const immoRef = payload.get('immoObjects');
  if (immoRef === undefined || !REFERENCE.test(immoRef)) {
    throw new Error(`DWR callback payload has no immoObjects reference (got ${String(immoRef)})`);
  }
  const immoObjects = table.get(immoRef);
  if (!Array.isArray(immoObjects)) {
    throw new Error(`DWR reply: immoObjects (${immoRef}) is not a declared array`);
  }

  const listings = Array.from(immoObjects, toListing);

  if (totalPages <= 1 && listings.length !== totalObjects) {
    throw new Error(
      `DWR reply: parsed ${listings.length} listings but totalObjects is ${totalObjects}`,
    );
  }

  return { listings, totalObjects, totalPages, currentPage };
}

function buildTable(script: string): Map<string, DwrObject | DwrValue[]> {
  const statements = [...script.matchAll(STATEMENT)];
  const table = new Map<string, DwrObject | DwrValue[]>();

  // Declarations first, so an assignment may reference a variable declared after it.
  for (const [, name, initialiser] of statements) {
    if (name !== undefined) {
      table.set(name, initialiser === '[]' ? [] : new Map());
    }
  }

  for (const [, , , target, key, index, rawValue] of statements) {
    if (target === undefined || rawValue === undefined) continue;
    const container = table.get(target);
    if (container === undefined) {
      throw new Error(`DWR reply assigns to undeclared variable ${target}`);
    }
    const value = parseValue(rawValue.trim(), table);
    if (Array.isArray(container) && index !== undefined) {
      container[Number(index)] = value;
    } else if (!Array.isArray(container) && key !== undefined) {
      container.set(key, value);
    } else {
      throw new Error(`DWR reply: assignment does not match the declared type of ${target}`);
    }
  }

  return table;
}

function parseValue(raw: string, table: Map<string, DwrObject | DwrValue[]>): DwrValue {
  if (raw.startsWith('"')) return decodeString(raw);
  if (raw === 'null') return null;
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  if (NUMBER.test(raw)) return Number(raw);
  if (REFERENCE.test(raw)) {
    const referenced = table.get(raw);
    if (referenced === undefined) {
      throw new Error(`DWR reply references undeclared variable ${raw}`);
    }
    return referenced;
  }
  return undefined;
}

function decodeString(literal: string): string {
  // DWR also escapes `'` as `\'`, which is valid JavaScript but not valid JSON.
  const json = literal.replace(/\\([\s\S])/g, (escape, char: string) =>
    char === "'" ? "'" : escape,
  );
  try {
    return JSON.parse(json) as string;
  } catch {
    throw new Error(`DWR reply contains an undecodable string literal: ${excerpt(literal)}`);
  }
}

function parsePayload(callbackArgs: string): Map<string, string> {
  const match = CALLBACK_ARGS.exec(callbackArgs);
  if (match?.[1] === undefined) {
    throw new Error(`DWR callback has an unexpected shape: ${excerpt(callbackArgs)}`);
  }
  const payload = new Map<string, string>();
  for (const pair of match[1].split(',')) {
    const colon = pair.indexOf(':');
    if (colon === -1) continue;
    payload.set(pair.slice(0, colon).trim(), pair.slice(colon + 1).trim());
  }
  return payload;
}

function payloadInteger(payload: Map<string, string>, key: string): number {
  const raw = payload.get(key);
  if (raw === undefined || !/^\d+$/.test(raw)) {
    throw new Error(`DWR callback payload: ${key} is not an integer (got ${String(raw)})`);
  }
  return Number(raw);
}

function toListing(value: DwrValue, index: number): Listing {
  if (!(value instanceof Map)) {
    throw new Error(`DWR reply: immoObjects[${index}] is not an object`);
  }
  const id = value.get('id');
  if (typeof id !== 'number' || !Number.isInteger(id)) {
    throw new Error(`DWR reply: immoObjects[${index}].id is not an integer (got ${String(id)})`);
  }
  const labels = value.get('labels');
  if (!(labels instanceof Map)) {
    throw new Error(`DWR reply: listing ${id} has no labels object`);
  }
  const nutzflaeche = value.get('nutzflaeche') ?? null;
  if (nutzflaeche !== null && typeof nutzflaeche !== 'number') {
    throw new Error(`DWR reply: listing ${id} has a non-numeric nutzflaeche`);
  }

  const label = (field: LabelField): string => {
    // An absent or null label is an empty string, like the empty labels Immosolve sends.
    const raw = labels.get(field) ?? '';
    if (typeof raw !== 'string') {
      throw new Error(`DWR reply: listing ${id} label "${field}" is not a string`);
    }
    return raw;
  };

  return {
    id,
    titel: label('titel'),
    strasse: label('strasse'),
    hausnummer: label('hausnummer'),
    plz: label('plz'),
    ort: label('ort'),
    searchRegion: label('searchRegion'),
    category: label('category'),
    monatlGesamtkosten: label('monatlGesamtkosten'),
    nutzflaeche,
  };
}

function excerpt(text: string): string {
  const flat = text.trim().replace(/\s+/g, ' ');
  return JSON.stringify(flat.length > 120 ? `${flat.slice(0, 120)}…` : flat);
}

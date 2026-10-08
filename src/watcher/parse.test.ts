import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { parseReply } from './parse.js';

const fixture = (name: string): string =>
  readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8');

const reply = (statements: string, payload: string): string =>
  `//#DWR-INSERT\n//#DWR-REPLY\n${statements}\ndwr.engine._remoteHandleCallback('0','0',{${payload}});\n`;

test('parses the captured single-listing reply', () => {
  assert.deepEqual(parseReply(fixture('single.txt')), {
    listings: [
      {
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
      },
    ],
    totalObjects: 1,
    totalPages: 1,
    currentPage: 1,
  });
});

test('follows references instead of assuming variable numbering', () => {
  const { listings, totalObjects } = parseReply(fixture('multi.txt'));

  assert.equal(totalObjects, 3);
  assert.deepEqual(
    listings.map((listing) => listing.id),
    [2400001, 2399107, 2371631],
  );
  assert.deepEqual(
    listings.map((listing) => listing.strasse),
    ['Fuhlsbüttler Straße', 'Käkenflur', 'Wolkausweg'],
  );
  assert.deepEqual(
    listings.map((listing) => listing.nutzflaeche),
    [12.5, null, 12],
  );
});

test('keeps semicolons inside string literals', () => {
  const [first] = parseReply(fixture('multi.txt')).listings;

  assert.equal(first?.titel, 'Stellplatz für PKW; sofort frei; s99.id=1;');
  assert.equal(first?.monatlGesamtkosten, '120,00');
});

test('decodes unicode, quote and backslash escapes', () => {
  const second = parseReply(fixture('multi.txt')).listings[1];

  assert.equal(second?.titel, 'Außenstellplatz "Am Park" - Mieter\'s Wahl \\ günstig');
  assert.equal(second?.category, 'Außenstellplatz');
  assert.equal(second?.searchRegion, 'Langenhorn');
});

test('parses a reply without listings', () => {
  assert.deepEqual(parseReply(fixture('empty.txt')), {
    listings: [],
    totalObjects: 0,
    totalPages: 0,
    currentPage: 1,
  });
});

test('tolerates whitespace around tokens', () => {
  const text = reply(
    'var s0 = [];\nvar s1 = {};\nvar s2 = {};\ns0[0] = s1;\ns1.id = 7;\ns1.labels = s2;\ns2.titel = "A; B";',
    ' totalPages: 1, totalObjects: 1, immoObjects: s0, currentPage: 1 ',
  );

  const { listings } = parseReply(text);

  assert.equal(listings[0]?.id, 7);
  assert.equal(listings[0]?.titel, 'A; B');
  assert.equal(listings[0]?.nutzflaeche, null);
});

test('ignores values it does not understand on unused fields', () => {
  const text = reply(
    'var s0=[];var s1={};var s2={};s0[0]=s1;s1.id=7;s1.created=new Date(1759912800000);s1.labels=s2;',
    'totalPages:1,totalObjects:1,immoObjects:s0,currentPage:1',
  );

  assert.equal(parseReply(text).listings[0]?.id, 7);
});

test('does not enforce the count on a multi-page reply', () => {
  const text = reply(
    'var s0=[];var s1={};var s2={};s0[0]=s1;s1.id=7;s1.labels=s2;',
    'totalPages:2,totalObjects:81,immoObjects:s0,currentPage:1',
  );

  const parsed = parseReply(text);

  assert.equal(parsed.listings.length, 1);
  assert.equal(parsed.totalObjects, 81);
  assert.equal(parsed.totalPages, 2);
});

test('rejects a reply without the DWR marker', () => {
  assert.throws(() => parseReply(fixture('garbage.txt')), /DWR reply marker/);
  assert.throws(() => parseReply(''), /DWR reply marker/);
});

test('rejects a reply without the callback line', () => {
  assert.throws(() => parseReply('//#DWR-INSERT\n//#DWR-REPLY\nvar s0=[];\n'), /callback line/);
});

test('reports a DWR exception reply', () => {
  const text =
    '//#DWR-REPLY\ndwr.engine._remoteHandleException(\'0\',\'0\',{javaClassName:"java.lang.Throwable",message:"Error"});\n';

  assert.throws(() => parseReply(text), /DWR exception/);
});

test('rejects a single-page reply whose count does not match totalObjects', () => {
  const text = reply(
    'var s0=[];var s1={};var s2={};s0[0]=s1;s1.id=7;s1.labels=s2;',
    'totalPages:1,totalObjects:2,immoObjects:s0,currentPage:1',
  );

  assert.throws(() => parseReply(text), /parsed 1 listings but totalObjects is 2/);
});

test('rejects dangling references', () => {
  const undeclaredArray = reply('', 'totalPages:1,totalObjects:0,immoObjects:s5,currentPage:1');
  const undeclaredLabels = reply(
    'var s0=[];var s1={};s0[0]=s1;s1.id=7;s1.labels=s9;',
    'totalPages:1,totalObjects:1,immoObjects:s0,currentPage:1',
  );

  assert.throws(() => parseReply(undeclaredArray), /not a declared array/);
  assert.throws(() => parseReply(undeclaredLabels), /undeclared variable s9/);
});

test('rejects a listing without a numeric id or labels', () => {
  const noId = reply(
    'var s0=[];var s1={};var s2={};s0[0]=s1;s1.labels=s2;',
    'totalPages:1,totalObjects:1,immoObjects:s0,currentPage:1',
  );
  const noLabels = reply(
    'var s0=[];var s1={};s0[0]=s1;s1.id=7;s1.labels=null;',
    'totalPages:1,totalObjects:1,immoObjects:s0,currentPage:1',
  );

  assert.throws(() => parseReply(noId), /id is not an integer/);
  assert.throws(() => parseReply(noLabels), /no labels object/);
});

test('rejects a callback payload without the counters', () => {
  const text = reply('var s0=[];', 'immoObjects:s0');

  assert.throws(() => parseReply(text), /totalObjects is not an integer/);
});

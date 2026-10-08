export interface Listing {
  /** Stable Immosolve listing id; the diff key. */
  id: number;
  titel: string;
  strasse: string;
  hausnummer: string;
  plz: string;
  ort: string;
  searchRegion: string;
  category: string;
  /** Monthly total cost as sent by Immosolve: a string with a German decimal comma, e.g. `90,44`. */
  monatlGesamtkosten: string;
  /** Area in m². */
  nutzflaeche: number | null;
}

/** One effect a setting has, e.g. `{ aspect: 'File size', effect: 'Bigger' }`. */
export interface DocsImpact {
  aspect: string;
  effect: string;
}

/** A documented term or topic. `id` is its anchor on the docs page (`/docs#dithering`). */
export interface DocsEntry {
  id: string;
  title: string;
  /** Extra words people might search for that don't appear in the text. Never shown. */
  keywords?: readonly string[];
  /** One plain sentence: what it is. */
  summary: string;
  body: readonly string[];
  /** Exact values, shown as a fact grid. */
  facts?: readonly DocsImpact[];
  /** What changing it does to the GIF. */
  impact?: readonly DocsImpact[];
  tip?: string;
  /** Ids of other entries worth reading next. */
  related?: readonly string[];
}

export interface DocsSection {
  id: string;
  title: string;
  intro: string;
  entries: readonly DocsEntry[];
}

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export type CaseKind = 'benign' | 'adverse' | 'not-assessed';

export interface ExpectedCase {
  id: string;
  surface: string;
  kind: CaseKind;
  title: string;
  locator?: string;
  expected: Record<string, unknown>;
  rationale?: string;
  note?: string;
  cannot_assess_reason?: string;
  cannot_assess_pinned?: boolean;
}

export interface Corpus {
  corpus_version: string;
  profile_version: string;
  author: string;
  reviewer: string;
  candidate_url: string;
  statement: string;
  screens: string[];
  provenance_vocabulary: string[];
  cases: ExpectedCase[];
}

export const corpus: Corpus = JSON.parse(
  readFileSync(resolve(__dirname, '..', 'expectations', 'expected-v1.json'), 'utf8'),
) as Corpus;

/** Look a case up by its pinned id. Fails loudly if the corpus and the specs drift apart. */
export function expectation(id: string): ExpectedCase {
  const found = corpus.cases.find((c) => c.id === id);
  if (!found) throw new Error(`Expectation ${id} is not in corpus ${corpus.corpus_version}`);
  return found;
}

/** Read a typed field out of a pinned case; no spec is allowed to invent its own number. */
export function field<T>(id: string, key: string): T {
  const e = expectation(id).expected as Record<string, unknown>;
  if (!(key in e)) throw new Error(`Expectation ${id} has no pinned field "${key}"`);
  return e[key] as T;
}

export const SCREENS = corpus.screens;

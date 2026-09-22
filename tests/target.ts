/** The single place the candidate under test is named. */
export const TARGET =
  process.env.TARGET_URL ?? 'https://s4u-methodology.pages.dev/demo/delivery-flow.html';

/** True when this run is pointed at the local adverse (mutated) copy. */
export const IS_MUTATED = process.env.CANDIDATE_KIND === 'mutation';

/** What the UI cares about. Everything else from the API is filtered out. */
export type TranscriptEvent =
  | { type: "ready" }
  | { type: "interim"; text: string }
  | { type: "final"; text: string; language: string }
  | { type: "error"; message: string };

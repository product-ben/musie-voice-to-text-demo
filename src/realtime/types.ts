/** What the UI cares about. Everything else from the API is filtered out. */
export type TranscriptEvent =
  | { type: "ready" }
  /** OpenAI's own VAD started or stopped hearing speech. */
  | { type: "speech"; active: boolean }
  | { type: "interim"; text: string }
  | { type: "final"; text: string; language: string }
  /** One sentence failed, but the session is still usable — keep recording. */
  | { type: "warning"; message: string }
  /** The session cannot continue — stop recording. */
  | { type: "error"; message: string };

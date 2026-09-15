/**
 * Every tunable value lives here. Change these, not the code below.
 */

/** Transcription sessions use the `intent=transcription` endpoint. */
export const REALTIME_URL = "wss://api.openai.com/v1/realtime?intent=transcription";

/**
 * The two transcription models differ in *when* text arrives, not just quality.
 * Measured against the live API on 15 Sep 2026 with the same 10 s of German:
 *
 *   gpt-4o-transcribe    deltas only after the turn is committed, so the whole
 *                        sentence lands ~0.3 s after you stop talking.
 *                        Supports server-side VAD. $0.006/min.
 *
 *   gpt-live-transcribe  deltas stream ~0.5-1 s behind your voice, while you
 *                        are still speaking. Rejects turn detection entirely,
 *                        so sentence breaks must be decided in the browser.
 *                        $0.017/min.
 */
export type TranscriptionModel = "gpt-4o-transcribe" | "gpt-live-transcribe";

export const MODEL_OPTIONS: { value: TranscriptionModel; label: string }[] = [
  { value: "gpt-4o-transcribe", label: "After each pause" },
  { value: "gpt-live-transcribe", label: "Live while speaking" },
];

export const DEFAULT_MODEL: TranscriptionModel = "gpt-4o-transcribe";

/** Latency/accuracy trade-off, gpt-live-transcribe only. */
export const LIVE_DELAY = "low";

/**
 * gpt-live-transcribe has no server VAD, so the browser decides where a
 * sentence ends: this much silence after speech commits the turn.
 */
export const CLIENT_SILENCE_MS = 800;

/** Chunk loudness below which the browser counts audio as silence. */
export const CLIENT_SILENCE_LEVEL = 0.02;

/**
 * ── THE DIAL YOU WILL ACTUALLY TURN ──
 * How much silence (ms) ends a sentence. Lower = sentences commit sooner but
 * split mid-thought; higher = fewer, longer sentences. 500 is a good start.
 */
export const SILENCE_DURATION_MS = 500;

/** How loud audio must be to count as speech (0–1). Raise it in a noisy room. */
export const VAD_THRESHOLD = 0.5;

/** Audio (ms) kept from just before speech was detected, so words aren't clipped. */
export const PREFIX_PADDING_MS = 300;

/** Recording auto-stops after this many seconds. */
export const SESSION_SECONDS = 60;

/** The Realtime API expects mono 16-bit PCM at this rate. */
export const SAMPLE_RATE = 24000;

export type LanguageChoice = "de" | "en" | "auto";

/**
 * How the transcript is cut into the units passed to onSentenceFinal.
 *
 *  silence     — server VAD: a pause of SILENCE_DURATION_MS ends a sentence.
 *  semantic    — semantic VAD: the model decides you have finished a thought.
 *  punctuation — semantic VAD for the audio, then the text is split on . ? !
 *                so one long turn can still yield several sentences. Free:
 *                splitting text costs no extra API requests.
 */
export type SegmentationMode = "silence" | "semantic" | "punctuation";

/**
 * How long semantic VAD waits before deciding you are done. "low" lets people
 * take their time — hesitant speech ("mir geht es... ja, ganz okay") stays in
 * one piece instead of being chopped at the pause.
 */
export const SEMANTIC_EAGERNESS = "low";

export const SEGMENTATION_OPTIONS: { value: SegmentationMode; label: string }[] = [
  { value: "silence", label: "Silence" },
  { value: "semantic", label: "Semantic" },
  { value: "punctuation", label: "Semantic + punctuation" },
];

export const LANGUAGE_OPTIONS: { value: LanguageChoice; label: string }[] = [
  { value: "de", label: "Deutsch" },
  { value: "en", label: "English" },
  { value: "auto", label: "Auto-detect" },
];

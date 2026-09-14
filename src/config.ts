/**
 * Every tunable value lives here. Change these, not the code below.
 */

/** Transcription sessions use the `intent=transcription` endpoint. */
export const REALTIME_URL = "wss://api.openai.com/v1/realtime?intent=transcription";

/**
 * Verified working with server-side VAD on 14 Sep 2026.
 * `gpt-live-transcribe` is the newer model but rejects turn detection
 * ("Turn detection is not supported for this transcription model"),
 * which would mean detecting pauses in the browser instead. See README.
 */
export const MODEL = "gpt-4o-transcribe";

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

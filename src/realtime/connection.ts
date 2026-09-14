import {
  MODEL,
  PREFIX_PADDING_MS,
  REALTIME_URL,
  SAMPLE_RATE,
  SEMANTIC_EAGERNESS,
  SILENCE_DURATION_MS,
  VAD_THRESHOLD,
  type LanguageChoice,
  type SegmentationMode,
} from "../config";
import type { TranscriptEvent } from "./types";

export type RealtimeConnection = {
  sendAudio: (base64Audio: string) => void;
  close: () => void;
};

export function connectRealtime(
  apiKey: string,
  language: LanguageChoice,
  segmentation: SegmentationMode,
  onEvent: (event: TranscriptEvent) => void,
): RealtimeConnection {
  // A browser WebSocket cannot set an Authorization header, so the key travels
  // in the subprotocol list instead. Hence the name: anyone with the page can
  // read it. That is why the key is typed in per session and never committed.
  const socket = new WebSocket(REALTIME_URL, [
    "realtime",
    `openai-insecure-api-key.${apiKey}`,
  ]);

  // Transcript deltas arrive per audio item; collect them until that item completes.
  const partials = new Map<string, string>();
  let opened = false;
  let closedByUs = false;

  socket.addEventListener("open", () => {
    opened = true;
  });

  socket.addEventListener("message", (message) => {
    const event = JSON.parse(message.data as string);

    switch (event.type) {
      case "session.created":
        socket.send(JSON.stringify(buildSessionUpdate(language, segmentation)));
        break;

      case "session.updated":
        onEvent({ type: "ready" });
        break;

      // These drive the "hearing you" state: it is OpenAI's VAD talking,
      // not a guess made in the browser.
      case "input_audio_buffer.speech_started":
        onEvent({ type: "speech", active: true });
        break;

      case "input_audio_buffer.speech_stopped":
        onEvent({ type: "speech", active: false });
        break;

      case "conversation.item.input_audio_transcription.delta": {
        const text = (partials.get(event.item_id) ?? "") + (event.delta ?? "");
        partials.set(event.item_id, text);
        onEvent({ type: "interim", text });
        break;
      }

      case "conversation.item.input_audio_transcription.completed": {
        partials.delete(event.item_id);
        const text: string = (event.transcript ?? "").trim();
        if (text) {
          // Some models report a detected language; most echo back what we asked for.
          const detected = event.language ?? event.languages?.[0]?.code;
          onEvent({ type: "final", text, language: detected ?? language });
        }
        break;
      }

      // One sentence failed — usually a rate limit. The socket stays healthy,
      // so report it and carry on rather than ending the session.
      case "conversation.item.input_audio_transcription.failed":
        partials.delete(event.item_id);
        onEvent({
          type: "warning",
          message: friendlyFailure(event.error),
        });
        break;

      case "error": {
        const param: string = event.error?.param ?? "";
        // Name the cause when a turn-detection mode is rejected, so the
        // experiment page reports "this mode is unsupported" rather than
        // a generic failure.
        const message = param.includes("turn_detection")
          ? `The "${segmentation}" mode was rejected by OpenAI: ${event.error?.message} ` +
            `Switch to Silence to keep working.`
          : (event.error?.message ?? "OpenAI reported an error.");
        onEvent({ type: "error", message });
        break;
      }
    }
  });

  socket.addEventListener("error", () => {
    if (!closedByUs) {
      onEvent({ type: "error", message: "Connection to OpenAI failed." });
    }
  });

  socket.addEventListener("close", () => {
    if (closedByUs) return;
    onEvent({
      type: "error",
      message: opened
        ? "The connection to OpenAI closed unexpectedly."
        : // The browser hides the HTTP status, so a rejected handshake looks like this.
          "OpenAI rejected the connection. The API key is probably invalid, expired, or out of credits.",
    });
  });

  return {
    sendAudio(base64Audio) {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: "input_audio_buffer.append", audio: base64Audio }));
      }
    },
    close() {
      closedByUs = true;
      socket.close();
    },
  };
}

/**
 * Rate-limit messages are the one error users hit repeatedly, and OpenAI's
 * wording buries the cause, so name it plainly.
 */
function friendlyFailure(error: { code?: string; message?: string } | undefined): string {
  if (error?.code === "rate_limit_exceeded") {
    return (
      "Rate limit reached — this sentence was skipped. Each sentence is one request, " +
      "so free-tier accounts (3 per minute) run out quickly. Adding a payment method raises the limit."
    );
  }
  if (error?.code === "credit_balance_exhausted") {
    return "No credits remaining on the OpenAI account. Add credits to transcribe.";
  }
  return error?.message ?? "That sentence could not be transcribed.";
}

function buildSessionUpdate(language: LanguageChoice, segmentation: SegmentationMode) {
  return {
    type: "session.update",
    session: {
      type: "transcription",
      audio: {
        input: {
          format: { type: "audio/pcm", rate: SAMPLE_RATE },
          transcription: {
            model: MODEL,
            // Omitted entirely for auto-detect; sending null is rejected.
            ...(language === "auto" ? {} : { language }),
          },
          turn_detection: buildTurnDetection(segmentation),
        },
      },
    },
  };
}

/**
 * "silence" chunks on a pause of fixed length. "semantic" (and the
 * punctuation mode built on it) lets a classifier judge when the speaker has
 * actually finished a thought, so hesitation does not end a sentence.
 */
function buildTurnDetection(segmentation: SegmentationMode) {
  if (segmentation === "silence") {
    return {
      type: "server_vad",
      threshold: VAD_THRESHOLD,
      prefix_padding_ms: PREFIX_PADDING_MS,
      silence_duration_ms: SILENCE_DURATION_MS,
    };
  }
  return { type: "semantic_vad", eagerness: SEMANTIC_EAGERNESS };
}

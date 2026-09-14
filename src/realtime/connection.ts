import {
  MODEL,
  PREFIX_PADDING_MS,
  REALTIME_URL,
  SAMPLE_RATE,
  SILENCE_DURATION_MS,
  VAD_THRESHOLD,
  type LanguageChoice,
} from "../config";
import type { TranscriptEvent } from "./types";

export type RealtimeConnection = {
  sendAudio: (base64Audio: string) => void;
  close: () => void;
};

export function connectRealtime(
  apiKey: string,
  language: LanguageChoice,
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
        socket.send(JSON.stringify(buildSessionUpdate(language)));
        break;

      case "session.updated":
        onEvent({ type: "ready" });
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

      case "conversation.item.input_audio_transcription.failed":
        partials.delete(event.item_id);
        onEvent({
          type: "error",
          message: event.error?.message ?? "Transcription failed.",
        });
        break;

      case "error":
        onEvent({ type: "error", message: event.error?.message ?? "OpenAI reported an error." });
        break;
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

function buildSessionUpdate(language: LanguageChoice) {
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
          // Server-side VAD decides where each sentence ends.
          turn_detection: {
            type: "server_vad",
            threshold: VAD_THRESHOLD,
            prefix_padding_ms: PREFIX_PADDING_MS,
            silence_duration_ms: SILENCE_DURATION_MS,
          },
        },
      },
    },
  };
}

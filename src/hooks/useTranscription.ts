import { useCallback, useEffect, useRef, useState } from "react";
import { SESSION_SECONDS, type LanguageChoice, type SegmentationMode } from "../config";
import { segment } from "../segmentation";
import { MicrophoneError, startRecorder, type Recorder } from "../audio/recorder";
import { connectRealtime, type RealtimeConnection } from "../realtime/connection";
import { onSentenceFinal } from "../onSentenceFinal";

export type Status = "idle" | "connecting" | "recording";

export function useTranscription() {
  const [status, setStatus] = useState<Status>("idle");
  const [sentences, setSentences] = useState<string[]>([]);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  /** Loudness of the newest audio chunk (0–1), for the microphone meter. */
  const [level, setLevel] = useState(0);
  /** True while OpenAI's VAD is hearing speech. */
  const [speaking, setSpeaking] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(SESSION_SECONDS);

  const connection = useRef<RealtimeConnection | null>(null);
  const recorder = useRef<Recorder | null>(null);
  const countdown = useRef<number | null>(null);

  const stop = useCallback(() => {
    recorder.current?.stop();
    recorder.current = null;
    connection.current?.close();
    connection.current = null;
    if (countdown.current !== null) {
      clearInterval(countdown.current);
      countdown.current = null;
    }
    setInterim("");
    setLevel(0);
    setSpeaking(false);
    setStatus("idle");
  }, []);

  const start = useCallback(
    async (apiKey: string, language: LanguageChoice, segmentation: SegmentationMode = "silence") => {
      setError(null);
      setWarning(null);
      setLevel(0);
      setSpeaking(false);
      setSentences([]);
      setInterim("");
      setSecondsLeft(SESSION_SECONDS);
      setStatus("connecting");

      connection.current = connectRealtime(apiKey, language, segmentation, (event) => {
        switch (event.type) {
          case "ready":
            setStatus("recording");
            break;
          case "speech":
            setSpeaking(event.active);
            break;
          case "interim":
            setInterim(event.text);
            break;
          case "final": {
            setInterim("");
            // One turn can yield several sentences in punctuation mode.
            const parts = segment(event.text, segmentation);
            setSentences((previous) => [...previous, ...parts]);
            parts.forEach((part) => onSentenceFinal(part, event.language));
            break;
          }
          // Non-fatal: one sentence was lost, recording continues.
          case "warning":
            setWarning(event.message);
            break;
          case "error":
            setError(event.message);
            stop();
            break;
        }
      });

      try {
        const started = await startRecorder((chunk, chunkLevel) => {
          connection.current?.sendAudio(chunk);
          setLevel(chunkLevel);
        });
        recorder.current = started;
      } catch (micError) {
        setError(
          micError instanceof MicrophoneError ? micError.message : "Could not start recording.",
        );
        stop();
        return;
      }

      countdown.current = window.setInterval(() => {
        setSecondsLeft((remaining) => {
          if (remaining <= 1) {
            stop();
            return 0;
          }
          return remaining - 1;
        });
      }, 1000);
    },
    [stop],
  );

  // Close the socket if the tab is closed mid-session.
  useEffect(() => {
    const handleUnload = () => stop();
    window.addEventListener("beforeunload", handleUnload);
    return () => {
      window.removeEventListener("beforeunload", handleUnload);
      stop();
    };
  }, [stop]);

  return {
    status,
    sentences,
    interim,
    error,
    warning,
    level,
    speaking,
    secondsLeft,
    start,
    stop,
  };
}

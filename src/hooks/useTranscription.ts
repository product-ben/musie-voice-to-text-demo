import { useCallback, useEffect, useRef, useState } from "react";
import { SESSION_SECONDS, type LanguageChoice } from "../config";
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
    setStatus("idle");
  }, []);

  const start = useCallback(
    async (apiKey: string, language: LanguageChoice) => {
      setError(null);
      setWarning(null);
      setSentences([]);
      setInterim("");
      setSecondsLeft(SESSION_SECONDS);
      setStatus("connecting");

      connection.current = connectRealtime(apiKey, language, (event) => {
        switch (event.type) {
          case "ready":
            setStatus("recording");
            break;
          case "interim":
            setInterim(event.text);
            break;
          case "final":
            setInterim("");
            setSentences((previous) => [...previous, event.text]);
            onSentenceFinal(event.text, event.language);
            break;
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
        const started = await startRecorder((chunk) => connection.current?.sendAudio(chunk));
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

  return { status, sentences, interim, error, warning, secondsLeft, start, stop };
}

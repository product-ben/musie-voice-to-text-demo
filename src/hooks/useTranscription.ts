import { useCallback, useEffect, useRef, useState } from "react";
import { SESSION_SECONDS, type LanguageChoice, type SegmentationMode } from "../config";
import { segment } from "../segmentation";
import { MicrophoneError, startRecorder, type Recorder } from "../audio/recorder";
import { connectRealtime, type RealtimeConnection } from "../realtime/connection";
import { onSentenceFinal } from "../onSentenceFinal";

export type Status = "idle" | "connecting" | "recording";

/** Why the last session ended — so the UI never has to say "it just stopped". */
export type StopReason = "manual" | "timeout" | "error" | null;

export function useTranscription() {
  const [status, setStatus] = useState<Status>("idle");
  const [sentences, setSentences] = useState<string[]>([]);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [stopReason, setStopReason] = useState<StopReason>(null);
  /** Loudness of the newest audio chunk (0–1), for the microphone meter. */
  const [level, setLevel] = useState(0);
  /** True while OpenAI's VAD is hearing speech. */
  const [speaking, setSpeaking] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(SESSION_SECONDS);

  const connection = useRef<RealtimeConnection | null>(null);
  const recorder = useRef<Recorder | null>(null);
  /** Wall-clock end of the session, so reconnects don't reset the countdown. */
  const deadline = useRef(0);

  const stop = useCallback((reason: StopReason = "manual") => {
    recorder.current?.stop();
    recorder.current = null;
    connection.current?.close();
    connection.current = null;
    setInterim("");
    setLevel(0);
    setSpeaking(false);
    setStatus((previous) => {
      // Only record a reason if a session was actually running.
      if (previous !== "idle") setStopReason(reason);
      return "idle";
    });
  }, []);

  const start = useCallback(
    async (apiKey: string, language: LanguageChoice, segmentation: SegmentationMode = "silence") => {
      setError(null);
      setWarning(null);
      setStopReason(null);
      setLevel(0);
      setSpeaking(false);
      setSentences([]);
      setInterim("");
      setSecondsLeft(SESSION_SECONDS);
      deadline.current = Date.now() + SESSION_SECONDS * 1000;
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
            stop("error");
            break;
        }
      });

      try {
        recorder.current = await startRecorder((chunk, chunkLevel) => {
          connection.current?.sendAudio(chunk);
          setLevel(chunkLevel);
        });
      } catch (micError) {
        setError(
          micError instanceof MicrophoneError ? micError.message : "Could not start recording.",
        );
        stop("error");
      }
    },
    [stop],
  );

  // The countdown reads a fixed deadline, so stopping happens inside the timer
  // callback rather than as a side effect of rendering.
  useEffect(() => {
    if (status === "idle") return;
    const timer = window.setInterval(() => {
      const remaining = Math.max(0, Math.ceil((deadline.current - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (remaining === 0) {
        clearInterval(timer);
        stop("timeout");
      }
    }, 250);
    return () => clearInterval(timer);
  }, [status, stop]);

  // Close the socket if the tab is closed mid-session.
  useEffect(() => {
    const handleUnload = () => stop("manual");
    window.addEventListener("beforeunload", handleUnload);
    return () => {
      window.removeEventListener("beforeunload", handleUnload);
      stop("manual");
    };
  }, [stop]);

  return {
    status,
    sentences,
    interim,
    error,
    warning,
    stopReason,
    level,
    speaking,
    secondsLeft,
    start,
    stop,
  };
}

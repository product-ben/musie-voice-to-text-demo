import { useCallback, useEffect, useRef, useState } from "react";
import {
  CLIENT_SILENCE_LEVEL,
  CLIENT_SILENCE_MS,
  MODELS,
  SESSION_SECONDS,
  type LanguageChoice,
  type SegmentationMode,
  type TranscriptionModel,
} from "../config";
import { segment } from "../segmentation";
import { stripFillers } from "../transcript/fillers";
import { MicrophoneError, startRecorder, type Recorder } from "../audio/recorder";
import { connectRealtime, type RealtimeConnection } from "../realtime/connection";
import { onSentenceFinal } from "../onSentenceFinal";
import { useSentences } from "./useSentences";

export type Status = "idle" | "connecting" | "recording";

/** Why the last session ended — so the UI never has to say "it just stopped". */
export type StopReason = "manual" | "timeout" | "error" | null;

export function useTranscription() {
  const [status, setStatus] = useState<Status>("idle");
  const list = useSentences();
  const [interim, setInterim] = useState("");
  /**
   * True from the moment speech is heard until the statement lands, so the
   * grey box appears straight away. On a post-turn model there is otherwise
   * nothing on screen at all while you talk, which reads as a broken demo.
   */
  const [pending, setPending] = useState(false);
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
  /** Browser-side turn detection, used when the model has no server VAD. */
  const heardSpeech = useRef(false);
  const silentSince = useRef<number | null>(null);

  const stop = useCallback((reason: StopReason = "manual") => {
    recorder.current?.stop();
    recorder.current = null;
    connection.current?.close();
    connection.current = null;
    setInterim("");
    setPending(false);
    setLevel(0);
    setSpeaking(false);
    setStatus((previous) => {
      // Only record a reason if a session was actually running.
      if (previous !== "idle") setStopReason(reason);
      return "idle";
    });
  }, []);

  const start = useCallback(
    async (
      apiKey: string,
      model: TranscriptionModel,
      language: LanguageChoice,
      segmentation: SegmentationMode = "silence",
      options?: { keepExisting?: boolean; insertAtTop?: boolean },
    ) => {
      setError(null);
      setWarning(null);
      setStopReason(null);
      setLevel(0);
      setSpeaking(false);
      if (!options?.keepExisting) list.reset();
      list.beginSession();
      setInterim("");
      setPending(false);
      setSecondsLeft(SESSION_SECONDS);
      deadline.current = Date.now() + SESSION_SECONDS * 1000;
      heardSpeech.current = false;
      silentSince.current = null;
      setStatus("connecting");

      connection.current = connectRealtime(apiKey, model, language, segmentation, (event) => {
        switch (event.type) {
          case "ready":
            setStatus("recording");
            break;
          case "speech":
            setSpeaking(event.active);
            // Speech stopping does not clear it: the words are still coming.
            if (event.active) setPending(true);
            break;
          case "interim":
            setInterim(event.text);
            setPending(true);
            break;
          case "final": {
            setInterim("");
            setPending(false);
            // One turn can yield several sentences in punctuation mode.
            // Hesitation sounds are cleaned off as the statement becomes a
            // card; the live grey text still shows what was actually said.
            const parts = segment(event.text, segmentation)
              .map((part) => stripFillers(part, event.language))
              .filter(Boolean);
            if (parts.length === 0) break;
            if (options?.insertAtTop) list.appendToSession(parts, event.language);
            else list.append(parts, event.language);
            parts.forEach((part) => onSentenceFinal(part, event.language));
            break;
          }
          // Non-fatal: one sentence was lost, recording continues.
          case "warning":
            setWarning(event.message);
            // That turn will never arrive, so stop waiting for it.
            setInterim("");
            setPending(false);
            break;
          case "error":
            setError(event.message);
            stop("error");
            break;
        }
      });

      // A model without server VAD leaves the browser to decide where a
      // sentence ends and to commit the turn itself.
      const browserDecidesTurns = !MODELS[model].serverVad;

      try {
        recorder.current = await startRecorder((chunk, chunkLevel) => {
          connection.current?.sendAudio(chunk);
          setLevel(chunkLevel);
          if (!browserDecidesTurns) return;

          const loud = chunkLevel >= CLIENT_SILENCE_LEVEL;
          setSpeaking(loud);

          if (loud) {
            heardSpeech.current = true;
            silentSince.current = null;
            setPending(true);
            return;
          }
          if (!heardSpeech.current) return;

          const now = Date.now();
          silentSince.current ??= now;
          if (now - silentSince.current >= CLIENT_SILENCE_MS) {
            heardSpeech.current = false;
            silentSince.current = null;
            connection.current?.commit();
          }
        });
      } catch (micError) {
        setError(
          micError instanceof MicrophoneError ? micError.message : "Could not start recording.",
        );
        stop("error");
      }
    },
    [stop, list],
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
    sentences: list.sentences,
    sessionCount: list.sessionCount,
    editSentence: list.edit,
    combineSentences: list.combine,
    moveSentence: list.move,
    deleteSentence: list.remove,
    undoLabel: list.undoLabel,
    undo: list.undo,
    dismissUndo: list.dismissUndo,
    interim,
    pending,
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

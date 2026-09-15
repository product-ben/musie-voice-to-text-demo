import { useCallback, useEffect, useRef, useState } from "react";
import { MicrophoneError, startRecorder, type Recorder } from "../audio/recorder";

/** How long the check listens for. Long enough to say a few words. */
const TEST_SECONDS = 4;

/** Below this peak the microphone is open but effectively silent. */
const SILENCE_THRESHOLD = 0.02;

export type MicCheckOutcome = { ok: boolean; message: string };

const percent = (value: number) => `${Math.round(value * 100)}%`;

/**
 * Runs the real capture pipeline — getUserMedia, the AudioWorklet, PCM16
 * conversion — without opening a socket. So it answers "is my microphone
 * working?" on its own, without an API key and at no cost.
 */
export function useMicCheck() {
  const [running, setRunning] = useState(false);
  const [level, setLevel] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(TEST_SECONDS);
  const [outcome, setOutcome] = useState<MicCheckOutcome | null>(null);
  const recorder = useRef<Recorder | null>(null);

  const stop = useCallback(() => {
    recorder.current?.stop();
    recorder.current = null;
    setRunning(false);
    setLevel(0);
  }, []);

  const run = useCallback(async () => {
    setOutcome(null);
    setLevel(0);
    setSecondsLeft(TEST_SECONDS);
    setRunning(true);

    let peak = 0;
    let chunks = 0;

    try {
      recorder.current = await startRecorder((_audio, chunkLevel) => {
        chunks++;
        if (chunkLevel > peak) peak = chunkLevel;
        setLevel(chunkLevel);
      });
    } catch (error) {
      setOutcome({
        ok: false,
        message:
          error instanceof MicrophoneError ? error.message : "Could not open the microphone.",
      });
      setRunning(false);
      return;
    }

    const deadline = Date.now() + TEST_SECONDS * 1000;
    const timer = window.setInterval(() => {
      const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (remaining > 0) return;

      clearInterval(timer);
      stop();

      if (chunks === 0) {
        setOutcome({
          ok: false,
          message:
            "The microphone opened but no audio reached the browser. Try another input device.",
        });
      } else if (peak < SILENCE_THRESHOLD) {
        setOutcome({
          ok: false,
          message:
            `Silent: audio is flowing but peaked at only ${percent(peak)}. Check the microphone ` +
            `is not muted and is the input your browser is using.`,
        });
      } else {
        setOutcome({
          ok: true,
          message:
            `Microphone working — ${chunks} audio chunks in ${TEST_SECONDS}s, peak level ` +
            `${percent(peak)}. Recording will work.`,
        });
      }
    }, 200);
  }, [stop]);

  // Release the microphone if the page changes while a check is running.
  useEffect(() => stop, [stop]);

  return { running, level, secondsLeft, outcome, run };
}

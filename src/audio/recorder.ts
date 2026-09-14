import { SAMPLE_RATE } from "../config";

export type Recorder = { stop: () => void };

/** Thrown when the browser blocks the microphone, so the UI can explain why. */
export class MicrophoneError extends Error {}

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  // Chunked because String.fromCharCode(...) overflows the stack on big arrays.
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

/**
 * Opens the microphone and calls `onAudioChunk` every ~40 ms with base64 PCM16
 * and the loudness of that chunk (0–1), which the UI uses to animate the meter.
 */
export async function startRecorder(
  onAudioChunk: (base64Audio: string, level: number) => void,
): Promise<Recorder> {
  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
    });
  } catch (error) {
    const name = error instanceof DOMException ? error.name : "";
    if (name === "NotAllowedError" || name === "SecurityError") {
      throw new MicrophoneError(
        "Microphone access was denied. Allow it in your browser's site settings and try again.",
      );
    }
    if (name === "NotFoundError") {
      throw new MicrophoneError("No microphone was found on this device.");
    }
    throw new MicrophoneError("Could not open the microphone.");
  }

  // Asking for 24 kHz lets the browser resample for us — no manual resampling.
  const context = new AudioContext({ sampleRate: SAMPLE_RATE });

  // BASE_URL keeps this correct under the GitHub Pages sub-path.
  await context.audioWorklet.addModule(`${import.meta.env.BASE_URL}pcm-worklet.js`);

  const source = context.createMediaStreamSource(stream);
  const recorder = new AudioWorkletNode(context, "pcm-recorder");
  recorder.port.onmessage = (event: MessageEvent<{ pcm: ArrayBuffer; level: number }>) => {
    onAudioChunk(toBase64(event.data.pcm), event.data.level);
  };

  // A worklet only runs while connected to the graph, but routing the mic to the
  // speakers would echo — so pass through a silent gain node instead.
  const silence = context.createGain();
  silence.gain.value = 0;
  source.connect(recorder).connect(silence).connect(context.destination);

  return {
    stop() {
      recorder.port.onmessage = null;
      source.disconnect();
      recorder.disconnect();
      silence.disconnect();
      stream.getTracks().forEach((track) => track.stop());
      void context.close();
    },
  };
}

import { useState } from "react";
import {
  LANGUAGE_OPTIONS,
  SEGMENTATION_OPTIONS,
  SESSION_SECONDS,
  type LanguageChoice,
  type SegmentationMode,
} from "../config";
import { useTranscription } from "../hooks/useTranscription";
import { Transcript } from "./Transcript";
import { ErrorBanner } from "./ErrorBanner";
import { SegmentedToggle } from "./SegmentedToggle";
import { MicIndicator } from "./MicIndicator";

// sessionStorage, not localStorage: the key dies when the tab closes.
const KEY_STORAGE = "openai-api-key";

/** Shown only on the lab page, where the segmentation mode is selectable. */
type Props = { showSegmentation?: boolean };

export function RecorderPanel({ showSegmentation = false }: Props) {
  const [apiKey, setApiKey] = useState(() => sessionStorage.getItem(KEY_STORAGE) ?? "");
  const [language, setLanguage] = useState<LanguageChoice>("de");
  const [segmentation, setSegmentation] = useState<SegmentationMode>(
    showSegmentation ? "punctuation" : "silence",
  );
  const { status, sentences, interim, error, warning, level, speaking, secondsLeft, start, stop } =
    useTranscription();

  const isRunning = status !== "idle";

  function saveKey(value: string) {
    setApiKey(value);
    sessionStorage.setItem(KEY_STORAGE, value);
  }

  function forgetKey() {
    setApiKey("");
    sessionStorage.removeItem(KEY_STORAGE);
  }

  return (
    <>
      <section className="panel">
        <label htmlFor="apiKey">OpenAI API key</label>
        <div className="row">
          <input
            id="apiKey"
            type="password"
            value={apiKey}
            onChange={(event) => saveKey(event.target.value)}
            placeholder="sk-..."
            disabled={isRunning}
            autoComplete="off"
          />
          <button type="button" onClick={forgetKey} disabled={isRunning || !apiKey}>
            Forget key
          </button>
        </div>
        <p className="note">
          Kept in memory for this browser tab only and sent only to api.openai.com. It is never
          stored on a server or committed to the repository. Use a key with a low spending limit
          and revoke it when you are done.
        </p>
      </section>

      <section className="panel">
        <span className="field-label">Language</span>
        <SegmentedToggle
          label="Language"
          options={LANGUAGE_OPTIONS}
          value={language}
          onChange={setLanguage}
          disabled={isRunning}
        />
      </section>

      {showSegmentation && (
        <section className="panel">
          <span className="field-label">Sentence splitting</span>
          <SegmentedToggle
            label="Sentence splitting"
            options={SEGMENTATION_OPTIONS}
            value={segmentation}
            onChange={setSegmentation}
            disabled={isRunning}
          />
          <p className="note">{describe(segmentation)}</p>
        </section>
      )}

      <section className="panel">
        <div className="row">
          {isRunning ? (
            <button type="button" onClick={stop} className="primary">
              Stop
            </button>
          ) : (
            <button
              type="button"
              onClick={() => start(apiKey, language, segmentation)}
              className="primary"
              disabled={!apiKey}
            >
              Start
            </button>
          )}
          <span className="countdown">{secondsLeft}s</span>
          <MicIndicator status={status} level={level} speaking={speaking} />
        </div>
        {!apiKey && <p className="note">Enter an API key to enable recording.</p>}
      </section>

      {error && <ErrorBanner message={error} />}
      {warning && <ErrorBanner message={warning} variant="warning" />}

      <Transcript sentences={sentences} interim={interim} />

      <p className="note">Recording stops automatically after {SESSION_SECONDS} seconds.</p>
    </>
  );
}

function describe(mode: SegmentationMode): string {
  switch (mode) {
    case "silence":
      return "A pause of 500 ms ends a sentence. Predictable, but it splits when you hesitate mid-thought.";
    case "semantic":
      return "A classifier decides when you have finished a thought, so trailing off does not end the sentence. Eagerness is set to low, which lets you take your time.";
    case "punctuation":
      return "Semantic splitting for the audio, then the text is split again on . ? and ! — so one long turn can still produce several sentences. The text split costs no extra API requests.";
  }
}

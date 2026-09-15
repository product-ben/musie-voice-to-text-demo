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
import { Step, type StepState } from "./Stepper";
import { StopNotice } from "./StopNotice";
import { MicCheck } from "./MicCheck";

// sessionStorage, not localStorage: the key dies when the tab closes.
const KEY_STORAGE = "openai-api-key";

type Props = { showSegmentation?: boolean };

export function RecorderPanel({ showSegmentation = false }: Props) {
  const [apiKey, setApiKey] = useState(() => sessionStorage.getItem(KEY_STORAGE) ?? "");
  const [language, setLanguage] = useState<LanguageChoice>("de");
  const [segmentation, setSegmentation] = useState<SegmentationMode>(
    showSegmentation ? "punctuation" : "silence",
  );
  // Start on the settings step if a key is already in this tab.
  const [step, setStep] = useState(() => (sessionStorage.getItem(KEY_STORAGE) ? 2 : 1));

  const {
    status, sentences, interim, error, warning, stopReason,
    level, speaking, secondsLeft, start, stop,
  } = useTranscription();

  const isRunning = status !== "idle";

  function saveKey(value: string) {
    setApiKey(value);
    sessionStorage.setItem(KEY_STORAGE, value);
  }

  function forgetKey() {
    setApiKey("");
    sessionStorage.removeItem(KEY_STORAGE);
    setStep(1);
  }

  const stateOf = (index: number): StepState =>
    step === index ? "active" : step > index ? "done" : "upcoming";

  const languageLabel = LANGUAGE_OPTIONS.find((o) => o.value === language)?.label ?? language;
  const segmentationLabel =
    SEGMENTATION_OPTIONS.find((o) => o.value === segmentation)?.label ?? segmentation;

  return (
    <div className="steps">
      <Step
        index={1}
        title="Enter your API key"
        state={stateOf(1)}
        summary={`Key ending …${apiKey.slice(-4)} · kept in this tab only`}
        onEdit={() => setStep(1)}
        editDisabled={isRunning}
      >
        <div className="row">
          <input
            id="apiKey"
            type="password"
            value={apiKey}
            onChange={(event) => saveKey(event.target.value)}
            placeholder="sk-..."
            autoComplete="off"
          />
          <button type="button" onClick={forgetKey} disabled={!apiKey}>
            Forget key
          </button>
        </div>
        <p className="note">
          Kept in memory for this browser tab only and sent only to api.openai.com. It is never
          stored on a server or committed to the repository. Use a key with a low spending limit
          and revoke it when you are done.
        </p>
        <button type="button" className="primary" disabled={!apiKey} onClick={() => setStep(2)}>
          Continue
        </button>
      </Step>

      <Step
        index={2}
        title="Choose your settings"
        state={stateOf(2)}
        summary={showSegmentation ? `${languageLabel} · ${segmentationLabel}` : languageLabel}
        onEdit={() => setStep(2)}
        editDisabled={isRunning}
      >
        <span className="field-label">Language</span>
        <SegmentedToggle
          label="Language"
          options={LANGUAGE_OPTIONS}
          value={language}
          onChange={setLanguage}
          disabled={isRunning}
        />

        {showSegmentation && (
          <>
            <span className="field-label spaced">Sentence splitting</span>
            <SegmentedToggle
              label="Sentence splitting"
              options={SEGMENTATION_OPTIONS}
              value={segmentation}
              onChange={setSegmentation}
              disabled={isRunning}
            />
            <p className="note">{describe(segmentation)}</p>
          </>
        )}

        <button type="button" className="primary" onClick={() => setStep(3)}>
          Continue
        </button>
      </Step>

      <Step index={3} title="Talk" state={stateOf(3)}>
        <div className="row">
          {isRunning ? (
            <button type="button" onClick={() => stop("manual")} className="primary">
              Stop
            </button>
          ) : (
            <button
              type="button"
              onClick={() => start(apiKey, language, segmentation)}
              className="primary"
            >
              {stopReason ? "Record again" : "Start"}
            </button>
          )}
          <span className="countdown">{secondsLeft}s left</span>
          <MicIndicator status={status} level={level} speaking={speaking} />
        </div>

        {isRunning && (
          <div
            className="timebar"
            role="progressbar"
            aria-valuenow={secondsLeft}
            aria-valuemin={0}
            aria-valuemax={SESSION_SECONDS}
          >
            <span style={{ width: `${(secondsLeft / SESSION_SECONDS) * 100}%` }} />
          </div>
        )}

        {error && <ErrorBanner message={error} />}
        {warning && <ErrorBanner message={warning} variant="warning" />}
        {!isRunning && (
          <StopNotice reason={stopReason} onRestart={() => start(apiKey, language, segmentation)} />
        )}

        <MicCheck disabled={isRunning} />

        <Transcript sentences={sentences} interim={interim} />

        <p className="note">
          Recording stops automatically after {SESSION_SECONDS} seconds. A rate-limited sentence is
          skipped with a warning — the session keeps running.
        </p>
      </Step>
    </div>
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

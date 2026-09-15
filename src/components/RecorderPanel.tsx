import { useState } from "react";
import {
  DEFAULT_MODEL,
  LANGUAGE_OPTIONS,
  MODEL_OPTIONS,
  SEGMENTATION_OPTIONS,
  SESSION_SECONDS,
  type LanguageChoice,
  type SegmentationMode,
  type TranscriptionModel,
} from "../config";
import { useTranscription } from "../hooks/useTranscription";
import { SentenceList } from "./SentenceList";
import { UndoBar } from "./UndoBar";
import { ErrorBanner } from "./ErrorBanner";
import { SegmentedToggle } from "./SegmentedToggle";
import { MicIndicator } from "./MicIndicator";
import { Step, type StepState } from "./Stepper";
import { StopNotice } from "./StopNotice";
import { MicCheck } from "./MicCheck";
import { Tabs } from "./Tabs";
import { DataLayerView } from "./DataLayerView";

// sessionStorage, not localStorage: the key dies when the tab closes.
const KEY_STORAGE = "openai-api-key";

type Props = { showSegmentation?: boolean };

export function RecorderPanel({ showSegmentation = false }: Props) {
  const [apiKey, setApiKey] = useState(() => sessionStorage.getItem(KEY_STORAGE) ?? "");
  const [model, setModel] = useState<TranscriptionModel>(DEFAULT_MODEL);
  const [language, setLanguage] = useState<LanguageChoice>("de");
  const [segmentation, setSegmentation] = useState<SegmentationMode>(
    showSegmentation ? "punctuation" : "silence",
  );
  // Start on the settings step if a key is already in this tab.
  const [step, setStep] = useState(() => (sessionStorage.getItem(KEY_STORAGE) ? 2 : 1));
  const [tab, setTab] = useState<"improved" | "initial">("improved");

  const {
    status, sentences, interim, error, warning, stopReason,
    level, speaking, secondsLeft, start, stop,
    editSentence, combineSentences, moveSentence, deleteSentence,
    undoLabel, undo, dismissUndo,
  } = useTranscription();

  const isRunning = status !== "idle";
  const improvedTab = tab === "improved";
  /** Once anything has been captured, Start becomes Record more. */
  const hasRecorded = sentences.length > 0 || stopReason !== null;
  /**
   * Replaces the old "Stopped." block: a normal stop needs no explanation,
   * but a timeout or an error would otherwise look like it stopped by itself.
   */
  const stopHint =
    stopReason === "timeout"
      ? `${SESSION_SECONDS}-second limit reached`
      : stopReason === "error"
        ? "Stopped by the error above"
        : null;

  function saveKey(value: string) {
    setApiKey(value);
    sessionStorage.setItem(KEY_STORAGE, value);
  }

  function forgetKey() {
    setApiKey("");
    sessionStorage.removeItem(KEY_STORAGE);
    setStep(1);
  }

  const isLive = model === "gpt-live-transcribe";
  // Semantic splitting is server-side VAD, which gpt-live-transcribe rejects —
  // drop that option, and relabel the rest, since breaks come from a browser
  // pause rather than a classifier.
  const segmentationOptions = SEGMENTATION_OPTIONS.filter(
    (option) => !(isLive && option.value === "semantic"),
  ).map((option) =>
    isLive && option.value === "punctuation"
      ? { ...option, label: "Pause + punctuation" }
      : option,
  );

  function chooseModel(next: TranscriptionModel) {
    setModel(next);
    if (next === "gpt-live-transcribe" && segmentation === "semantic") setSegmentation("punctuation");
  }

  const stateOf = (index: number): StepState =>
    step === index ? "active" : step > index ? "done" : "upcoming";

  const languageLabel = LANGUAGE_OPTIONS.find((o) => o.value === language)?.label ?? language;
  const segmentationLabel =
    segmentationOptions.find((o) => o.value === segmentation)?.label ?? segmentation;

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
        title="Choose the transcription mode"
        state={stateOf(2)}
        summary={MODEL_OPTIONS.find((o) => o.value === model)?.label}
        onEdit={() => setStep(2)}
        editDisabled={isRunning}
      >
        <SegmentedToggle
          label="Transcription mode"
          options={MODEL_OPTIONS}
          value={model}
          onChange={chooseModel}
          disabled={isRunning}
        />
        <p className="note">{describeModel(model)}</p>
        <button type="button" className="primary" onClick={() => setStep(3)}>
          Continue
        </button>
      </Step>

      <Step
        index={3}
        title="Choose your settings"
        state={stateOf(3)}
        summary={showSegmentation ? `${languageLabel} · ${segmentationLabel}` : languageLabel}
        onEdit={() => setStep(3)}
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
              options={segmentationOptions}
              value={segmentation}
              onChange={setSegmentation}
              disabled={isRunning}
            />
            <p className="note">{describe(segmentation, isLive)}</p>
          </>
        )}

        <button type="button" className="primary" onClick={() => setStep(4)}>
          Continue
        </button>
      </Step>

      <Step index={4} title="Talk" state={stateOf(4)}>
        <Tabs
          label="Editing version"
          tabs={[
            { value: "improved", label: "Improved UX" },
            { value: "initial", label: "Initial" },
          ]}
          value={tab}
          onChange={setTab}
        />

        {/* §7 — the microphone check comes before the controls it qualifies. */}
        {improvedTab && (
          <>
            <MicCheck disabled={isRunning} />
            <hr className="section-rule" />
          </>
        )}

        <div className="row">
          {isRunning ? (
            <button type="button" onClick={() => stop("manual")} className="primary">
              Stop
            </button>
          ) : (
            <button
              type="button"
              className="primary"
              onClick={() =>
                start(apiKey, model, language, segmentation, {
                  // §5 — carry on from what is already there, newest block on top.
                  keepExisting: improvedTab && hasRecorded,
                  insertAtTop: improvedTab,
                })
              }
            >
              {improvedTab ? (hasRecorded ? "Record more" : "Start") : stopReason ? "Record again" : "Start"}
            </button>
          )}
          <span className="countdown">{secondsLeft}s left</span>
          <MicIndicator status={status} level={level} speaking={speaking} />
          {improvedTab && !isRunning && stopHint && <span className="stop-hint">{stopHint}</span>}
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

        {!improvedTab && !isRunning && (
          <StopNotice
            reason={stopReason}
            onRestart={() => start(apiKey, model, language, segmentation)}
          />
        )}

        {!improvedTab && <MicCheck disabled={isRunning} />}

        <SentenceList
          sentences={sentences}
          interim={interim}
          // Editing is offered only once the recording has finished.
          editable={!isRunning}
          variant={improvedTab ? "improved" : "initial"}
          onEdit={editSentence}
          onCombine={combineSentences}
          onMove={moveSentence}
          onDelete={deleteSentence}
        />
        <UndoBar label={undoLabel} onUndo={undo} onDismiss={dismissUndo} />

        <p className="note">
          Recording stops automatically after {SESSION_SECONDS} seconds. A rate-limited sentence is
          skipped with a warning — the session keeps running.
        </p>

        {/* §6 — the data behind the boxes, off by default. */}
        {improvedTab && <DataLayerView sentences={sentences} />}
      </Step>
    </div>
  );
}

function describeModel(model: TranscriptionModel): string {
  return model === "gpt-live-transcribe"
    ? "gpt-live-transcribe — words appear about a second behind your voice, while you are still " +
        "speaking. It has no server-side pause detection, so the browser decides where sentences " +
        "end. $0.017 per minute."
    : "gpt-4o-transcribe — the sentence appears about 0.3 s after you stop talking, all at once. " +
        "OpenAI decides where sentences end, including the semantic option below. $0.006 per minute.";
}

function describe(mode: SegmentationMode, isLive: boolean): string {
  switch (mode) {
    case "silence":
      return isLive
        ? "The browser ends a sentence after 800 ms of silence."
        : "A pause of 500 ms ends a sentence. Predictable, but it splits when you hesitate mid-thought.";
    case "semantic":
      return "A classifier decides when you have finished a thought, so trailing off does not end the sentence. Eagerness is set to low, which lets you take your time.";
    case "punctuation":
      return isLive
        ? "The browser ends a sentence after 800 ms of silence, then the text is split again on . ? and ! — free, no extra requests."
        : "Semantic splitting for the audio, then the text is split again on . ? and ! — so one long turn can still produce several sentences. The text split costs no extra API requests.";
  }
}

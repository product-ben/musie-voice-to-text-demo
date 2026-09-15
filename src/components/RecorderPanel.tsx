import { useState } from "react";
import {
  DEFAULT_MODEL,
  LANGUAGE_OPTIONS,
  MODELS,
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

// sessionStorage, not localStorage: everything here dies when the tab closes.
const KEY_STORAGE = "openai-api-key";
const MODEL_STORAGE = "transcription-model";
const LANGUAGE_STORAGE = "transcription-language";
const SEGMENTATION_STORAGE = "transcription-segmentation";

/**
 * Reads a remembered choice, falling back when it is missing or no longer one
 * of the options — otherwise a retired model would stick around for the life
 * of the tab. Choices were not remembered at all before, so a reload silently
 * reset the model to the default and streaming appeared to have broken.
 */
function remembered<T extends string>(
  key: string,
  options: readonly { value: string }[],
  fallback: T,
): T {
  const stored = sessionStorage.getItem(key);
  return options.some((option) => option.value === stored) ? (stored as T) : fallback;
}

type Props = { showSegmentation?: boolean };

export function RecorderPanel({ showSegmentation = false }: Props) {
  const [apiKey, setApiKey] = useState(() => sessionStorage.getItem(KEY_STORAGE) ?? "");
  const [model, setModel] = useState<TranscriptionModel>(() =>
    remembered(MODEL_STORAGE, MODEL_OPTIONS, DEFAULT_MODEL),
  );
  const [language, setLanguage] = useState<LanguageChoice>(() =>
    remembered(LANGUAGE_STORAGE, LANGUAGE_OPTIONS, "de"),
  );
  const [segmentation, setSegmentation] = useState<SegmentationMode>(() =>
    remembered(SEGMENTATION_STORAGE, SEGMENTATION_OPTIONS, showSegmentation ? "punctuation" : "silence"),
  );
  // Start on the settings step if a key is already in this tab.
  const [step, setStep] = useState(() => (sessionStorage.getItem(KEY_STORAGE) ? 2 : 1));
  const [tab, setTab] = useState<"improved" | "initial">("improved");

  const {
    status, sentences, sessionCount, interim, pending, error, warning, stopReason,
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

  // Semantic splitting is server-side VAD, which a streaming model rejects —
  // drop that option, and relabel the rest, since breaks come from a browser
  // pause rather than a classifier.
  const isLive = !MODELS[model].serverVad;
  const segmentationOptions = SEGMENTATION_OPTIONS.filter(
    (option) => !(isLive && option.value === "semantic"),
  ).map((option) =>
    isLive && option.value === "punctuation"
      ? { ...option, label: "Pause + punctuation" }
      : option,
  );

  function chooseModel(next: TranscriptionModel) {
    setModel(next);
    sessionStorage.setItem(MODEL_STORAGE, next);
    if (!MODELS[next].serverVad && segmentation === "semantic") chooseSegmentation("punctuation");
  }

  function chooseLanguage(next: LanguageChoice) {
    setLanguage(next);
    sessionStorage.setItem(LANGUAGE_STORAGE, next);
  }

  function chooseSegmentation(next: SegmentationMode) {
    setSegmentation(next);
    sessionStorage.setItem(SEGMENTATION_STORAGE, next);
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
        <p className="note">{MODELS[model].note}</p>
        {MODELS[model].retires && (
          <p className="note warn-note">
            OpenAI is retiring this model on {MODELS[model].retires}. Its replacements are{" "}
            <code>gpt-live-transcribe</code> and <code>gpt-transcribe</code>.
          </p>
        )}
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
          onChange={chooseLanguage}
          disabled={isRunning}
        />

        {showSegmentation && (
          <>
            <span className="field-label spaced">Sentence splitting</span>
            <SegmentedToggle
              label="Sentence splitting"
              options={segmentationOptions}
              value={segmentation}
              onChange={chooseSegmentation}
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
          pending={pending}
          // Improved mode inserts each session's statements as a block, so the
          // waiting box belongs at that cursor, not at the end of the list.
          pendingIndex={improvedTab ? sessionCount : undefined}
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

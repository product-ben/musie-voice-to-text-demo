import { IDLE_STOP_MS, SESSION_SECONDS } from "../config";
import type { useTranscription } from "../hooks/useTranscription";
import { SentenceList } from "./SentenceList";
import { UndoBar } from "./UndoBar";
import { ErrorBanner } from "./ErrorBanner";
import { MicIndicator } from "./MicIndicator";
import { StopNotice } from "./StopNotice";
import { MicCheck } from "./MicCheck";
import { DataLayerView } from "./DataLayerView";

type Props = {
  /** A live transcription session: its state and everything that can act on it. */
  session: ReturnType<typeof useTranscription>;
  /** "initial" keeps the original layout; "improved" is the reworked one. */
  variant: "initial" | "improved";
  /**
   * Starting needs the key, model and language, which belong to the wizard
   * above. `keepExisting` is decided here, because only this component knows
   * whether anything has been recorded yet.
   */
  onStart: (options: { keepExisting: boolean }) => void;
};

/**
 * Everything below the microphone check: the transcript, the record controls
 * that fill it, and the data behind it. Self-contained apart from the session
 * it is handed, so the wizard above only has to supply the settings.
 */
export function TranscriptWorkspace({ session, variant, onStart }: Props) {
  const {
    status, sentences, interim, pending, error, warning, stopReason,
    level, speaking, secondsLeft, stop,
    editSentence, combineSentences, moveSentence, deleteSentence,
    undoLabel, undo, dismissUndo,
  } = session;

  const isRunning = status !== "idle";
  const improved = variant === "improved";
  /** Once anything has been captured, Record now becomes Record more. */
  const hasRecorded = sentences.length > 0 || stopReason !== null;
  const hint = improved && !isRunning ? stopHint(stopReason) : null;

  return (
    <>
      <SentenceList
        sentences={sentences}
        interim={interim}
        pending={pending}
        // Keep the newest statement in view while the list grows past the screen.
        autoScroll={isRunning}
        // Editing is offered only once the recording has finished.
        editable={!isRunning}
        variant={variant}
        onEdit={editSentence}
        onCombine={combineSentences}
        onMove={moveSentence}
        onDelete={deleteSentence}
      />
      <UndoBar label={undoLabel} onUndo={undo} onDismiss={dismissUndo} />

      <div className="row">
        {isRunning ? (
          <button type="button" onClick={() => stop("manual")} className="primary">
            Stop
          </button>
        ) : (
          <button
            type="button"
            className="primary"
            // Carry on from what is already there, appending to the end.
            onClick={() => onStart({ keepExisting: improved && hasRecorded })}
          >
            {improved
              ? hasRecorded
                ? "Record more"
                : "Record now"
              : stopReason
                ? "Record again"
                : "Start"}
          </button>
        )}
        <span className="countdown">{secondsLeft}s left</span>
        <MicIndicator status={status} level={level} speaking={speaking} />
        {hint && <span className="stop-hint">{hint}</span>}
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

      {!improved && !isRunning && (
        <StopNotice reason={stopReason} onRestart={() => onStart({ keepExisting: false })} />
      )}

      {!improved && <MicCheck disabled={isRunning} />}

      <p className="note">
        Recording stops automatically after {SESSION_SECONDS} seconds, or after{" "}
        {IDLE_STOP_MS / 1000} seconds of silence. A rate-limited sentence is skipped with a
        warning — the session keeps running.
      </p>

      {/* §6 — the data behind the boxes, off by default. */}
      {improved && <DataLayerView sentences={sentences} />}
    </>
  );
}

/**
 * Replaces the old "Stopped." block: a normal stop needs no explanation, but a
 * timeout, a silence cut-off or an error would otherwise look like the session
 * stopping by itself.
 */
function stopHint(reason: ReturnType<typeof useTranscription>["stopReason"]) {
  if (reason === "timeout") return `${SESSION_SECONDS}-second limit reached`;
  if (reason === "silence") return `Stopped after ${IDLE_STOP_MS / 1000}s of silence`;
  if (reason === "error") return "Stopped by the error above";
  return null;
}

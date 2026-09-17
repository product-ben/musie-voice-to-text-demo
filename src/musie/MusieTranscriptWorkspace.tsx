import { useEffect, useRef, useState } from "react";
// Imported per file rather than through the package barrel: the barrel also
// pulls in Lightbox and MusicPlayer, two components that do not type-check
// against the base-ui version the package itself declares. See README.
import { Badge } from "../../reference/musie260917/components/Badge";
import { ContentBox } from "../../reference/musie260917/components/ContentBox";
import { Message } from "../../reference/musie260917/components/Message";
import { Switch } from "../../reference/musie260917/components/Switch";
import { RecordButton } from "../../reference/musie260917/components/RecordButton";
import { IDLE_STOP_MS, SESSION_SECONDS } from "../config";
import { useDragList } from "../hooks/useDragList";
import type { useTranscription } from "../hooks/useTranscription";
import type { Sentence } from "../transcript/types";
import { MusieStatementCard } from "./MusieStatementCard";
import { MusieToast } from "./MusieToast";
import { useCoarsePointer } from "./useCoarsePointer";

type Props = {
  /** A live transcription session: its state and everything that can act on it. */
  session: ReturnType<typeof useTranscription>;
  /** Recording needs a key, which the page above collects. */
  canRecord: boolean;
  onStart: (options: { keepExisting: boolean }) => void;
};

/**
 * The transcript workspace, dressed in Musy.
 *
 * Same component, same behaviour, same hooks — only the surface changes. Each
 * part is a released design-system component rather than a restyled one:
 *
 *   record control   Record Button §7.22 — one control, two states, and it
 *                                  never touches getUserMedia, which is exactly
 *                                  this app's split: the hook owns the
 *                                  microphone and the 60-second timer
 *   statement        Content Box   the card, with a real heading
 *   waiting          Content Box   outline="dashed" — the system's own reading
 *                                  of "provisional / awaiting content" (G2)
 *   errors, undo     Message       each with an explicit live region
 *   data layer       Switch        settings-row reverse layout
 *   every action     CTA Button / Icon Button
 */
export function MusieTranscriptWorkspace({ session, canRecord, onStart }: Props) {
  const {
    status, sentences, interim, pending, error, warning, stopReason,
    levels, secondsLeft, stop,
    editSentence, combineSentences, moveSentence, deleteSentence,
    undoLabel, undo, dismissUndo,
  } = session;

  const [showData, setShowData] = useState(false);
  /** Only one card's actions are open at a time, so the list stays scannable. */
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const toolSize = useCoarsePointer() ? "primary" : "min";
  const isRunning = status !== "idle";
  const hasRecorded = sentences.length > 0 || stopReason !== null;

  const drag = useDragList({ onCombine: combineWithOrder, onMove: moveSentence });

  function combineWithOrder(sourceId: string, targetId: string) {
    const from = sentences.findIndex((s) => s.id === sourceId);
    const to = sentences.findIndex((s) => s.id === targetId);
    // Dragging down prepends, dragging up appends, so a merge always reads in
    // the order the statements appear on screen.
    combineSentences(sourceId, targetId, from < to ? "sourceFirst" : "targetFirst");
  }

  /** Keeps the newest statement on screen once the list outgrows the viewport. */
  const endOfList = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!isRunning) return;
    endOfList.current?.scrollIntoView({
      block: "nearest",
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    });
  }, [isRunning, sentences.length, interim, pending]);

  const dragged = sentences.find((s) => s.id === drag.draggingId);
  const waiting = (interim || pending) && !drag.draggingId;

  return (
    <div className="musie-group">
      <section className="musie-stack" aria-label="Transcript">
        {sentences.length === 0 && !waiting ? (
          <ContentBox
            outline="dashed"
            headline="Nothing captured yet"
            headingLevel={3}
            text="Finished statements will appear here, one box each, in the order you said them."
          />
        ) : (
          <ol className="musie-transcript">
            {sentences.map((sentence, index) => {
              const target = drag.dropTarget?.id === sentence.id ? drag.dropTarget.mode : null;
              return (
                <li key={sentence.id}>
                  {target === "before" && <div className="musie-drop" aria-hidden="true" />}
                  <MusieStatementCard
                    sentence={sentence}
                    position={index + 1}
                    editable={!isRunning}
                    dragging={drag.draggingId === sentence.id}
                    dropMode={target}
                    menuOpen={openMenuId === sentence.id}
                    onToggleMenu={() =>
                      setOpenMenuId((current) => (current === sentence.id ? null : sentence.id))
                    }
                    toolSize={toolSize}
                    onSave={(text) => editSentence(sentence.id, text)}
                    onDelete={() => deleteSentence(sentence.id)}
                    handleProps={drag.handleProps(sentence.id)}
                    cardProps={drag.cardProps(sentence.id)}
                    registerRef={(element) => drag.registerItem(sentence.id, element)}
                  />
                  {target === "after" && <div className="musie-drop" aria-hidden="true" />}
                </li>
              );
            })}
          </ol>
        )}

        {waiting && (
          <ContentBox
            outline="dashed"
            headline={interim ? "Hearing you" : "Listening"}
            headingLevel={3}
            headlineStep="label-md"
          >
            {interim ? (
              <p className="musie-card__text" data-type-step="body-md">{interim}</p>
            ) : (
              <span className="musie-dots" aria-label="Waiting for words">
                <span /><span /><span />
              </span>
            )}
          </ContentBox>
        )}

        <div ref={endOfList} aria-hidden="true" />
      </section>

      <section className="musie-stack" aria-label="Recording">
        <RecordButton
          state={isRunning ? "recording" : "ready"}
          // The app owns the clock and the ceiling, as §7.22 requires; the
          // button only draws them.
          elapsed={SESSION_SECONDS - secondsLeft}
          maxSeconds={SESSION_SECONDS}
          levels={levels}
          disabled={!canRecord}
          // Not `block`: the width is a state cue here. Ready hugs its label,
          // recording takes the column. See musie.css.
          className="musie-record"
          onToggle={() =>
            isRunning ? stop("manual") : onStart({ keepExisting: hasRecorded })
          }
          readyLabel={hasRecorded ? "Record more" : "Record now"}
          // "Recording Running" does not fit a phone column: at 310px the meter
          // collapses to nothing and the readout — which §7.22 says must never
          // be what gives — overflows by 44px and clips. `recordingLabel` is
          // the component's own lever for this. See README.
          recordingLabel="Recording"
        />

        <p className="musie-note" data-type-step="body-sm">
          {hasRecorded
            ? "New statements are added to the end of the list. "
            : "Each pause finishes a statement. "}
          Stops on its own after {SESSION_SECONDS} seconds, or after{" "}
          {IDLE_STOP_MS / 1000} seconds of silence.
        </p>

        {/* A manual stop explains itself; the other three do not. */}
        {!isRunning && stopReason && stopReason !== "manual" && (
          <div className="musie-row">
            <Badge variant={stopReason === "error" ? "error" : "neutral"}>
              {stopWord(stopReason)}
            </Badge>
          </div>
        )}

        {error && (
          <Message
            variant="error"
            live="assertive"
            headline="Recording stopped"
            text={error}
          />
        )}

        {warning && (
          <Message
            variant="warning"
            live="polite"
            headline="One statement was skipped"
            text={warning}
          />
        )}
      </section>

      <MusieToast label={undoLabel} onAction={undo} onDismiss={dismissUndo} />

      {dragged && drag.pointer && (
        <div
          className="musie-drag-preview"
          style={{ left: drag.pointer.x, top: drag.pointer.y }}
          aria-hidden="true"
        >
          {drag.dropTarget?.mode === "combine" ? "Combine with this one" : dragged.text}
        </div>
      )}

      <section className="musie-stack" aria-label="Data layer">
        <Switch
          label="Show data layer"
          reverse
          checked={showData}
          onCheckedChange={setShowData}
        />
        {showData && <DataLayer sentences={sentences} />}
      </section>
    </div>
  );
}

function stopWord(reason: "timeout" | "silence" | "error") {
  if (reason === "timeout") return `${SESSION_SECONDS}-second limit reached`;
  if (reason === "silence") return `Stopped after ${IDLE_STOP_MS / 1000}s of silence`;
  return "Stopped by the error above";
}

/**
 * The array as it is held in state. `order` is not stored — it is read off the
 * array here, so a merge or a reorder renumbers it immediately.
 */
function DataLayer({ sentences }: { sentences: Sentence[] }) {
  if (sentences.length === 0) {
    return (
      <p className="musie-card__text" data-type-step="body-sm">
        Nothing to show yet.
      </p>
    );
  }

  return (
    <pre className="musie-json" aria-label="Statements as stored">
      {"[\n"}
      {sentences.map((sentence, index) => {
        const row = {
          order: index + 1,
          id: sentence.id,
          text: sentence.text,
          language: sentence.language,
          createdAt: sentence.createdAt,
        };
        const keys = Object.keys(row) as (keyof typeof row)[];
        return (
          <span key={sentence.id}>
            {"  {\n"}
            {keys.map((key, keyIndex) => (
              <span key={key}>
                {"    "}
                <span className="musie-json__key">&quot;{key}&quot;</span>
                {": "}
                {typeof row[key] === "number" ? (
                  <span className="musie-json__number">{row[key]}</span>
                ) : (
                  <span className="musie-json__string">&quot;{row[key]}&quot;</span>
                )}
                {keyIndex < keys.length - 1 ? ",\n" : "\n"}
              </span>
            ))}
            {index < sentences.length - 1 ? "  },\n" : "  }\n"}
          </span>
        );
      })}
      {"]"}
    </pre>
  );
}

import { useState } from "react";
import { useDragList } from "../hooks/useDragList";
import { SentenceCard } from "./SentenceCard";
import { SentenceCardV2 } from "./SentenceCardV2";
import type { CombineOrder } from "../hooks/useSentences";
import type { Sentence } from "../transcript/types";

type Props = {
  sentences: Sentence[];
  interim: string;
  /** Editing is only offered once recording has stopped. */
  editable: boolean;
  onEdit: (id: string, text: string) => void;
  onCombine: (sourceId: string, targetId: string, order?: CombineOrder) => void;
  /** "initial" keeps the original card; "improved" is the reworked one. */
  variant?: "initial" | "improved";
  onMove: (sourceId: string, targetId: string, position: "before" | "after") => void;
  onDelete: (id: string) => void;
};

export function SentenceList({
  sentences, interim, editable, onEdit, onCombine, onMove, onDelete, variant = "initial",
}: Props) {
  const improved = variant === "improved";

  /**
   * Dragging downward prepends the dragged text, dragging upward appends it,
   * so a merge always reads in the order the statements appear on screen.
   * Direction comes from list position rather than gesture, which is exact.
   */
  const combineInOrder = (sourceId: string, targetId: string) => {
    if (!improved) return onCombine(sourceId, targetId);
    const from = sentences.findIndex((s) => s.id === sourceId);
    const to = sentences.findIndex((s) => s.id === targetId);
    onCombine(sourceId, targetId, from < to ? "sourceFirst" : "targetFirst");
  };
  const [engagedId, setEngagedId] = useState<string | null>(null);
  const [liftedId, setLiftedId] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");

  const drag = useDragList({ onCombine: combineInOrder, onMove });

  if (sentences.length === 0 && !interim) {
    return <p className="placeholder">Finished statements will appear here, one block each.</p>;
  }

  /** Keyboard equivalent of the drag gesture, for people not using a pointer. */
  function handleKeyDown(event: React.KeyboardEvent, sentence: Sentence, index: number) {
    const lifted = liftedId === sentence.id;

    if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      setLiftedId(lifted ? null : sentence.id);
      setAnnouncement(lifted ? "Dropped." : `Lifted statement ${index + 1}. Use arrows to move.`);
      return;
    }
    if (event.key === "Escape" && lifted) {
      setLiftedId(null);
      setAnnouncement("Cancelled.");
      return;
    }
    if ((event.key === "m" || event.key === "M") && index > 0) {
      event.preventDefault();
      onCombine(sentence.id, sentences[index - 1].id);
      setLiftedId(null);
      setAnnouncement(`Merged statement ${index + 1} into ${index}.`);
      return;
    }
    if (!lifted) return;

    if (event.key === "ArrowUp" && index > 0) {
      event.preventDefault();
      onMove(sentence.id, sentences[index - 1].id, "before");
      setAnnouncement(`Moved to position ${index}.`);
    }
    if (event.key === "ArrowDown" && index < sentences.length - 1) {
      event.preventDefault();
      onMove(sentence.id, sentences[index + 1].id, "after");
      setAnnouncement(`Moved to position ${index + 2}.`);
    }
  }

  const dragged = sentences.find((s) => s.id === drag.draggingId);

  return (
    <div
      className={[
        "transcript",
        improved && "is-improved",
        drag.draggingId && "is-dragging-list",
      ].filter(Boolean).join(" ")}
    >
      {editable && sentences.length > 1 && (
        <p className="edit-hint">
          Drag a statement onto another to combine them, or between two to reorder.
          {improved && " On touch, hold briefly to drag from anywhere on a card."}
        </p>
      )}

      {sentences.map((sentence, index) => {
        const target = drag.dropTarget?.id === sentence.id ? drag.dropTarget.mode : null;
        return (
          <div key={sentence.id} className="card-slot">
            {target === "before" && <div className="drop-line" aria-hidden="true" />}
            {improved ? (
              <SentenceCardV2
                sentence={sentence}
                position={`${index + 1}`}
                editable={editable}
                dragging={drag.draggingId === sentence.id}
                dropMode={target}
                liftedByKeyboard={liftedId === sentence.id}
                onSave={(text) => onEdit(sentence.id, text)}
                onDelete={() => onDelete(sentence.id)}
                handleProps={drag.handleProps(sentence.id)}
                cardProps={drag.cardProps(sentence.id)}
                onHandleKeyDown={(event) => handleKeyDown(event, sentence, index)}
                registerRef={(element) => drag.registerItem(sentence.id, element)}
              />
            ) : (
              <SentenceCard
                sentence={sentence}
                position={`${index + 1}`}
                editable={editable}
                engaged={engagedId === sentence.id}
                dragging={drag.draggingId === sentence.id}
                dropMode={target}
                liftedByKeyboard={liftedId === sentence.id}
                onEngage={() => {
                  // A click that ended a drag should not also select the card.
                  if (drag.consumeDrag()) return;
                  setEngagedId((current) => (current === sentence.id ? null : sentence.id));
                }}
                onSave={(text) => onEdit(sentence.id, text)}
                onDelete={() => onDelete(sentence.id)}
                handleProps={drag.handleProps(sentence.id)}
                onHandleKeyDown={(event) => handleKeyDown(event, sentence, index)}
                registerRef={(element) => drag.registerItem(sentence.id, element)}
              />
            )}
            {target === "after" && <div className="drop-line" aria-hidden="true" />}
          </div>
        );
      })}

      {interim && <p className="sentence-interim">{interim}</p>}

      {/* Follows the finger so the gesture has something to hold on to. */}
      {dragged && drag.pointer && (
        <div
          className="drag-preview"
          style={{ left: drag.pointer.x, top: drag.pointer.y }}
          aria-hidden="true"
        >
          {drag.dropTarget?.mode === "combine" ? "Combine with this one" : dragged.text}
        </div>
      )}

      <p className="sr-only" role="status" aria-live="polite">
        {announcement}
      </p>
    </div>
  );
}

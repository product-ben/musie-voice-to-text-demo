import { useEffect, useRef, useState } from "react";
import type { DropMode, Sentence } from "../transcript/types";

type Props = {
  sentence: Sentence;
  position: string;
  editable: boolean;
  engaged: boolean;
  dragging: boolean;
  dropMode: DropMode | null;
  liftedByKeyboard: boolean;
  onEngage: () => void;
  onSave: (text: string) => void;
  onDelete: () => void;
  handleProps: Record<string, unknown>;
  onHandleKeyDown: (event: React.KeyboardEvent) => void;
  registerRef: (element: HTMLElement | null) => void;
};

export function SentenceCard({
  sentence, position, editable, engaged, dragging, dropMode,
  liftedByKeyboard, onEngage, onSave, onDelete, handleProps, onHandleKeyDown, registerRef,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(sentence.text);
  const textarea = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing) {
      textarea.current?.focus();
      textarea.current?.setSelectionRange(draft.length, draft.length);
    }
    // Only when entering edit mode, not on every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  function startEditing() {
    setDraft(sentence.text);
    setEditing(true);
  }

  function save() {
    onSave(draft);
    setEditing(false);
  }

  const classes = [
    "sentence-card",
    engaged && "is-engaged",
    dragging && "is-dragging",
    dropMode === "combine" && "is-merge-target",
    liftedByKeyboard && "is-lifted",
    editing && "is-editing",
  ]
    .filter(Boolean)
    .join(" ");

  if (editing) {
    return (
      <div className={classes} ref={registerRef}>
        <textarea
          ref={textarea}
          className="sentence-input"
          value={draft}
          rows={Math.max(2, Math.ceil(draft.length / 42))}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") setEditing(false);
            if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) save();
          }}
          aria-label={`Edit statement ${position}`}
        />
        <div className="card-actions">
          <button type="button" className="primary" onClick={save}>
            Save
          </button>
          <button type="button" onClick={() => setEditing(false)}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={classes} ref={registerRef} onClick={onEngage}>
      <div className="card-main">
        {editable && (
          <button
            type="button"
            className="drag-handle"
            aria-label={`Move statement ${position}. Press space to lift, arrows to move, M to merge upward.`}
            onKeyDown={onHandleKeyDown}
            {...handleProps}
          >
            <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
              <circle cx="6" cy="3" r="1.4" /><circle cx="10" cy="3" r="1.4" />
              <circle cx="6" cy="8" r="1.4" /><circle cx="10" cy="8" r="1.4" />
              <circle cx="6" cy="13" r="1.4" /><circle cx="10" cy="13" r="1.4" />
            </svg>
          </button>
        )}
        <p className="sentence-text">{sentence.text}</p>
      </div>

      {editable && (
        <div className="card-actions">
          <button type="button" onClick={startEditing}>
            Edit
          </button>
          <button type="button" className="danger" onClick={onDelete}>
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

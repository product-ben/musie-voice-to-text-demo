import { useEffect, useRef, useState } from "react";
import { useAutoGrow } from "../hooks/useAutoGrow";
import type { DropMode, Sentence } from "../transcript/types";

type Props = {
  sentence: Sentence;
  position: string;
  editable: boolean;
  dragging: boolean;
  dropMode: DropMode | null;
  liftedByKeyboard: boolean;
  onSave: (text: string) => void;
  onDelete: () => void;
  handleProps: Record<string, unknown>;
  cardProps: Record<string, unknown>;
  onHandleKeyDown: (event: React.KeyboardEvent) => void;
  registerRef: (element: HTMLElement | null) => void;
};

/**
 * The reworked card: controls are a fixed stack on the right and stay visible,
 * and the whole card is a drag surface rather than just the handle.
 */
export function SentenceCardV2({
  sentence, position, editable, dragging, dropMode, liftedByKeyboard,
  onSave, onDelete, handleProps, cardProps, onHandleKeyDown, registerRef,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(sentence.text);
  const textarea = useRef<HTMLTextAreaElement>(null);
  useAutoGrow(textarea, editing ? draft : "");

  useEffect(() => {
    if (!editing) return;
    const element = textarea.current;
    element?.focus();
    element?.setSelectionRange(element.value.length, element.value.length);
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
    "card2",
    dragging && "is-dragging",
    dropMode === "combine" && "is-merge-target",
    liftedByKeyboard && "is-lifted",
    editing && "is-editing",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes} ref={registerRef} {...(editable && !editing ? cardProps : {})}>
      <div className="card2-body">
        {editing ? (
          <textarea
            ref={textarea}
            className="sentence-input"
            value={draft}
            data-no-drag
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") setEditing(false);
              if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) save();
            }}
            aria-label={`Edit statement ${position}`}
          />
        ) : (
          <p className="sentence-text">{sentence.text}</p>
        )}

        {editing && (
          <div className="edit-actions" data-no-drag>
            <button type="button" className="primary" onClick={save}>
              Save
            </button>
            <button type="button" onClick={() => setEditing(false)}>
              Cancel
            </button>
          </div>
        )}
      </div>

      {editable && !editing && (
        <div className="card2-tools">
          <button
            type="button"
            className="tool drag-handle"
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

          <button
            type="button"
            className="tool"
            data-no-drag
            onClick={startEditing}
            aria-label={`Edit statement ${position}`}
            title="Edit"
          >
            <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true">
              <path d="M11.6 1.8a1.3 1.3 0 0 1 1.9 0l.7.7a1.3 1.3 0 0 1 0 1.9l-.9.9-2.6-2.6.9-.9ZM9.8 3.6l2.6 2.6-6.5 6.5-3.2.6.6-3.2 6.5-6.5Z" />
            </svg>
          </button>

          <button
            type="button"
            className="tool tool-danger"
            data-no-drag
            onClick={onDelete}
            aria-label={`Delete statement ${position}`}
            title="Delete"
          >
            <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true">
              <path d="M6 1.5h4a.5.5 0 0 1 .5.5v1h3a.5.5 0 0 1 0 1h-11a.5.5 0 0 1 0-1h3V2a.5.5 0 0 1 .5-.5Zm.5 1.5h3V2.5h-3V3ZM3.6 5h8.8l-.6 8.2a1.3 1.3 0 0 1-1.3 1.2H5.5a1.3 1.3 0 0 1-1.3-1.2L3.6 5Zm2.4 1.8v5.4h1V6.8H6Zm3 0v5.4h1V6.8H9Z" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}

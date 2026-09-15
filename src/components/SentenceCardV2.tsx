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
  menuOpen: boolean;
  onToggleMenu: () => void;
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
  menuOpen, onToggleMenu, onSave, onDelete, handleProps, cardProps,
  onHandleKeyDown, registerRef,
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
    onToggleMenu();
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
    menuOpen && "is-menu-open",
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

        {menuOpen && !editing && (
          <div className="card-menu" data-no-drag>
            <button type="button" className="menu-button" onClick={startEditing}>
              Edit
            </button>
            <button type="button" className="menu-button is-danger" onClick={onDelete}>
              Delete
            </button>
          </div>
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
            onClick={onToggleMenu}
            aria-expanded={menuOpen}
            aria-label={`Actions for statement ${position}`}
            title="More"
          >
            <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
              <circle cx="8" cy="3" r="1.5" />
              <circle cx="8" cy="8" r="1.5" />
              <circle cx="8" cy="13" r="1.5" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}

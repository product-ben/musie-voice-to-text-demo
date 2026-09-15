import { useId, useState } from "react";
import { GripVertical, Pencil, Trash2 } from "lucide-react";
import { ContentBox } from "../../reference/musie_260915/components/ContentBox";
import { CtaButton } from "../../reference/musie_260915/components/CtaButton";
import { IconButton } from "../../reference/musie_260915/components/IconButton";
import type { DropMode, Sentence } from "../transcript/types";

type Props = {
  sentence: Sentence;
  position: number;
  /** Editing is only offered once recording has stopped. */
  editable: boolean;
  dragging: boolean;
  dropMode: DropMode | null;
  onSave: (text: string) => void;
  onDelete: () => void;
  handleProps: Record<string, unknown>;
  cardProps: Record<string, unknown>;
  registerRef: (element: HTMLElement | null) => void;
};

/**
 * One finalised statement, as a Content Box.
 *
 * The box's own `text` part is `on-surface-muted` — right for a description
 * under a headline, wrong here, where the statement *is* the content and the
 * headline is only its number. So the statement goes in the slot at full
 * `on-surface`, and the headline carries the position at `label-md`.
 *
 * The editor composes on Field's PARTS (`.musy-field__*`) rather than using the
 * Field component. That is the system's own pattern, not a shortcut around it:
 * Voice Note does exactly this and says so — "composed on Field's parts (§7.16):
 * label, description and error are `.musy-field__*`. Only the control surface
 * is new." Here it is also the only option, because the released Field cannot
 * show existing text — see the note in README.
 */
export function MusieStatementCard({
  sentence, position, editable, dragging, dropMode,
  onSave, onDelete, handleProps, cardProps, registerRef,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(sentence.text);
  const fieldId = useId();

  /** Seeded on open rather than synced: a merge can rewrite the statement
   *  while the editor is closed, and the draft must not be stale when it
   *  reopens. */
  function startEditing() {
    setDraft(sentence.text);
    setEditing(true);
  }

  function save() {
    onSave(draft);
    setEditing(false);
  }

  function cancel() {
    setDraft(sentence.text);
    setEditing(false);
  }

  return (
    <ContentBox
      headline={`Statement ${position}`}
      headingLevel={3}
      headlineStep="label-md"
      className={[
        "musie-card",
        dragging && "musie-card--dragging",
        dropMode === "combine" && "musie-card--merge-target",
      ].filter(Boolean).join(" ")}
      // base-ui composition: the drag surface and the measurement ref go onto
      // the element the system already renders, not a wrapper around it.
      render={
        <article
          ref={registerRef}
          {...(editable && !editing ? cardProps : {})}
        />
      }
    >
      {editing ? (
        <>
          <div className="musy-field">
            <label className="musy-field__label" htmlFor={fieldId}>
              Statement {position}
            </label>
            <textarea
              id={fieldId}
              className="musy-field__control musy-field__control--textarea"
              rows={3}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              data-filled={draft ? "" : undefined}
            />
            <p className="musy-field__description">
              Saving re-runs the sentence-final hook with the corrected text.
            </p>
          </div>
          <div className="musie-card__actions">
            <CtaButton onClick={save} disabled={!draft.trim()}>
              Save
            </CtaButton>
            <CtaButton variant="ghost" onClick={cancel}>
              Cancel
            </CtaButton>
          </div>
        </>
      ) : (
        <p className="musie-card__text" data-type-step="body-md">
          {sentence.text}
        </p>
      )}

      {editable && !editing && (
        <div className="musie-card__actions">
          <IconButton
            glyph={GripVertical}
            label={`Drag statement ${position}`}
            className="musie-card__handle"
            {...handleProps}
          />
          <IconButton
            glyph={Pencil}
            label={`Edit statement ${position}`}
            data-no-drag=""
            onClick={startEditing}
          />
          <span className="musie-card__spacer" />
          <IconButton
            glyph={Trash2}
            label={`Delete statement ${position}`}
            data-no-drag=""
            onClick={onDelete}
          />
        </div>
      )}
    </ContentBox>
  );
}

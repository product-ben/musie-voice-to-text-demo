import { useId, useState } from "react";
import { ChevronDown, GripVertical, Pencil, Trash2 } from "lucide-react";
import { ContentBox } from "../../reference/musie260917/components/ContentBox";
import { CtaButton } from "../../reference/musie260917/components/CtaButton";
import { IconButton } from "../../reference/musie260917/components/IconButton";
import type { DropMode, Sentence } from "../transcript/types";

type Props = {
  sentence: Sentence;
  position: number;
  /** Editing is only offered once recording has stopped. */
  editable: boolean;
  dragging: boolean;
  dropMode: DropMode | null;
  /** Only one card's actions are open at a time, so the list stays scannable. */
  menuOpen: boolean;
  onToggleMenu: () => void;
  /** 24px on a cursor, 44px on a finger. See useCoarsePointer. */
  toolSize: "min" | "primary";
  onSave: (text: string) => void;
  onDelete: () => void;
  handleProps: Record<string, unknown>;
  cardProps: Record<string, unknown>;
  registerRef: (element: HTMLElement | null) => void;
};

/**
 * One finalised statement, as a Content Box.
 *
 * The heading is still rendered — it is what puts the box in the document
 * outline, which is the documented reason Content Box is an `<article>` at all
 * — but it is hidden visually, so the card shows the statement and nothing
 * else. See musie.css for why that takes a rule rather than a prop.
 *
 * The two always-visible controls float to the end of the statement's first
 * line, so a short statement makes a short card and a long one still wraps
 * underneath them at full width. A float only works from the front of the
 * flow, which is why they come before the text in the DOM. Edit and Delete are
 * disclosed by the chevron, wired the way base-ui wires a disclosure:
 * `aria-expanded` on the trigger, `aria-controls` pointing at what it opens.
 *
 * The editor composes on Field's PARTS (`.musy-field__*`) rather than using the
 * Field component. That is the system's own pattern, stated in Voice Note —
 * "composed on Field's parts (§7.16) … only the control surface is new" — and
 * here it is also the only option, because the released Field cannot show
 * existing text. See README.
 */
export function MusieStatementCard({
  sentence, position, editable, dragging, dropMode, menuOpen, onToggleMenu,
  toolSize, onSave, onDelete, handleProps, cardProps, registerRef,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(sentence.text);
  const reactId = useId();
  const menuId = `musie-menu-${reactId}`;
  const fieldId = `musie-field-${reactId}`;

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

  function discard() {
    setDraft(sentence.text);
    setEditing(false);
  }

  /** Primary only once there is something to save — otherwise Save and Discard
   *  are the same weight, because at that point they do the same thing. */
  const edited = draft.trim() !== sentence.text && draft.trim() !== "";

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
      render={<article ref={registerRef} {...(editable && !editing ? cardProps : {})} />}
    >
      <div className="musie-card__row">
        {editable && !editing && (
          <div className="musie-card__tools" data-size={toolSize}>
            <IconButton
              glyph={GripVertical}
              label={`Drag statement ${position}`}
              variant="ghost"
              size={toolSize}
              className="musie-card__handle"
              {...handleProps}
            />
            <IconButton
              glyph={ChevronDown}
              label={menuOpen ? `Hide actions for statement ${position}`
                              : `Show actions for statement ${position}`}
              variant="ghost"
              size={toolSize}
              className="musie-card__chevron"
              aria-expanded={menuOpen}
              aria-controls={menuOpen ? menuId : undefined}
              data-no-drag=""
              onClick={onToggleMenu}
            />
          </div>
        )}
        {editing ? (
          <div className="musie-card__editor">
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
              <CtaButton
                variant={edited ? "primary" : "secondary"}
                disabled={!edited}
                onClick={save}
              >
                Save
              </CtaButton>
              <CtaButton variant="secondary" onClick={discard}>
                Discard
              </CtaButton>
            </div>
          </div>
        ) : (
          /* A plain block, deliberately: a flex or grid container establishes
             its own formatting context and would step around the float instead
             of wrapping its lines beside it. */
          <p className="musie-card__text" data-type-step="body-md">
            {sentence.text}
          </p>
        )}
      </div>

      {editable && !editing && menuOpen && (
        // Right-aligned under the chevron that opened them, with Edit
        // outermost. Delete leads in the DOM so the tab order matches what is
        // on screen rather than contradicting it.
        <div className="musie-card__actions musie-card__actions--end" id={menuId}>
          <CtaButton variant="ghost" leadingIcon={Trash2} data-no-drag="" onClick={onDelete}>
            Delete
          </CtaButton>
          <CtaButton variant="ghost" leadingIcon={Pencil} data-no-drag="" onClick={startEditing}>
            Edit
          </CtaButton>
        </div>
      )}
    </ContentBox>
  );
}

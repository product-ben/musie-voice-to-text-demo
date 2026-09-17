import { useId, useState } from "react";
import { ChevronDown, GripVertical, Pencil, Trash2 } from "lucide-react";
import { ContentBox } from "../../reference/musie260917/components/ContentBox";
import { CtaButton } from "../../reference/musie260917/components/CtaButton";
import { IconButton } from "../../reference/musie260917/components/IconButton";
import type { DropMode, Sentence } from "../transcript/types";

/**
 * §10.8's dense-list exception: a statement short enough to scan sits at
 * body-sm; anything longer goes back to the §4 floor, so a long statement is
 * never small. Counted in characters because that is the test an agent can
 * apply without rendering anything.
 */
const SCANNABLE_CHARS = 80;
export const statementStep = (text: string) =>
  text.length <= SCANNABLE_CHARS ? "body-sm" : "body-md";

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
      {/* §10.4: the text leads in the DOM and floats a spacer the size of the
          control cluster; the controls sit absolutely in the gap it leaves.
          Same picture as floating the controls themselves, but a screen reader
          meets the statement before the buttons that act on it. data-size is
          here as well as on the tools, because the row is what sizes the
          spacer. */}
      <div className="musie-card__row" data-size={toolSize}>
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
            {/* §10.6: right-aligned with Save outermost — the page is
                thumb-first, and on a phone the right edge is where a
                right-handed thumb lands. Discard leads in the DOM so the tab
                order matches the screen. */}
            <div className="musie-card__actions musie-card__actions--end">
              <CtaButton variant="secondary" onClick={discard}>
                Discard
              </CtaButton>
              <CtaButton
                variant={edited ? "primary" : "secondary"}
                disabled={!edited}
                onClick={save}
              >
                Save
              </CtaButton>
            </div>
          </div>
        ) : (
          /* A plain block, deliberately: a flex or grid container establishes
             its own formatting context and would step around the spacer
             instead of wrapping its lines beside it. */
          <p className="musie-card__text" data-type-step={statementStep(sentence.text)}>
            {sentence.text}
          </p>
        )}

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
      </div>

      {editable && !editing && menuOpen && (
        // §10.6 again: Edit outermost, Delete leading in the DOM.
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

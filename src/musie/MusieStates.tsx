import { useState } from "react";
import { ContentBox } from "../../reference/musie260917/components/ContentBox";
import { Message } from "../../reference/musie260917/components/Message";
import { RecordButton } from "../../reference/musie260917/components/RecordButton";
import { MusieStatementCard } from "./MusieStatementCard";
import { MusieToast } from "./MusieToast";
import type { Sentence } from "../transcript/types";

const noop = () => {};
const inert = { handleProps: {}, cardProps: {}, registerRef: noop, onSave: noop, onDelete: noop };

const SHORT = "Drittens, das Wetter ist gut.";
const LONG =
  "Achtens, und das ist jetzt ein deutlich längerer Satz, damit man sieht wie der " +
  "Text um die Bedienelemente herum umbricht und darunter weiterläuft.";

const item = (text: string, id = "s"): Sentence => ({
  id, text, language: "de", createdAt: "2026-09-17T09:00:00.000Z",
});

/**
 * Every state the draggable list and its items can be in, rendered rather than
 * described. The counterpart to handoff/13-draggable-list.md — that file names
 * the states, this page shows them, and both come from the same component.
 *
 * Nothing here is mocked: MusieStatementCard is the shipped component, given
 * props. Only the drag gesture is simulated, because a screenshot cannot hold
 * a finger down.
 */
export function MusieStates() {
  return (
    <div className="musie-group">
      <Group
        title="List states"
        note="What the container shows before, during and after capture. The empty and the in-flight state are the same dashed Content Box, so the page does not change shape when content starts arriving."
      >
        <State name="Empty" trigger="No items, nothing in flight">
          <ContentBox
            outline="dashed"
            headline="Nothing captured yet"
            headingLevel={3}
            text="Finished statements will appear here, one box each, in the order you said them."
          />
        </State>

        <State name="Waiting" trigger="Speech heard, no words back yet">
          <ContentBox outline="dashed" headline="Listening" headingLevel={3} headlineStep="label-md">
            <span className="musie-dots" aria-label="Waiting for words">
              <span /><span /><span />
            </span>
          </ContentBox>
        </State>

        <State name="Hearing" trigger="Partial text arriving, not yet final">
          <ContentBox outline="dashed" headline="Hearing you" headingLevel={3} headlineStep="label-md">
            <p className="musie-card__text" data-type-step="body-sm">Ich rede gerade noch</p>
          </ContentBox>
        </State>

        <State name="Populated, read-only" trigger="While recording — no controls on any item">
          <ol className="musie-transcript">
            <li><MusieStatementCard {...inert} sentence={item(SHORT, "a")} position={1}
              editable={false} dragging={false} dropMode={null} menuOpen={false}
              onToggleMenu={noop} toolSize="primary" /></li>
            <li><MusieStatementCard {...inert} sentence={item("Viertens, ich gehe gleich raus.", "b")} position={2}
              editable={false} dragging={false} dropMode={null} menuOpen={false}
              onToggleMenu={noop} toolSize="primary" /></li>
          </ol>
        </State>

        <State name="Populated, editable" trigger="Recording stopped — controls appear">
          <ol className="musie-transcript">
            <li><MusieStatementCard {...inert} sentence={item(SHORT, "c")} position={1}
              editable dragging={false} dropMode={null} menuOpen={false}
              onToggleMenu={noop} toolSize="primary" /></li>
            <li><MusieStatementCard {...inert} sentence={item("Viertens, ich gehe gleich raus.", "d")} position={2}
              editable dragging={false} dropMode={null} menuOpen={false}
              onToggleMenu={noop} toolSize="primary" /></li>
          </ol>
        </State>
      </Group>

      <Group
        title="Item states"
        note="Every state one row can be in. All of them are props on the shipped component — nothing here is a variant that only exists on this page."
      >
        <State name="Rest" trigger="editable, nothing open">
          <Card id="r" />
        </State>

        <State name="Actions open" trigger="menuOpen — one item at a time, chevron rotates">
          <Card id="o" menuOpen />
        </State>

        <State name="Editing, clean" trigger="Edit pressed. Save is secondary and disabled: there is nothing to save yet">
          <EditingCard />
        </State>

        <State name="Editing, dirty" trigger="Text changed. Save turns primary — weight carries state, not position">
          <EditingCard dirty />
        </State>

        <State name="Dragging" trigger="Lifted. It stays in place at 40% so the list never reflows and the measured positions stay valid">
          <Card id="g" dragging />
        </State>

        <State name="Merge target" trigger="Another item is over its middle half — accent-2 subtle fill, -border boundary">
          <Card id="m" dropMode="combine" />
        </State>

        <State name="Drop before" trigger="Over its top quarter — the indicator absorbs the list gap on its outer side">
          <>
            <div className="musie-drop" />
            <Card id="db" />
          </>
        </State>

        <State name="Drop after" trigger="Over its bottom quarter">
          <>
            <Card id="da" />
            <div className="musie-drop" />
          </>
        </State>
      </Group>

      <Group
        title="Responsive and content states"
        note="Two things change with something other than interaction: the pointer, and how much there is to read."
      >
        <State name="Fine pointer" trigger='toolSize="min" — 24px controls'>
          <Card id="f" toolSize="min" />
        </State>
        <State name="Coarse pointer" trigger='toolSize="primary" — 44px controls'>
          <Card id="p" toolSize="primary" />
        </State>
        <State name="Short item" trigger="80 characters or fewer — body-sm">
          <Card id="s1" />
        </State>
        <State name="Long item" trigger="Over 80 characters — back to the body-md floor, and the text wraps around the controls then runs full width">
          <Card id="l1" text={LONG} />
        </State>
      </Group>

      <Group
        title="Capture and feedback states"
        note="The control that fills the list, and what the list says when something goes wrong or can be undone."
      >
        <State name="Ready" trigger="Hugs its label, right-aligned to its parent">
          <div className="musie-stack">
            <RecordButton state="ready" className="musie-record" readyLabel="Record now" />
          </div>
        </State>
        <State name="Recording" trigger="Takes the column. Glyph, label, meter and readout all change">
          <div className="musie-stack">
            <RecordButton
              state="recording" className="musie-record" elapsed={12}
              levels={[0.2, 0.5, 0.8, 0.6, 0.3, 0.7, 0.9, 0.4, 0.2, 0.6, 0.8, 0.5]}
              recordingLabel="Recording"
            />
          </div>
        </State>
        <State name="Undo offered" trigger="After a destructive change. One at a time, and it replaces">
          <div className="musie-states__toast">
            <MusieToast label="Statement deleted" onAction={noop} onDismiss={noop} />
          </div>
        </State>
        <State name="Recoverable problem" trigger="Message, inline, live=polite">
          <Message
            variant="warning" live="off"
            headline="One statement was skipped"
            text="Rate limit reached — this statement was skipped. Recording continued."
          />
        </State>
        <State name="Fatal problem" trigger="Message, inline, live=assertive">
          <Message
            variant="error" live="off"
            headline="Recording stopped"
            text="No credits remaining on the account, so nothing can be transcribed."
          />
        </State>
      </Group>
    </div>
  );
}

function Group({ title, note, children }: { title: string; note: string; children: React.ReactNode }) {
  return (
    <section className="musie-stack">
      <div className="musie-intro">
        <h2 className="musie-page__title" data-type-step="heading-md">{title}</h2>
        <p className="musie-note" data-type-step="body-sm">{note}</p>
      </div>
      <div className="musie-states">{children}</div>
    </section>
  );
}

function State({ name, trigger, children }: { name: string; trigger: string; children: React.ReactNode }) {
  return (
    <div className="musie-states__item">
      <p className="musie-note" data-type-step="body-sm">
        <strong className="musie-states__name">{name}</strong> — {trigger}
      </p>
      {children}
    </div>
  );
}

function Card({
  id, text = SHORT, menuOpen = false, dragging = false, dropMode = null, toolSize = "primary",
}: {
  id: string; text?: string; menuOpen?: boolean; dragging?: boolean;
  dropMode?: "before" | "after" | "combine" | null; toolSize?: "min" | "primary";
}) {
  return (
    <MusieStatementCard
      {...inert}
      sentence={item(text, id)}
      position={1}
      editable
      dragging={dragging}
      dropMode={dropMode}
      menuOpen={menuOpen}
      onToggleMenu={noop}
      toolSize={toolSize}
    />
  );
}

/** The editor is internal state, so it is driven the way a user drives it. */
function EditingCard({ dirty = false }: { dirty?: boolean }) {
  const [node] = useState(() => Math.random().toString(36).slice(2));
  return (
    <div ref={(el) => openEditor(el, dirty)} key={node}>
      <MusieStatementCard
        {...inert}
        sentence={item(SHORT, `e-${node}`)}
        position={1}
        editable
        dragging={false}
        dropMode={null}
        menuOpen
        onToggleMenu={noop}
        toolSize="primary"
      />
    </div>
  );
}

/**
 * Presses Edit, and types into the field for the dirty variant. Reaching into
 * the DOM is the honest way to show internal state: the alternative is a second
 * copy of the card with the editor hard-coded, which would then drift from the
 * real one.
 */
function openEditor(host: HTMLDivElement | null, dirty: boolean) {
  if (!host || host.dataset.opened) return;
  host.dataset.opened = "1";
  queueMicrotask(() => {
    const edit = [...host.querySelectorAll("button")].find((b) => /Edit/.test(b.textContent ?? ""));
    edit?.click();
    if (!dirty) return;
    queueMicrotask(() => {
      const field = host.querySelector("textarea");
      if (!field) return;
      const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
      setter?.call(field, "Drittens, das Wetter ist wirklich gut.");
      field.dispatchEvent(new Event("input", { bubbles: true }));
    });
  });
}

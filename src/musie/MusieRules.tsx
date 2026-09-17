import { useId, useState } from "react";
import { ChevronDown, GripVertical, Pencil, Trash2 } from "lucide-react";
import { ContentBox } from "../../reference/musie260917/components/ContentBox";
import { CtaButton } from "../../reference/musie260917/components/CtaButton";
import { IconButton } from "../../reference/musie260917/components/IconButton";
import { RecordButton } from "../../reference/musie260917/components/RecordButton";
import { Message } from "../../reference/musie260917/components/Message";

const SHORT = "Drittens, das Wetter ist gut.";
const LONG =
  "Achtens, und das ist jetzt ein deutlich längerer Satz, damit man sieht wie " +
  "der Text um die Bedienelemente herum umbricht und darunter weiterläuft.";

/**
 * The open questions from docs/10-layout-rules.md and 11-additional-components,
 * each as a side-by-side you can look at rather than a paragraph you have to
 * imagine. Everything here is the released library — nothing is mocked.
 */
export function MusieRules() {
  return (
    <div className="musie-group">
      <Question
        id="Q3"
        title="How big are a card's controls under a cursor?"
        note="Ships as the left one on a cursor and the right one on a thumb. §5.4 reserves --target-min for inline controls in prose; at 24px it still clears SC 2.5.8, so outside prose this is comfort, not access."
      >
        <Side label='size="min" — 24px, what a desktop sees'>
          <DemoCard text={SHORT} toolSize="min" />
        </Side>
        <Side label='size="primary" — 44px, what a phone sees'>
          <DemoCard text={SHORT} toolSize="primary" />
        </Side>
      </Question>

      <Question
        id="Q8"
        title="Statement text: the §4 floor, or one step down?"
        note="You asked for body-sm; the answer taken was body-md, because §4 bars body-sm from essential prose. Both shown at the same width so the difference is only the step."
      >
        <Side label="body-md — 17px at 393, the §4 floor">
          <DemoCard text={LONG} toolSize="primary" step="body-md" />
        </Side>
        <Side label="body-sm — 15px at 393, barred from prose by §4">
          <DemoCard text={LONG} toolSize="primary" step="body-sm" />
        </Side>
      </Question>

      <Question
        id="Q2"
        title="Which button leads in the tab order?"
        note="Both rows look identical. Tab through each one: the left gives Delete first, matching the screen; the right gives Edit first, matching importance. Only one can be true at a time."
      >
        <Side label="Ships: DOM follows the screen — Delete, then Edit">
          <div className="musie-card__actions musie-card__actions--end">
            <CtaButton variant="ghost" leadingIcon={Trash2}>Delete</CtaButton>
            <CtaButton variant="ghost" leadingIcon={Pencil}>Edit</CtaButton>
          </div>
        </Side>
        <Side label="Alternative: DOM follows importance — Edit, then Delete">
          <div className="musie-card__actions musie-card__actions--end musie-rules__reversed">
            <CtaButton variant="ghost" leadingIcon={Pencil}>Edit</CtaButton>
            <CtaButton variant="ghost" leadingIcon={Trash2}>Delete</CtaButton>
          </div>
        </Side>
      </Question>

      <Question
        id="Q4"
        title="Which purple marks a drop target?"
        note="Both are the accent-2 family. Measured against this card: the solid is 2.01:1, the -border step is 4.25:1. 1.4.11 asks 3:1 of a meaningful graphic — but Layer 1's own comment on step 9 lists 'meaningful graphics' among its uses."
      >
        <Side label="Ships: -border (purple-edge) — 4.25:1">
          <div className="musie-rules__drop">
            <div className="musie-drop" />
          </div>
        </Side>
        <Side label="As asked: the solid (purple-9) — 2.01:1">
          <div className="musie-rules__drop">
            <div className="musie-drop musie-rules__drop--solid" />
          </div>
        </Side>
      </Question>

      <Question
        id="Q5"
        title="Does the record control change width with its state?"
        note="Ships as the left pair. §7.22 pins the ready state so the button cannot jump when it goes live; you asked for exactly that jump. The right pair is what the component does untouched."
      >
        <Side label="Ships: ready hugs, recording takes the column">
          <div className="musie-stack">
            <RecordButton state="ready" className="musie-record" readyLabel="Record now" />
            <RecordButton
              state="recording"
              className="musie-record"
              elapsed={2}
              levels={[0.2, 0.5, 0.8, 0.6, 0.3, 0.7, 0.9, 0.4, 0.2, 0.6, 0.8, 0.5]}
              recordingLabel="Recording"
            />
          </div>
        </Side>
        <Side label="§7.22 untouched: one width, both states">
          <div className="musie-stack">
            <RecordButton state="ready" readyLabel="Record now" />
            <RecordButton
              state="recording"
              elapsed={2}
              levels={[0.2, 0.5, 0.8, 0.6, 0.3, 0.7, 0.9, 0.4, 0.2, 0.6, 0.8, 0.5]}
              recordingLabel="Recording"
            />
          </div>
        </Side>
      </Question>

      <Question
        id="Q7"
        title="What gives when the record control runs out of room?"
        note="Both in the same phone-width column. The default copy overflows its own box and clips the readout, which §7.22 says must never be what gives — measured here at scrollWidth 341 against clientWidth 278. The shipped workaround is shorter copy."
      >
        <Side label='Ships: recordingLabel="Recording" — fits'>
          <div className="musie-rules__narrow">
            <RecordButton
              state="recording"
              block
              elapsed={2}
              levels={[0.2, 0.5, 0.8, 0.6, 0.3, 0.7, 0.9, 0.4, 0.2, 0.6, 0.8, 0.5]}
              recordingLabel="Recording"
            />
          </div>
        </Side>
        <Side label="Default copy — the readout clips at the right edge">
          <div className="musie-rules__narrow">
            <RecordButton
              state="recording"
              block
              elapsed={2}
              levels={[0.2, 0.5, 0.8, 0.6, 0.3, 0.7, 0.9, 0.4, 0.2, 0.6, 0.8, 0.5]}
            />
          </div>
        </Side>
      </Question>

      <Question
        id="Q1"
        title="Reading order on a card"
        note="The controls float, and a float only works from the front of the flow — so a screen reader meets them before the sentence they act on. Turn on VoiceOver and walk this card: heading, drag, chevron, then the text."
      >
        <Side label="Ships: floated controls, controls-first in the DOM">
          <DemoCard text={LONG} toolSize="primary" />
        </Side>
        <Side label="Alternative: text first, controls stacked — 154px instead of 104px">
          <DemoCard text={LONG} toolSize="primary" stacked />
        </Side>
      </Question>

      <Message
        variant="info"
        headline="Nothing on this page is mocked"
        text="Every control is the released component from musie260917, given props. The only additions are the two comparison wrappers, which are token-only."
      />
    </div>
  );
}

function Question({
  id, title, note, children,
}: { id: string; title: string; note: string; children: React.ReactNode }) {
  return (
    <section className="musie-stack">
      <div className="musie-intro">
        <h2 className="musie-page__title" data-type-step="heading-md">
          {id} · {title}
        </h2>
        <p className="musie-note" data-type-step="body-sm">{note}</p>
      </div>
      <div className="musie-rules__pair">{children}</div>
    </section>
  );
}

function Side({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="musie-rules__side">
      <p className="musie-note" data-type-step="body-sm">{label}</p>
      {children}
    </div>
  );
}

/** A statement card, reduced to the parts a comparison needs. */
function DemoCard({
  text, toolSize, step = "body-md", stacked = false,
}: {
  text: string;
  toolSize: "min" | "primary";
  step?: "body-md" | "body-sm";
  stacked?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const menuId = `rules-menu-${useId()}`;

  const tools = (
    <div className="musie-card__tools" data-size={toolSize}>
      <IconButton glyph={GripVertical} label="Drag statement" variant="ghost" size={toolSize} />
      <IconButton
        glyph={ChevronDown}
        label={open ? "Hide actions" : "Show actions"}
        variant="ghost"
        size={toolSize}
        className="musie-card__chevron"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((v) => !v)}
      />
    </div>
  );

  return (
    <ContentBox headline="Statement" headingLevel={3} headlineStep="label-md" className="musie-card">
      <div className={stacked ? "musie-rules__stacked" : "musie-card__row"}>
        {stacked ? (
          <>
            <p className="musie-card__text" data-type-step={step}>{text}</p>
            {tools}
          </>
        ) : (
          <>
            {tools}
            <p className="musie-card__text" data-type-step={step}>{text}</p>
          </>
        )}
      </div>
      {open && (
        <div className="musie-card__actions musie-card__actions--end" id={menuId}>
          <CtaButton variant="ghost" leadingIcon={Trash2}>Delete</CtaButton>
          <CtaButton variant="ghost" leadingIcon={Pencil}>Edit</CtaButton>
        </div>
      )}
    </ContentBox>
  );
}

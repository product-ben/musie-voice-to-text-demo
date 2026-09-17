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
        note="DECIDED: keep the split, and widen §5.4 so --target-min also covers card controls on a fine pointer. 24px clears SC 2.5.8, so outside prose this was a comfort rule, not an access one. See gaps §1."
      >
        <Side label='Decided: size="min" — 24px, what a cursor sees'>
          <DemoCard text={SHORT} toolSize="min" />
        </Side>
        <Side label='Decided: size="primary" — 44px, what a thumb sees'>
          <DemoCard text={SHORT} toolSize="primary" />
        </Side>
      </Question>

      <Question
        id="Q8"
        title="Statement text: the §4 floor, or one step down?"
        note="DECIDED: body-sm for an item of 80 characters or fewer, body-md above it — so a long item is never small, and the test is a character count rather than a judgement. Both cards below hold the same long text, so the left is what ships for it. See L8."
      >
        <Side label="146 characters → body-md. What ships for this text.">
          <DemoCard text={LONG} toolSize="primary" step="body-md" />
        </Side>
        <Side label="The same text at body-sm — what a short statement gets">
          <DemoCard text={LONG} toolSize="primary" step="body-sm" />
        </Side>
      </Question>

      <Question
        id="Q2"
        title="Which button leads in the tab order?"
        note="DECIDED: the left. DOM order always follows visual order, with no exception for destructive actions — the undo toast already makes Delete reversible for six seconds, which beats a confirm nobody reads. See L6."
      >
        <Side label="Decided: DOM follows the screen — Delete, then Edit">
          <div className="musie-card__actions musie-card__actions--end">
            <CtaButton variant="ghost" leadingIcon={Trash2}>Delete</CtaButton>
            <CtaButton variant="ghost" leadingIcon={Pencil}>Edit</CtaButton>
          </div>
        </Side>
        <Side label="Rejected: DOM follows importance — Edit, then Delete">
          <div className="musie-card__actions musie-card__actions--end musie-rules__reversed">
            <CtaButton variant="ghost" leadingIcon={Pencil}>Edit</CtaButton>
            <CtaButton variant="ghost" leadingIcon={Trash2}>Delete</CtaButton>
          </div>
        </Side>
      </Question>

      <Question
        id="Q4"
        title="Which purple marks a drop target?"
        note="DECIDED: the left ships, and Layer 1's step-9 comment is corrected rather than the colour — step 9 is a fill that carries its own -on foreground, never a graphic standing alone on a surface. Moving it would darken all four accent solids. See gaps §5."
      >
        <Side label="Decided: -border (purple-edge) — 4.25:1">
          <div className="musie-rules__drop">
            <div className="musie-drop" />
          </div>
        </Side>
        <Side label="Rejected: the solid (purple-9) — 2.01:1">
          <div className="musie-rules__drop">
            <div className="musie-drop musie-rules__drop--solid" />
          </div>
        </Side>
      </Question>

      <Question
        id="Q5"
        title="Does the record control change width with its state?"
        note="DECIDED: the left becomes the component's default — §7.22 drops the anti-jump floor rather than adding an opt-in. The right pair is what it does today. Combined with L6, a hugging primary CTA hugs the RIGHT edge. See gaps §4."
      >
        <Side label="Decided: ready hugs, recording takes the column">
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
        <Side label="§7.22 today: one width, both states">
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
        note="DECIDED: shorter default copy. recordingLabel defaults to 'Recording'. It moves the cliff rather than removing it — a long German string can still reach it, and then the label shrink allowance is the follow-up fix. See gaps §3."
      >
        <Side label='Decided: recordingLabel="Recording" — fits'>
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
        note="DECIDED: neither of the two originally offered. The text now leads in the DOM and floats a SPACER the size of the control cluster; the controls sit absolutely in the gap. Same picture, same card height, reading order correct. The left card below is that. See L4."
      >
        <Side label="Ships: text first in the DOM, controls positioned into a floated spacer">
          <DemoCard text={LONG} toolSize="primary" />
        </Side>
        <Side label="Rejected: controls stacked under the text — 154px instead of 97px">
          <DemoCard text={LONG} toolSize="primary" stacked />
        </Side>
      </Question>

      <Message
        variant="info"
        headline="Every question here is decided"
        text="The rules are in reference/musie260917/docs/10-layout.md, the new Toast in 11-toast.md, and the Layer 1 and Layer 2 changes they depend on in 12-component-gaps.md. Nothing on this page is mocked — every control is the released component, given props."
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

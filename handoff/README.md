# Handoff — Layer 3 into the Musy design system

Everything needed to take the decisions made while building the transcript
workspace and land them in `musie260917`. Self-contained: nothing outside this
folder is required to do the work, though two live pages are linked for
checking.

**Start with [`PROMPT.md`](PROMPT.md).** It is written to be pasted into Claude
Design with this folder attached, and it sets the order of work.

---

## What is in here

| File | What it is | What to do with it |
| --- | --- | --- |
| [`PROMPT.md`](PROMPT.md) | The brief for Claude Design | Paste it in |
| [`10-layout.md`](10-layout.md) | **Layer 3 — Layout.** Fifteen rules, L1–L15 | File at `docs/10-layout.md` |
| [`11-toast.md`](11-toast.md) | Toast, specified in §07's format | Becomes §7.23 of `07-components.md`, and `docs/11-toast.md` |
| [`12-component-gaps.md`](12-component-gaps.md) | Five decided changes to Layer 1 and Layer 2, each with the exact edit | Apply, then file at `docs/12-component-gaps.md` |
| [`13-draggable-list.md`](13-draggable-list.md) | **Draggable List**, specified in §07's format — twelve states, in a matrix | Becomes §7.24, and `docs/13-draggable-list.md` |
| [`14-reflect-step.md`](14-reflect-step.md) | How the interactive screen goes into the prototype's **Reflect** step, replacing the voice branch | Follow it when building step 4 |
| [`workspace/`](workspace) | The record · transcribe · edit screen as source, and the component inside it | Read `workspace/README.md` |
| [`toast/Toast.tsx`](toast/Toast.tsx) | Working component source, in the package's conventions | Drop into `components/`, add two exports to `index.ts` |
| [`toast/toast.css`](toast/toast.css) | The §23 stylesheet block | Append to `components/musy-components.css` after §22 |
| [`evidence.md`](evidence.md) | Every measurement the rules rest on, and how it was taken | Check anything that looks wrong |

---

## The short version

**A third layer.** Layer 1 says what a token is. Layer 2 says what a Content Box
is. Neither can say how far it sits from the next one, which edge its actions
hug, or what happens to it at 393px — and that is where two screens built from
the same components stop looking like one product. Layer 3 is that.

**Two facts drive most of it.** Mobile first — design and measure at 393px, in
that order. And thumb-first, right-handed — which is why a primary CTA is
right-aligned to its parent, and a Continue button always is.

**Two new components.** **Draggable List** is the one this was all built
around: a list the user reorders, merges, corrects and deletes in place. Twelve
states, three of them mutually exclusive in a way that is easy to get wrong by
hand — which is what makes it a component rather than a composition. And
**Toast**: the system says twice that it has no toast, yet Layer 1 ships
`--z-toast` ranked above `--z-sheet` with a written rationale. A layer with no
consumer.

**One integration.** `14-reflect-step.md` says how the screen becomes step 4 of
the prototype: the voice branch of Reflect stops capturing *audio* and starts
capturing *words* the user can see and fix. It names what moves in, what is demo
chrome and stays behind, and four things still to decide — starting with the
fact that a reflection is one answer and the list produces several statements.

**Five things to change in the system itself.** Two are documentation — §5.4's
wording and the palette's step-9 comment. Two are small component changes to
Record Button. One is a defect: `Field`'s controlled value never reaches
base-ui, so a pre-filled field renders empty.

---

## Where this came from

A voice-to-text demo, restyled entirely in Musy as one route of a plainly-styled
app:

- **The screen** — https://product-ben.github.io/musie-voice-to-text-demo/#/musie
- **Every state of the list**, from the same component —
  https://product-ben.github.io/musie-voice-to-text-demo/#/states
- **Each decision, as the side-by-side that settled it** —
  https://product-ben.github.io/musie-voice-to-text-demo/#/rules
- **The implementation** — `src/musie/` in that repo. `musie.css` is the working
  version of every rule in `10-layout.md`, with the reasoning in comments.

Everything on those pages is the released library given props. The only CSS
written for it is the arrangement between components, which is what became
Layer 3.

---

## Two caveats worth carrying across

1. **These rules come from one screen.** They are measured and they hold for a
   transcript workspace. A form, a media grid or a multi-step flow will find
   gaps, particularly in L2's gap ladder and L6's action-row rule. Land this as
   **version 1 of Layer 3**, not as settled law.
2. **`evidence.md` ends with what is *not* proven.** Read that section before
   relying on anything audio-related.

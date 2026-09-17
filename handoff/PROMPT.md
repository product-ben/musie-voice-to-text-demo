# Prompt for Claude Design

Paste everything below into Claude Design, with this folder attached.

---

You are updating the **Musy design system** (`musie260917`). A working screen was
built against it — a voice-to-text transcript workspace — and that exposed rules
the system does not yet state, one component it does not have, and five places
where Layer 1 or Layer 2 needs to change.

Every decision in this folder has already been made with the designer. **Nothing
here is a proposal to re-litigate.** Your job is to land it in the package
cleanly and consistently, in the package's own voice.

## What you are adding

**A third layer.** The system has been Layer 1 foundations and Layer 2
components. It now has **Layer 3 — Layout**: where components go on a screen,
which neither of the other two can answer. `10-layout.md` is that layer,
fifteen rules, L1–L15.

**One component.** Toast, as §7.23. `11-toast.md` is the spec in §07's format.
`toast/Toast.tsx` and `toast/toast.css` are working source, written in the
package's conventions, to drop in.

**Five decided changes to Layer 1 and Layer 2.** `12-component-gaps.md`, each
with the exact edit. Four are changes; one is a defect.

## Do it in this order

1. **Read `10-layout.md` first**, in full. Everything else refers to it, and its
   §L0 is the reasoning behind roughly half the other rules.
2. **Apply `12-component-gaps.md` §1 and §5** — the two documentation-only
   changes to Layer 1. These unblock rules L5 and L9, which currently read as
   deviations.
3. **Apply §2, §3, §4** — the Layer 2 changes: `ContentBox` gains
   `headlineHidden`, `RecordButton` gains a shorter default label and loses its
   anti-jump floor. Update the matching sections of `07-components.md`.
4. **Fix §6**, the `Field` defect. It type-errors under a strict `tsc`, which is
   how it was found, so a type-check is your test.
5. **Add Toast.** `components/Toast.tsx`, two exports in `components/index.ts`,
   the §23 block appended to `components/musy-components.css`, and §7.23 in
   `07-components.md` from `11-toast.md`.
6. **File the three Layer 3 docs** at `docs/10-layout.md`, `docs/11-toast.md`,
   `docs/12-component-gaps.md`, and add a Layer 3 section to `docs/README.md`.
7. **Log the deltas** in `02-deltas.md` and anything unresolved in
   `06-open-questions.md`, the way the package already does.

## Rules for how you work

- **Match the package's voice.** Every component file opens with a comment
  explaining what it is, which base-ui primitive it uses, and the decisions that
  are easy to get wrong. Every CSS section explains why, not what. Keep that.
- **Token-only.** No literal colour, space or motion value anywhere. The only
  bare numbers permitted are geometric identities (`0`, `50%`, `100%`) and
  unitless multipliers inside `calc()`.
- **Do not re-solve the palette.** `12-component-gaps.md` §5 is explicit that the
  *comment* is wrong and the colour stays. Moving step 9 would darken all four
  accent solids and invalidate the 94-pair audit.
- **Say when something does not fit.** If a rule in `10-layout.md` cannot be
  stated in the package's terms, or contradicts something in `01-foundations.md`
  or `03-conflict-report.md` that this folder missed, log it in
  `03-conflict-report.md` and raise it — do not quietly reconcile it.

## What "done" looks like

- `10-layout.md` is discoverable from `docs/README.md` as a peer of foundations
  and components, not as an appendix.
- `Toast` imports from `./components` and renders, and the §23 stylesheet block
  loads after §22.
- `tsc` passes with no errors in `components/`, which it does not today because
  of §6.
- Nothing in `10-layout.md` still describes itself as a deviation — items 2 to 4
  are what make that true.
- `04-contrast-audit.md` gains a note that its pairs cover foreground-on-fill and
  not solid-on-surface, which is the gap that let §5 through.

## Where to check your work

`evidence.md` has every measurement the rules rest on and how to reproduce it.
Two live pages:

- **The screen the rules came from** —
  https://product-ben.github.io/musie-voice-to-text-demo/#/musie
- **Each decision, as the side-by-side that settled it** —
  https://product-ben.github.io/musie-voice-to-text-demo/#/rules

## The one thing to be careful about

These rules are derived from **one screen**. They are measured and they hold for
a transcript workspace. A screen with a form, a media grid or a multi-step flow
will find gaps — particularly in L2's gap ladder and L6's action-row rule. Write
them into the package as **version 1 of Layer 3**, not as settled law, and leave
the door open in `06-open-questions.md`.

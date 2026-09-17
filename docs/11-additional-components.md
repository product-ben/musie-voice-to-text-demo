# 11 · Additional components — requests against `musie260917`

Patterns that a real screen needed and the library does not have, plus API gaps
found in components it does have. Written in §07's format so a decision can be
copied straight into the package.

Two are **components** (§11.1, §11.2). Three are **API gaps** on released
components (§11.4–11.6). One is a **defect** (§11.7).

---

## 11.1 Toast `[PROPOSED §7.23]`

**Purpose.** Confirm an action that has already happened, and offer the one way
to reverse it, without moving the content the user is looking at.

**Why it is not Message.** §7.11's own source says so: *"base-ui's Toast is a
different pattern (portaled, queued, auto-dismissing)"*. The difference is not
styling — a Message is part of the flow and pushes layout when it appears, which
is wrong for a confirmation that arrives while the user is reading something
else.

**Why it belongs in the system.** Layer 1 already ships `--z-toast`, ranked
*above* `--z-sheet`, with the stated reason that "a session saved confirmation
must be visible over an open sheet". That is a layer with no consumer in the
released set.

**Anatomy.**

```
div.musy-toast   [role=status] [aria-live=polite]
├── p.musy-toast__text        body-sm
├── CtaButton variant="ghost"          the single reversal
└── IconButton size="min" tooltip={false}   dismiss
```

**Props.**

| Prop | Type | Default |
|---|---|---|
| `label` | `string \| null` | — (null renders nothing) |
| `action` | `{ label: string; onAction: () => void }` | — |
| `onDismiss` | `() => void` | — |
| `live` | `'polite' \| 'off'` | `'polite'` |

**Placement and tokens.** `position: fixed`, `z-index: var(--z-toast)`,
`inset-block-end: var(--space-gap-group)`, centred with
`inset-inline: var(--space-gap-stack); margin-inline: auto; width: fit-content`,
capped at `--measure-heading`. `--space-inset-control` inside,
`--space-gap-stack` between its three parts, `--radius-card`,
`--surface-overlay` on `--elevation-3`, `--border-width-regular` of
`--border-subtle`.

**Elevation 3, not 2.** It outranks a sheet, so it must not read as a lifted
card sitting under one.

**`role="status"`, never `role="alert"`.** An undo offer is not urgent, and
assertive cuts across whatever the screen reader is already saying.

**Dismissal is the consumer's.** The component holds no timer. Whatever owns the
undo window already has one, and a second timer can only disagree with it —
the same split §7.19 and §7.22 make with the recorder.

**Entrance** from `--motion-duration-base` / `--motion-ease-entrance`, travelling
`--motion-travel-sm`, so reduced motion flattens it with no query in the
component.

**What it is NOT.** Not a Message (that is in-flow), not a dialog (one action,
never two), not a queue — see open question Q6.

---

## 11.2 Statement Card `[PATTERN, not a component]`

A Content Box carrying one piece of user content plus its own controls. Written
down because three screens would otherwise each invent it, but **proposed as a
documented composition rather than a component**: everything in it is already
released, and a component would only freeze one arrangement of props.

```
ContentBox headline="<identifier>" headingLevel={3} headlineStep="label-md"
└── div  display:flow-root                        §10.4
    ├── div.tools   float:inline-end               ← before the text, §10.4
    │   ├── IconButton GripVertical  ghost  size per pointer   §10.5
    │   └── IconButton ChevronDown   ghost  size per pointer
    │        aria-expanded · aria-controls
    └── p   body-md · user-select:none             §10.8, §10.9
└── div.actions--end  [id matches aria-controls]   §10.6
    ├── CtaButton ghost leadingIcon=Trash2  "Delete"
    └── CtaButton ghost leadingIcon=Pencil  "Edit"
```

Rules that travel with it: the headline is hidden but present (§10.8); only one
card's actions are open at a time; the whole card is a drag surface and the
handle starts a drag immediately while the card itself needs a hold on touch.

---

## 11.3 Code / data block `[PATTERN]`

Raw state shown for inspection. Neither prose nor a list, and Content List would
lose the shape that makes it worth showing. Token-only:
`--surface-sunken`, `--radius-card`, `--space-inset-card`, `--on-surface-muted`,
`--type-body-sm-*`, `overflow-x: auto`. Keys, strings and numbers take
`--accent-2-text`, `--accent-1-text`, `--accent-3-text`.

Not proposed as a component — it is a developer affordance, not product UI.

---

## 11.4 `ContentBox` — add `headlineHidden`

`headline` is required and renders the `<h3>` that puts the box in the document
outline. A card that shows its content alone needs the heading present and
invisible, and the component exposes neither a prop nor a className for that
part, so the only route is reproducing `.musy-sr-only`'s declarations in the
screen's own CSS — a literal copy of system CSS, which §10.13 otherwise forbids.

`Switch` already has exactly this API as `labelHidden`. Proposed:

```ts
/** Hide the headline visually. It stays in the outline and in the
 *  accessible name. */
headlineHidden?: boolean;
```

---

## 11.5 `Field` — controlled value does not work

`Field` passes `value`, `defaultValue` and `onValueChange` to base-ui's
`Field.Root`, which accepts none of them (checked against `@base-ui/react`
1.7.0, the version `package.json` declares). They land on a `<div>` and are
ignored, so **a pre-filled or controlled field renders empty**. It type-errors
under a strict `tsc`, which is how it was found.

The consequence downstream: any screen that edits existing text has to compose
on Field's *parts* (`.musy-field__*`) instead of using the component. That is a
sanctioned pattern — §7.19 Voice Note does it and says so — but here it is
forced, not chosen.

Fix is in `Field.tsx`: drive the value through `Field.Control`'s rendered
element rather than through `Field.Root`.

---

## 11.6 `IconButton` — no rung between 24px and 44px

§10.5 picks `min` under a cursor and `primary` under a thumb, because there is
nothing between them. A documented compact rung — or an explicit blessing of
`min` outside prose when the control sits in a card — would remove a per-screen
judgement call. See open question Q3.

---

## 11.7 `RecordButton` — the degradation order inverts below ~353px

§7.22 is explicit: the meter is the elastic part, and the readout must never be
what gives — *"the readout is the only thing a screen-reader user gets."*

Measured in a **310px column** with the default copy: the meter correctly
collapses to zero, and then the readout **overflows the content box by 44px and
clips** — `scrollWidth` 329 against `clientWidth` 308. `.musy-btn__label` is
`flex: 0 0 auto` and the meter is already at zero, so the remaining deficit has
nowhere to go.

§7.22 reports measuring at 340px; the shortfall starts just above that, and a
390px viewport minus an app gutter and a card inset lands at 310px, which is an
ordinary phone column rather than an edge case.

Worked around by the consumer with `recordingLabel="Recording"` —
`scrollWidth` 308 in the same column, 27px of meter still showing. A fix in the
component would be either a shrink allowance on the label before the readout, or
an ellipsis that engages while the meter is at zero rather than after. See open
question Q7.

# 10 · Layout rules — Layer 3

Written for `musie260917`. Layer 1 is tokens, Layer 2 is components; this is the
layer between them — **how released components are arranged on a screen**, which
is the part no component library can ship for you.

Every rule below was derived from building one real screen (the transcript
workspace) against this system, and every number is a Layer 1 token. Nothing
here amends Layer 1 or Layer 2. Where a rule *deviates* from a documented
component intent, it says so and gives the measurement that forced it.

**The one rule that outranks the rest.** Do not recreate a component. If the
system has one, import it and pass props. A custom pattern is permitted only
where the system has none (§10.13), and then it is token-only.

---

## 10.1 · Page skeleton

A screen's root element carries five things and nothing else:

```css
.page {
  isolation: isolate;                 /* base-ui portals clear local z-index */
  background-color: var(--surface);
  color: var(--on-surface);
  font-family: var(--font-text);
  padding: var(--space-inset-card);
  border-radius: var(--radius-panel);
}
```

Plus `data-theme` on that same element rather than on `<html>` when the screen
is one route inside a larger app. Foundations §12 declares every token on
`:root, [data-theme]` precisely so a nested subtree recomputes `light-dark()`;
scoping it there keeps `color-scheme: dark` off pages that are not ours. Use the
package's `musy-theme` storage key either way — one mechanism, narrower scope.

`body { position: relative }` and one `<MusyTooltipProvider>` near the root are
the app-shell requirements the package already documents. They are the app's,
not the screen's.

---

## 10.2 · The gap ladder

This is the rule the whole layer hangs on. Foundations §5 names a token for each
relationship; **use the name, not the number**, and never pick a gap by eye.

| Between | Token | px |
| --- | --- | --- |
| An icon and its own label | `--space-gap-inline` | 8 |
| Atoms that belong together — a label and its field, a title and its subtitle | `--space-gap-related` | 12 |
| Controls inside one molecule, and the content they act on | `--space-gap-stack` | 16 |
| Molecules that do **not** belong together | `--space-gap-group` | 32 |
| Page-level sections | `--space-section` / `--space-section-lg` | 48 / 96 ≥ `--bp-lg` |

**The doubling check, and it is a check, not a guideline.** Foundations §5:
*"the gap between two groups is always at least double the largest gap inside
either group."* After laying a screen out, read the gaps off the computed styles
and verify it. On the reference screen: three regions at 32px, each containing
16px — exactly double. If the check fails, the grouping is ambiguous and the fix
is a divider or a shared surface, never a bigger gap.

Three primitives cover almost every arrangement. Give them these names so a
screen reads the same everywhere:

```css
.stack { display: flex; flex-direction: column; gap: var(--space-gap-stack); }
.group { display: flex; flex-direction: column; gap: var(--space-gap-group); }
.row   { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-gap-stack); }
```

`--space-section-lg` needs a media query, and CSS cannot take a token there.
Write the literal and name the token in a comment, which is the convention
`musy-components.css` already uses:

```css
/* --space-section-lg above --bp-lg. */
@media (min-width: 1024px) { .page { gap: var(--space-section-lg); } }
```

---

## 10.3 · A list of things is a list

A run of repeated items is `<ol>` or `<ul>` with `list-style: none`, not a stack
of divs. The count and the position reach assistive tech instead of being drawn.
Items sit at `--space-gap-stack`, because a list is one molecule.

---

## 10.4 · Card anatomy — content first, controls floated

A card that carries both text and its own controls puts the controls in a
**float**, not in a flex column or a flex row beside the text.

```css
.card__row   { display: flow-root; }              /* contains the float */
.card__tools { float: inline-end;
               margin-inline-start: var(--space-gap-stack);
               display: flex; align-items: flex-start;
               gap: var(--space-gap-stack); }
```

Why, with the measurements that decided it — a statement card at a 390px
viewport, measured three ways:

| Card | Controls stacked | Controls in a flex row | Controls floated |
| --- | --- | --- | --- |
| One or two lines of text | 154px | 104px | **104px** |
| Six lines of text | ~184px | 322px | **213px** |

Stacked, the control column sets the height and every card is the same height
whatever it says. A flex row fixes that but takes the same bite out of *every*
line, so a long text is squeezed into a narrow column and grows tall again.
Floated, only the lines beside the controls are narrowed and the rest run full
width — measured line widths for a six-line statement:
`140 · 135 · 229 · 201 · 223 · 239px`.

**Two consequences you must carry.**

1. **The text must be a plain block.** A flex or grid container establishes its
   own formatting context and steps *around* a float instead of wrapping beside
   it. This is silent — the layout simply reverts to the flex-row measurements —
   so if a float looks like it is not working, look for a `display: flex` on the
   text's wrapper first.
2. **The controls come before the text in the DOM**, because a float only works
   from the front of the flow. Every floated control must therefore carry an
   accessible name that identifies what it acts on ("Drag statement 3"), and the
   card's heading (§10.8) must precede both. See open question Q1.

---

## 10.5 · Control size follows the pointer

`--target-min` (24px) is legible and comfortable under a cursor and tight under
a thumb. Foundations §5.4 reserves it for "inline controls inside prose only";
at 24px a control still clears WCAG 2.2 SC 2.5.8, so outside prose this is a
comfort call rather than an accessibility one.

**The rule: pick the rung from the pointer, through the component's own `size`
prop.** Never override `--musy-icon-btn-size`.

```tsx
const size = useCoarsePointer() ? "primary" : "min";   // 44px : 24px
<IconButton glyph={GripVertical} label="…" variant="ghost" size={size} />
```

**And never add a gap to a row of `min` buttons.** The system already gives
`.musy-icon-btn--min` a margin of `--sp-2` on every side for 2.5.8, and two of
those margins meet at exactly `--space-gap-stack` on either axis. A gap on top
doubles it:

```css
.card__tools[data-size="min"] { gap: 0; }
```

---

## 10.6 · Action rows are right-aligned, likely action outermost

The product is thumb-first and right-handed thumbs are the majority, so the
action a user most likely wants sits at the **right edge**, where the thumb
already is.

```css
.actions       { display: flex; flex-wrap: wrap; align-items: center;
                 gap: var(--space-gap-inline); }
.actions--end  { justify-content: flex-end; }
```

| Row | Visual order | Outermost |
| --- | --- | --- |
| Disclosed card actions | Delete · Edit | Edit |
| Editor | Discard · Save | Save |

The gap is `--space-gap-inline`, not `--space-gap-stack`: two buttons that are
alternatives to each other read as one control pair.

**DOM order follows visual order, not importance.** The other button leads in
the markup so tab order matches the screen rather than contradicting it. That
puts a destructive action first in the tab order — see open question Q2.

**Weight carries state, not position.** Save is `secondary` and disabled until
there is a change to save, then `primary`. Discard is `secondary` throughout:
when there is nothing to save, the two buttons do the same thing and should look
alike.

---

## 10.7 · Width can be a state cue

A control whose state changes what it contains may change width with it, and the
change is legitimate feedback rather than a jump to be suppressed. The record
control hugs its label when ready (179×46 at 390px) and takes the column while
recording (310×46).

No transition on that change. `fit-content` does not interpolate to a stretched
width, so a width animation either does not run or snaps at the end — and when
the glyph, the label and the contents all change on the same click, an instant
change is the consistent one.

This deviates from §7.22, which pins the ready state at
`min-inline-size: min(18ch, 100%)` so the button "does not jump wider the moment
it goes live". Where the jump is wanted, release the floor on the ready state
only and leave everything else the component sets alone. See open question Q5.

---

## 10.8 · Type: content at the floor, metadata below it

Foundations §4 sets a hard floor — 17px at the 393px reference — and bars
`body-sm` and `label-md` from essential prose. Applied:

| Role | Step |
| --- | --- |
| The thing the screen is about (a statement, an instruction, an answer) | `body-md` — never smaller |
| Captions, helper lines, counts, timestamps | `body-sm` |
| A card's own heading, when it is only an identifier | `label-md` |
| Screen title | `heading-lg` |

**A card heading may be invisible but must exist.** Content Box renders its
headline as the `<h3>` that puts the box in the document outline — the
documented reason it is an `<article>`. When the card shows its content alone,
hide the heading with `.musy-sr-only`'s declarations rather than removing it.
Content Box has no `headlineHidden` prop today; `Switch` has exactly this as
`labelHidden`. Requested in [11 · Additional components](11-additional-components.md).

---

## 10.9 · Drag and drop

| Part | Treatment |
| --- | --- |
| Drop indicator, between two items | `--border-width-thick` tall, `--radius-full`, filled with an accent family's **`-border`** step |
| Merge target, on the item itself | that family's `-subtle` fill with its `-border` border |
| The dragged item | stays in place at `opacity: 0.4`, so the list never reflows and the positions measured at drag start stay valid |
| The thing under the finger | a copy at `--z-tooltip`, `--elevation-2`, `--surface-overlay`, capped at `--measure-heading` |
| Any drag surface | `user-select: none` — a marquee starting under the finger beats the gesture to it |
| A drag handle | `touch-action: none`, `cursor: grab` / `grabbing` |

**Use the `-border` step, not the solid.** A drop indicator is a meaningful
graphic and 1.4.11 wants 3:1. Measured: `--interactive-accent-placeholder2`
(`purple-9`, #CCA6C7) gives **1.85:1 against the page and 2.01:1 against a
card**; the same family's `-border` (`purple-edge`) gives **3.90:1 / 4.25:1**.
Layer 1's own comment on step 9 lists "meaningful graphics" among its uses — see
open question Q4.

**An indicator between two items absorbs the list's gap on its outer side**, or
it reads as belonging to the item it is nested in:

```css
.drop { margin-block: var(--sp-1); }
.drop:first-child { margin-block-start: calc(var(--sp-1) - var(--space-gap-stack)); }
.drop:last-child  { margin-block-end:   calc(var(--sp-1) - var(--space-gap-stack)); }
```

---

## 10.10 · Waiting, provisional, and empty

`ContentBox outline="dashed"` is the system's own reading of *provisional /
awaiting content* (token gap G2). Use it for both the empty state and the
in-flight one — same box, so the screen does not change shape when content
starts arriving.

A box waiting for content that has not arrived shows three dots at
`--on-surface-muted`, `--sp-2` across, `--space-gap-inline` apart. Under
`prefers-reduced-motion` the pulse is **dropped entirely, not shortened**: Layer
1 collapses every duration to 1ms, which on a loop strobes. That is the call
§7.19 already makes for its recording dot, and it generalises — *any continuous
animation is removed under reduced motion rather than sped up.*

---

## 10.11 · Feedback: where it goes

| Kind | Component | Live region |
| --- | --- | --- |
| A fatal problem, injected after load | `Message variant="error"` inline, where it happened | `live="assertive"` |
| A recoverable problem | `Message variant="warning"` inline | `live="polite"` |
| Context present on load | `Message variant="info"` inline | `live="off"` (the default) |
| A completed action that can be undone | **Toast** (§11.1), `--z-toast`, bottom-centre | `role="status"` |
| Why something stopped | `Badge` beside the control it explains | — |

**Explain only what needs explaining.** A user-initiated stop needs no badge; a
timeout, a cut-off or an error does. Confirming what someone just did themselves
trains them to ignore the channel.

---

## 10.12 · Motion

Take duration and easing from tokens and never write a literal, so
`prefers-reduced-motion` is handled by Layer 1 with no component query:

```css
animation: fade-in var(--motion-duration-base) var(--motion-ease-entrance);
/* travel from --motion-travel-sm, which Layer 1 collapses to 0 */
```

One exception, stated in §10.10: a **looping** animation is removed rather than
shortened.

---

## 10.13 · Custom patterns

Permitted only where the system has no component — a code block, a level meter,
a drop indicator. Then:

1. Every declaration resolves to a Layer 1 token or to arithmetic over one. The
   only bare numbers allowed are geometric identities (`0`, `50%`, `100%`) and
   unitless multipliers inside `calc()`.
2. Naming is `.<product>-<block>[__<part>][--<variant>]`, using a prefix that is
   **not** `musy-`, so a screen file can never be mistaken for a system file.
3. A pattern that recurs is a component request, not a second copy. Log it in
   [11 · Additional components](11-additional-components.md).

---

## 10.14 · Verify by measurement

Layout claims are checked against a rendered page at **390px and 1280px**, not
argued from the source. The checks that have caught real defects here:

- computed `gap` on every container, against the §10.2 ladder;
- `scrollWidth` vs `clientWidth` on any control with three or more parts;
- contrast of any indicator against **every** surface it can land on, not just
  one;
- `getBoundingClientRect()` on touch targets, against `--target-*`;
- for a float, the width of each individual line — a float that is not working
  looks identical to one that is, at the container level.

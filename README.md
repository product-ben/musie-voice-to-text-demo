# Musie — Live Speech to Text (proof of concept)

Press **Start**, speak for up to a minute in German or English, and watch the text
appear live. Each time you pause, the current sentence is finalised and handed to a
single extension point — `onSentenceFinal()` — where later logic will be plugged in.

Static site, no backend. It runs on GitHub Pages and talks to the OpenAI Realtime
API directly from the browser.

---

## Quick start

```bash
npm install
npm run dev
```

Open the printed URL, paste an OpenAI API key, pick a language, press Start.

| Command | What it does |
| --- | --- |
| `npm run dev` | Local dev server with hot reload |
| `npm run build` | Type-check and build into `dist/` |
| `npm run preview` | Serve the built bundle locally |
| `npm run typecheck` | TypeScript only |
| `npm run lint` | ESLint |

---

## Security: read this before using a key

**This demo sends your API key from the browser.** That is unavoidable without a
server, and it is the trade-off the project deliberately accepts.

A browser `WebSocket` cannot set an `Authorization` header, so the OpenAI Realtime
API accepts the key through a WebSocket *subprotocol* instead — literally named
`openai-insecure-api-key`. The warning is in the name: anyone who can open the page
and read its network traffic can read the key.

What this project does about it:

- The key is typed in at runtime. It is **never** in the repository, the build, or an
  environment variable.
- It is held in `sessionStorage`, so it disappears when the tab closes. Never
  `localStorage`.
- There is a **Forget key** button.
- `.gitignore` blocks `.env*` as a safety net, though the app uses no env vars.

What **you** should do about it:

1. Use a dedicated key with a **low spending limit**.
2. **Revoke it** when you are done testing.
3. **Never** share a demo URL with a key pre-filled, and never commit one.

This is acceptable for a personal proof of concept. It is not acceptable for anything
public or production — that needs a small server minting short-lived `ek_` tokens.

---

## Transcription mode: when the text arrives

Step 2 of the wizard picks the model. They differ in *when* text appears, not just in
quality. Measured against the live API on 15 September 2026 with the same 10 s of German:

| | `gpt-live-transcribe` **(default)** | `gpt-4o-transcribe` |
| --- | --- | --- |
| Wizard label | Live while speaking | After each pause |
| First word appears | ~0.5–1 s behind your voice, **while speaking** | ~0.3 s **after you stop** |
| How text lands | word by word | whole sentence at once |
| Sentence breaks decided by | the browser | OpenAI (server VAD) |
| Semantic splitting | **not available** | available |
| Price | $0.017/min | $0.006/min |
| Status | current | **retires 26 Feb 2027** |

**The streaming model is the default.** The post-turn model sends nothing at all
while you are talking, so on a fresh page it reads as the demo having failed rather
than as a deliberate trade-off. It is still one click away in step 2, where the
wizard also names its retirement date.

Choices made in the wizard — model, language, splitting mode — are remembered in
`sessionStorage` for the life of the tab. They used to be plain component state, so
a reload silently reset the model to the default and streaming appeared to break.

Whichever model is chosen, the grey box appears as soon as speech is heard —
with three pulsing dots until the first words arrive — so there is always something
on screen showing that a statement is being worked on.

Measured traces, same audio:

```
gpt-4o-transcribe + semantic_vad        gpt-live-transcribe
 2.1s speech_started                     3.6s delta " Heute"     <- still talking
 4.3s speech_stopped + committed         4.0s delta " ist"
 4.6s delta "Heute" … " Tag" "."         4.2s delta " ein"
 4.9s COMPLETED                          4.6s delta " schöner"
      (all text after the pause)         5.0s delta " Tag" "."
```

`gpt-live-transcribe` rejects `turn_detection` outright, so choosing it moves turn
detection into the browser: `CLIENT_SILENCE_MS` (800 ms) of audio below
`CLIENT_SILENCE_LEVEL` after speech sends `input_audio_buffer.commit`, and the
`completed` event that follows is what fills a box. That is why the semantic option
disappears from step 3 when this model is selected — semantic VAD is a server feature.

It also takes `languages: ["de"]` where the other model takes `language: "de"`; sending
both is rejected.

## Checking the microphone

Step 3 has a **Test microphone** button. It runs the real capture path —
`getUserMedia`, the AudioWorklet, PCM16 conversion — but opens no socket, so it needs
no API key and costs nothing.

It listens for four seconds, shows a live level meter, and then reports one of three
things:

| Result | Meaning |
| --- | --- |
| ✓ *Microphone working — N chunks, peak X%* | Capture is fine. Any remaining problem is the key, credits, or the connection. |
| ✕ *Silent: audio is flowing but peaked at only X%* | The device is open but muted, or the browser is using the wrong input. |
| ✕ *Microphone access was denied* | A browser permission problem. |

Use it to tell a microphone problem apart from a key problem before spending requests.

## Why a session ends

A session that stops without explanation reads as random. There are exactly four
reasons, and the UI always names the one that applied:

| Reason | Shown as |
| --- | --- |
| You pressed Stop | "Stopped." |
| The 60-second limit | "Stopped: the 60-second limit was reached." |
| `IDLE_STOP_MS` of silence | "Stopped after 6s of silence." |
| A fatal error | "Stopped because of the error above." |

**Stop keeps the sentence you were part-way through.** Pressing Stop mid-word
used to close the socket at once, so OpenAI never received the commit, never
sent the transcript, and the words already on screen were cleared — the sentence
vanished. Now Stop closes the microphone immediately, sends
`input_audio_buffer.commit`, and holds the socket open for `STOP_GRACE_MS`
(2500ms). Whichever comes first wins:

| What happens | Result |
| --- | --- |
| The `completed` event arrives | The full transcript becomes a statement, socket closes. Measured at ~250ms |
| The grace window expires first | The words already on screen become the statement instead |
| Nothing was in flight (Stop during a pause) | No commit, socket closes in ~1ms, no duplicate |

The fallback is the part that makes the guarantee unconditional: captured words
are never dropped, even if the commit goes unanswered. An `input_audio_buffer`
error is ignored rather than bannered — committing an empty buffer is the
ordinary outcome of stopping in a pause.

The silence cut-off runs from the moment recording starts and resets on any audible
chunk, so it also catches a session started and then walked away from — billing
follows audio streamed, and silence is billed like anything else. It never fires
while a statement is still being transcribed: closing the socket then would throw
that statement away.

**Rate limits no longer end the session.** Every sentence is a separate API request, so
on a low tier the third sentence of an ordinary session can be rejected. That used to
kill the socket and lose the rest of the recording. Now a rate-limited sentence is
skipped with an amber warning and recording continues. Only an unrecoverable problem —
a bad key, a rejected session config, a dropped socket, or a microphone failure — stops
the session.

## Privacy: what happens to your voice and text

The app shows this as an expandable note on the page. Summarised, and checked against
OpenAI's [data controls documentation](https://developers.openai.com/api/docs/guides/your-data)
for `/v1/realtime` on 14 September 2026:

| Question | Answer |
| --- | --- |
| Does this app store transcripts? | **No.** They live in browser memory and vanish on reload. No database, no server, no account. |
| Does OpenAI store the audio? | **Yes, for up to 30 days**, in abuse-monitoring logs. This is their default for all API traffic. |
| Is it stored permanently? | **No.** Application-state retention for `/v1/realtime` is *None*. |
| Is it used for training? | **No** — not since 1 March 2023, unless the account opts in. |
| Is it linked to a person? | **No user identity is sent.** No name, no ID, no safety identifier. The request is linked to the API key's *organisation*, so it is anonymous as to the speaker, not anonymous overall. |

A common assumption is that the audio is processed and instantly discarded. **It is not** —
the 30-day abuse-monitoring window applies. Only customers approved for Zero Data
Retention or Modified Abuse Monitoring are excluded, and that requires applying to
OpenAI. If you need that guarantee for real users, it has to be arranged with OpenAI
directly; it is not something this app can switch on.

## The transcript list

Statements are appended to the **end** of the list, so it reads top-down in the order
they were spoken, and **Record more** continues at the bottom rather than starting a
new block above. The list sits above the record button, so the button stays in the
same place as statements accumulate beneath it.

Once the list outgrows the viewport the page follows the newest statement, using
`scrollIntoView({ block: "nearest" })` — nothing moves while the end of the list is
already on screen, so scrolling up to read is not fought by the next statement
arriving. Following stops when recording does, so editing is never interrupted.

### The data layer

A switch under the transcript shows the array as it is held in state:

```json
[
  { "order": 1,
    "id": "0f2c…",
    "text": "Heute ist ein schöner Tag.",
    "language": "de",
    "createdAt": "2026-09-15T13:25:54.440Z" }
]
```

`order` is **not stored**. It is the statement's position on screen, read off the array
on every render, so combining, reordering and deleting renumber it immediately rather
than leaving a stale field behind. `createdAt` is stored, set when the statement was
finalised; combining keeps the surviving statement's timestamp.

## The same component, in the Musy design system (`#/musie`)

A third page renders the **same** `TranscriptWorkspace` — same hooks, same
behaviour, same `onSentenceFinal` — dressed entirely in the Musy design system
vendored at `reference/musie260917`. Nothing about the other two pages changed.

Every visible part is a *released* component, imported and passed props, never
recreated from its markup — which is the one rule the package's own handoff
doc sets:

| Part of the workspace | Musy component |
| --- | --- |
| Record / stop control | **Record Button** (§7.22) — one control, two states, and it holds neither the microphone nor the 60-second timer, which is exactly this app's split |
| A finalised statement | **Content Box**, heading kept for the outline, hidden on screen |
| Waiting for words | **Content Box** `outline="dashed"` — the system's own reading of *provisional / awaiting content* (token gap G2) |
| Errors, warnings | **Message**, each with an explicit `live` region |
| Countdown, stop reason | **Badge** |
| Drag, show more | **Icon Button**, ghost, in a stack on the right |
| Edit, delete, save, discard | **CTA Button** — right-aligned rows, with the action you are most likely to want outermost: Edit in the accordion, Save in the editor. Save turns primary only once there is a change to save |
| Data layer, theme | **Switch** |
| Undo | a **toast** — the one pattern the system has no component for (see G5 below) |

### The card

Two controls are always visible — drag and a chevron — **floated to the end of
the statement's first line**. The chevron is a disclosure (`aria-expanded` +
`aria-controls`), and opening it reveals Edit and Delete; one card is open at a
time. The statement text carries `user-select: none`, because the whole card is
a drag surface and a marquee starting under the finger beats the gesture to it.

An actual CSS float, not a flex column beside the text, and the difference shows
on a long statement. Floated, the first two lines wrap around the controls and
every line after runs the full width — measured line widths on a 390px viewport:
`140 · 135 · 229 · 201 · 223 · 239px`. A flex row would have taken the same bite
out of *every* line and grown the card back:

| Statement | Stacked | Flex row | Floated |
| --- | --- | --- | --- |
| One or two lines (touch) | 154px | 104px | **104px** |
| Six lines (touch) | ~184px | 322px | **213px** |
| Any length (desktop, 1–2 lines) | 130px | 90px | **90px** |

Both action rows are right-aligned with the likely action outermost — Edit in
the accordion, Save in the editor — because the page is thumb-first and on a
phone the right edge is where a right-handed thumb lands. The other button
leads in the DOM in each case, so the tab order matches the screen rather than
contradicting it.

Two consequences worth knowing. The controls come **before** the text in the
DOM, because a float only works from the front of the flow — each names its
statement in its accessible label, and the box's hidden heading is announced
before either, so the reading stays unambiguous. And the text is a plain `<p>`:
a flex or grid container establishes its own formatting context and steps
around a float instead of wrapping beside it, which is exactly the bug the
first attempt had.

**Target size is the one place this page splits by device.** `size="min"`
(24px) on a fine pointer, `size="primary"` (44px) on a coarse one, chosen
through Icon Button's own `size` prop rather than by overriding its internal
custom property. Foundations §5.4 keeps `--target-min` for "inline controls
inside prose only", and these are a card's only affordances — but at 24px the
control still clears WCAG 2.2 SC 2.5.8, so on a cursor it is a comfort call
rather than an accessibility one. Since the controls float rather than stack,
the statement sets the card's height, not the buttons.

### The record control

`RecordButton` replaced the Voice Note block, and takes three things with it:
the countdown Badge, the hand-rolled level meter, and the "recorded" state that
this app never had. What is left is one primary CTA that switches ready ⇄
recording, with the component's own meter and its `0:12 · −0:48` readout.

It is fully controlled, as §7.22 requires — the app keeps the microphone, the
clock and the 60-second ceiling, and only hands over `elapsed`, `maxSeconds`
and `levels`. `levels` is a rolling 12-value history of chunk loudness, added to
`useTranscription` because the recorder callback is the only place that sees
every chunk; accumulating it in a component would mean building state during
render. It is set in the same event as `level`, so React batches the two and it
costs no extra render.

`block` is passed explicitly. The button is a column-flex item and would stretch
to the full width regardless, but saying so makes the width a decision: both
states measure the same, so the button cannot jump wider the moment it goes
live, and §7.22's "extra room goes to the meter" holds. Measured at 390px and
1280px: **310×46 and 592×47 in both states**, label never clipped, all 12 bars
visible.

### Spacing, audited against §5

Every gap on the page is the token §5 names for that relationship, and the
"gap between two groups is at least double the largest gap inside either group"
rule is checked rather than assumed:

| Between | Token | Measured |
| --- | --- | --- |
| Page sections | `--space-section` / `--space-section-lg` | 48px, 96px ≥ `--bp-lg` |
| Title and its subtitle | `--space-gap-related` | 12px |
| Key field and its message | `--space-gap-stack` | 16px |
| Transcript / recording / data layer | `--space-gap-group` | 32px — exactly 2× the 16px inside each |
| Statements in the list | `--space-gap-stack` | 16px |
| Statement and its controls | `--space-gap-stack` | 16px |
| Inside a card | `--space-inset-card`, Content Box's own gap | 24px, 12px |

The tool stack is the one place with `gap: 0`: at `size="min"` the system
already owes the button `--sp-2` of clear space on every side for 2.5.8, and
two of those margins meet at exactly `--space-gap-stack`.

The only CSS written for the page is `src/musie/musie.css` — the arrangement
*between* components, which no design system ships. It follows the rule the
system sets itself: every declaration resolves to a Layer 1 token or to
arithmetic over one, with no literal colour, space or motion value.

**Theme.** `data-theme` goes on the page's own wrapper rather than `<html>`.
Foundations declares every token on `:root, [data-theme]` precisely so a nested
subtree recomputes `light-dark()` (§12), and scoping it this way keeps
`color-scheme: dark` off the other two pages. Same attribute, same
`musy-theme` storage key, narrower scope.

### Findings

None of these were worked around by editing the design system — it is consumed,
never amended — so they are reported here instead.

1. **`Field` cannot show existing text.** It passes `value`, `defaultValue` and
   `onValueChange` to base-ui's `Field.Root`, which has none of them (checked
   against `@base-ui/react` 1.7.0, the version `package.json` declares). They
   land on a `<div>` and are ignored, so a controlled or pre-filled field is
   silently empty. The statement editor therefore composes on **Field's parts**
   (`.musy-field__*`) — which is the system's own sanctioned pattern, stated in
   Voice Note: *"composed on Field's parts (§7.16) … only the control surface
   is new."*
2. **`Lightbox` passes `dismissible` to `Dialog.Root`**, which does not accept
   it. Not used here; components are imported per file rather than through
   `components/index.ts` so the barrel does not drag it into the build.
3. **Gap G5 — there is no Toast.** Message's own source says so: "base-ui's
   Toast is a different pattern (portaled, queued, auto-dismissing)". Yet Layer
   1 ships `--z-toast`, ranked *above* `--z-sheet` with the stated reason that
   "a session saved confirmation must be visible over an open sheet" — a layer
   with no consumer in the released set. The undo toast here is built to the
   system's conventions (token-only, `--z-toast`, entrance travel from
   `--motion-travel-sm` so reduced motion flattens it) and is the case for
   Layer 2 absorbing one.
4. **`ContentBox` has no `headlineHidden`.** The headline is required and is
   what puts the box in the document outline — the documented reason it is an
   `<article>`. A card here shows the statement alone, so the heading has to be
   hidden visually, and with no prop and no className for that part the only
   route is reproducing `.musy-sr-only`'s declarations in the page's own CSS.
   `Switch` already has exactly this prop, spelled `labelHidden`; Content Box
   wants the same.
5. **The accent solids do not clear 3:1 as graphics.** `--interactive-accent-
   placeholder2` is `purple-9` (#CCA6C7), and Layer 1's own comment on step 9
   reads "Solid fill — buttons, filled chips, **meaningful graphics**". Measured
   as a graphic it is **1.85:1 against the page and 2.01:1 against a card** —
   under the 3:1 that 1.4.11 requires. The drop indicator therefore uses the
   same family's `-border` step (`purple-edge`), which Layer 1 annotates "solved
   ≥3:1 vs every surface" and which measures **3.90:1 / 4.25:1**. The contrast
   audit's "94 pairs, 0 failures" appears to cover foreground-on-fill pairs,
   not solid-on-surface, so step 9's "meaningful graphics" claim is worth either
   re-wording or re-solving.

Only `tokens/` and `components/` are committed — the folders the build imports.
The package's `docs/`, proof pages and screenshots stay local, so deploying this
page does not publish them to a public repo.

## Live demo

The demo needs **HTTPS**: browsers refuse `getUserMedia` on insecure origins, so the
microphone simply will not open over plain `http://`. GitHub Pages provides HTTPS
automatically. `localhost` is also treated as secure, so local development works.

Every push to `main` rebuilds and redeploys via `.github/workflows/deploy.yml`.

---

## How it works

```
microphone → AudioWorklet (PCM16 @ 24 kHz) → base64 → WebSocket → OpenAI
                                                                    ↓
   finalised sentence ← "completed" event ← server VAD detects your pause
                ↓
        onSentenceFinal(sentence, language)
```

| File | Role |
| --- | --- |
| `src/config.ts` | Every tunable constant |
| `src/onSentenceFinal.ts` | **The extension point** |
| `src/realtime/connection.ts` | WebSocket, auth, session config, event mapping |
| `src/audio/recorder.ts` | Microphone → PCM16 |
| `public/pcm-worklet.js` | Float → 16-bit conversion, off the main thread |
| `src/hooks/useTranscription.ts` | Glue, 60-second timer, silence cut-off, error handling |
| `src/components/RecorderPanel.tsx` | The four-step wizard: key, model, settings, talk |
| `src/components/TranscriptWorkspace.tsx` | Everything below the microphone check: transcript, record controls, data layer |

### The sentence-final hook

Every finalised sentence calls one function, in `src/onSentenceFinal.ts`:

```ts
export function onSentenceFinal(sentence: string, language: string): void {
  console.log("[onSentenceFinal]", { sentence, language });
  showToast("Sentence finished");

  // ↓ Plug new per-sentence logic in below.
}
```

Today it logs and raises a "Sentence finished" toast. To add a check — "did this
sentence mention a feeling?" — edit **only this file**. Nothing else in the app needs
to know.

`language` is the language you selected (`"de"` or `"en"`), or `"auto"` when
auto-detect is on. See the caveat under *Auto-detect* below.

### The segmentation lab (`#/lab`)

A second page, same demo, with control over how the transcript is cut into the
sentences passed to `onSentenceFinal`. There are two independent places to split:

**Audio** (before transcription) — decides how many API requests you make, which
matters for rate limits. Billing is per minute of audio either way, so finer audio
chunking costs no extra money, only extra requests.

**Text** (after transcription) — free.

| Mode | Audio split | Text split |
| --- | --- | --- |
| `silence` | Server VAD: a pause of `SILENCE_DURATION_MS` | none |
| `semantic` | Semantic VAD, `eagerness: "low"` | none |
| `punctuation` | Semantic VAD, `eagerness: "low"` | on `.` `?` `!` |

`semantic` uses a classifier that judges whether you have finished a *thought* rather
than merely stopped making noise. Hesitant speech — *"mir geht es… ja, eigentlich ganz
okay"* — survives in one piece instead of being chopped at the pause, which matters when
something downstream has to decide whether a feeling was expressed.

`punctuation` adds a free text split on top, so one long turn can still yield several
sentences. The splitter guards against two common false splits: known abbreviations
(`z.B.`, `Dr.`, `usw.`) and fragments that continue in lower case — see
[src/segmentation.ts](src/segmentation.ts). It is a heuristic, not a parser.

Routing is hash-based (`#/lab`) because GitHub Pages serves static files: a real
`/lab` path would 404 on reload.

### Tuning when a sentence ends

The single dial is in `src/config.ts`:

```ts
export const SILENCE_DURATION_MS = 500;
```

How long you must pause before the sentence is considered finished. Lower values
commit sooner but chop mid-thought; higher values give longer, more complete
sentences at the cost of feeling sluggish. `VAD_THRESHOLD` (raise it in a noisy room)
and `PREFIX_PADDING_MS` sit alongside it.

The pause detection happens on OpenAI's side — the browser just streams audio.

Two other timers sit above it and are unrelated to sentence splitting:
`SESSION_SECONDS` (60) caps the whole session, and `IDLE_STOP_MS` (6000) ends it once
nothing audible has arrived for that long. `CLIENT_SILENCE_LEVEL` decides what counts
as audible for both the idle cut-off and, on a model without server VAD, for turn
commits.

---

## API details, verified 14 September 2026

Checked against `developers.openai.com` (the old `platform.openai.com/docs/*` URLs
now redirect there) and confirmed by probing the live API, because the documentation
turned out to be wrong in one place.

- **Endpoint:** `wss://api.openai.com/v1/realtime?intent=transcription`
  Not documented; found by probing. `/v1/realtime/transcription_sessions` returns 404
  despite appearing in the model documentation's endpoint table.
- **Auth:** subprotocols `["realtime", "openai-insecure-api-key.<KEY>"]`. The beta
  `openai-beta.realtime-v1` subprotocol is gone in the GA API.
- **Models:** each one's capabilities live in `MODELS` in `src/config.ts` — whether
  OpenAI's VAD may end a turn, whether the language hint is `language` or `languages`,
  whether `delay` applies — so adding one is a config change, not a code change.
  `gpt-4o-transcribe`'s model page claims realtime transcription is "Not supported" —
  **this is incorrect**; the live API accepts it with server VAD.
- **Session payload** — the GA shape, not the beta `transcription_session.update`:

```json
{ "type": "session.update",
  "session": { "type": "transcription",
    "audio": { "input": {
      "format": { "type": "audio/pcm", "rate": 24000 },
      "transcription": { "model": "gpt-4o-transcribe", "language": "de" },
      "turn_detection": { "type": "server_vad", "threshold": 0.5,
                          "prefix_padding_ms": 300, "silence_duration_ms": 500 }
    }}}}
```

- **Events:** `conversation.item.input_audio_transcription.delta` → interim text;
  `.completed` → finalised sentence; `.failed` → error.

### Turn detection differs by model

`gpt-live-transcribe` **rejects turn detection outright**:

> `Turn detection is not supported for this transcription model.`

So choosing it moves pause detection into the browser: `CLIENT_SILENCE_MS` of quiet
audio after speech sends `input_audio_buffer.commit`. That is what `serverVad: false`
in the `MODELS` table selects. `gpt-4o-transcribe` sets `serverVad: true` and lets
OpenAI decide, which is why the semantic splitting options only appear for it.

### Models not wired up here

OpenAI deprecated `whisper-1`, `gpt-4o-transcribe`, `gpt-4o-mini-transcribe` and
`gpt-4o-transcribe-diarize` on 26 August 2026; they leave the API on 26 February 2027.
The named replacements are `gpt-transcribe` (post-turn, reports the detected language)
and `gpt-realtime-whisper` (streaming), alongside `gpt-live-transcribe`.

Neither has been added, because neither could be tested here — that needs a live key,
and adding an untested model to the wizard risks a red banner instead of a transcript.
Adding one is an entry in `MODELS`; the documentation says both take `turn_detection:
null`, so both would use the browser's own pause detection like `gpt-live-transcribe`
does. **Verify the language field (`language` vs `languages`) against a real session
before shipping either** — sending the wrong one is rejected outright.

### Auto-detect

Language auto-detection works for transcription, but the model does not report
*which* language it detected. `onSentenceFinal` therefore receives the literal string
`"auto"` rather than a detected code. Getting a real language code back would mean
`gpt-transcribe`, which only produces text after a turn ends — no live interim text.

---

## Cost

Published prices, 14 Sep 2026: `gpt-live-transcribe` (the default) **$0.017 per
minute** of audio, `gpt-4o-transcribe` **$0.006 per minute** — about 2.8× cheaper,
which is the trade-off for text that only arrives after each pause.

| Usage | Default (`gpt-live-transcribe`) | `gpt-4o-transcribe` |
| --- | --- | --- |
| One 60-second session | **~$0.017** (1.7 ¢) | ~$0.006 (0.6 ¢) |
| 100 test sessions | ~$1.70 | ~$0.60 |
| An hour of continuous speech | ~$1.02 | ~$0.36 |

Billing follows audio streamed, so stopping early costs proportionally less.

### Rate limits matter more than price here

**Each finalised sentence is one API request.** A minute of normal speech with
pauses can easily be ten or more requests.

| Tier | Requests/minute | Usable? |
| --- | --- | --- |
| Free (no payment method) | **3** | No — roughly one sentence per 20 seconds |
| Tier 1 (payment method added) | 500 | Yes |

If you see `Rate limit reached for gpt-4o-transcribe … Limit 3, Used 3`, add a payment
method at [platform.openai.com/account/billing](https://platform.openai.com/account/billing).
Credits alone are not enough — the free tier's 3 RPM cap applies regardless of balance.

The app treats a rate-limited sentence as **non-fatal**: it shows an amber warning and
keeps recording, so later sentences still come through once the window resets. Raising
`SILENCE_DURATION_MS` reduces the request rate by producing fewer, longer sentences,
but it cannot make the free tier genuinely usable.

**You need credits on the account.** With an empty balance every request fails with
`credit_balance_exhausted`, and the app surfaces that message directly. Top up at
[platform.openai.com billing](https://platform.openai.com/settings/organization/billing).

---

## Errors the app handles

| Situation | What you see |
| --- | --- |
| Microphone denied | "Microphone access was denied…" |
| No microphone | "No microphone was found on this device." |
| Invalid / expired key | OpenAI's own message, e.g. "Incorrect API key provided: sk-proj-****…" |
| Handshake refused outright | "OpenAI rejected the connection. The API key is probably invalid, expired, or out of credits." |
| No credits | "No credits remaining on the OpenAI account…" |
| Rate limit hit | Amber warning; **recording continues**, only that sentence is lost |
| Socket drops mid-session | "The connection to OpenAI closed unexpectedly." |

The socket closes on **Stop**, on the **60-second timeout**, and on **page unload**.

---

## Scope

Built: live interim text, per-sentence finalisation, the `onSentenceFinal` hook,
60-second countdown with manual stop, a silence cut-off, language selector,
transcript editing.

Deliberately not built: feeling/emotion detection (the hook is the placeholder for
it), any backend or token endpoint, transcript persistence, accounts, other STT
providers.

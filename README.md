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

| | `gpt-4o-transcribe` | `gpt-live-transcribe` |
| --- | --- | --- |
| Wizard label | After each pause | Live while speaking |
| First word appears | ~0.3 s **after you stop** | ~0.5–1 s behind your voice, **while speaking** |
| How text lands | whole sentence at once | word by word |
| Sentence breaks decided by | OpenAI (server VAD) | the browser |
| Semantic splitting | available | **not available** |
| Price | $0.006/min | $0.017/min |

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

A session that stops without explanation reads as random. There are exactly three
reasons, and the UI always names the one that applied:

| Reason | Shown as |
| --- | --- |
| You pressed Stop | "Stopped." |
| The 60-second limit | "Stopped: the 60-second limit was reached." |
| A fatal error | "Stopped because of the error above." |

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
| `src/hooks/useTranscription.ts` | Glue, 60-second timer, error handling |

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
- **Model:** `gpt-4o-transcribe`. Its model page claims realtime transcription is
  "Not supported" — **this is incorrect**; the live API accepts it with server VAD.
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

### Why not `gpt-live-transcribe`?

It is the newer streaming model, but it **rejects turn detection outright**:

> `Turn detection is not supported for this transcription model.`

Using it would mean detecting pauses in the browser and committing turns manually. It
is also nearly three times the price. `gpt-4o-transcribe` supports server VAD, so
sentence-splitting is handled for us. Swap `MODEL` in `src/config.ts` if that changes.

### Auto-detect

Language auto-detection works for transcription, but the model does not report
*which* language it detected. `onSentenceFinal` therefore receives the literal string
`"auto"` rather than a detected code. Getting a real language code back would mean
`gpt-transcribe`, which only produces text after a turn ends — no live interim text.

---

## Cost

`gpt-4o-transcribe` is **$0.006 per minute** of audio (published price, 14 Sep 2026).

| Usage | Cost |
| --- | --- |
| One 60-second session | **~$0.006** (0.6 ¢) |
| 100 test sessions | ~$0.60 |
| An hour of continuous speech | ~$0.36 |

Billing follows audio streamed, so stopping early costs proportionally less. For
comparison, `gpt-live-transcribe` is $0.017/min — about 2.8× more.

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
60-second countdown with manual stop, language selector.

Deliberately not built: feeling/emotion detection (the hook is the placeholder for
it), any backend or token endpoint, transcript persistence, accounts, other STT
providers.

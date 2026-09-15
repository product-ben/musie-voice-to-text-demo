import { CLIENT_SILENCE_MS, SESSION_SECONDS, SILENCE_DURATION_MS } from "../config";

/**
 * Written for designers evaluating the demo: what is captured, where it goes,
 * and what decides when a sentence ends. Specific enough to be checkable
 * against the code, not a marketing summary.
 */
export function HowItWorks() {
  return (
    <details className="disclosure">
      <summary>How this works</summary>

      <h3>What is captured, and when</h3>
      <ul>
        <li>
          Nothing is captured until you press <strong>Start</strong> (or{" "}
          <strong>Test microphone</strong>). The browser asks for permission, and the
          microphone is released the moment recording stops.
        </li>
        <li>
          Audio is converted on a separate thread — an <code>AudioWorklet</code>, so it never
          blocks the interface — into the format the API expects: <strong>mono, 16-bit,
          24 kHz</strong>.
        </li>
        <li>
          It is sent in chunks of about <strong>40 ms</strong>, roughly 25 messages a second.
          Those same chunks drive the level meter, so the bars are your real microphone
          signal rather than decoration.
        </li>
      </ul>

      <h3>Where it goes</h3>
      <ul>
        <li>
          Straight from your browser to OpenAI's Realtime API over a WebSocket. There is{" "}
          <strong>no server in between</strong> — this page is static files on GitHub Pages,
          so no backend of ours ever sees your audio.
        </li>
        <li>
          Your API key travels in the WebSocket handshake, because browsers cannot attach an
          authorisation header to a WebSocket. That is the trade-off of having no backend;
          see the privacy note below.
        </li>
        <li>No analytics, no third parties. OpenAI is the only service contacted.</li>
      </ul>

      <h3>What decides when a sentence ends</h3>
      <ul>
        <li>
          <strong>After each pause</strong> — OpenAI watches the audio. In{" "}
          <em>Silence</em> mode, {SILENCE_DURATION_MS} ms of quiet ends the sentence. In{" "}
          <em>Semantic</em> mode a classifier judges whether you have finished a thought, so
          hesitating does not cut you off.
        </li>
        <li>
          <strong>Live while speaking</strong> — this model has no pause detection of its
          own, so the browser does it: {CLIENT_SILENCE_MS} ms below the loudness threshold
          after speech ends the turn. Blunter than the server's, which is why it waits
          slightly longer.
        </li>
        <li>
          Either way, an optional <strong>punctuation split</strong> can cut the returned
          text again on <code>.</code> <code>?</code> <code>!</code>. That is pure string
          work in the browser — no extra requests, no extra cost.
        </li>
      </ul>

      <h3>What comes back</h3>
      <ul>
        <li>
          <strong>Partial text</strong> arrives as a stream of small updates and shows in
          grey italics. With <em>After each pause</em> these all arrive once you have
          stopped, so the sentence appears at once. With <em>Live while speaking</em> they
          arrive about a second behind your voice, while you are still talking.
        </li>
        <li>
          <strong>Finished text</strong> arrives as one final, corrected transcript. That is
          what becomes a solid block — and what calls{" "}
          <code>onSentenceFinal(sentence, language)</code>, the single hook where later
          per-sentence logic will live.
        </li>
        <li>
          Partial text can be revised by what follows, so treat it as a preview. Only the
          finished text is authoritative.
        </li>
        <li>
          Hesitation sounds (<em>ähm</em>, <em>äh</em>, <em>hmm</em>) are stripped as the
          statement turns into a block, so the grey preview shows what you said and the block
          shows it tidied. The word lists are per language, because the obvious English
          fillers — <em>um</em>, <em>er</em> — are ordinary German words.
        </li>
      </ul>

      <h3>When and why it stops</h3>
      <ul>
        <li>
          Three reasons only, and the page always names the one that applied: you pressed
          Stop, the {SESSION_SECONDS}-second limit was reached, or an unrecoverable error
          occurred.
        </li>
        <li>
          A <strong>rate-limited sentence is skipped, not fatal</strong> — you get an amber
          warning and recording continues, because each sentence is a separate request and
          low tiers run out quickly. An empty credit balance or a bad key stops the session
          with a red banner instead.
        </li>
      </ul>

      <h3>What it costs</h3>
      <ul>
        <li>
          Billed per <strong>minute of audio</strong>, not per sentence — so splitting
          sentences more finely costs nothing extra. It does use more requests, which is
          what rate limits count.
        </li>
        <li>
          A full {SESSION_SECONDS}-second session is about <strong>0.6 ¢</strong> with{" "}
          <em>After each pause</em>, or <strong>1.7 ¢</strong> with{" "}
          <em>Live while speaking</em>.
        </li>
      </ul>
    </details>
  );
}

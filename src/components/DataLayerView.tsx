import { useId, useState } from "react";
import type { Sentence } from "../transcript/types";

/**
 * Shows the array exactly as it is held in state, so the effect of every edit,
 * merge, reorder and delete is visible rather than inferred.
 */
export function DataLayerView({ sentences }: { sentences: Sentence[] }) {
  const [shown, setShown] = useState(false);
  const switchId = useId();

  return (
    <section className="datalayer">
      <div className="datalayer-head">
        <label className="switch" htmlFor={switchId}>
          <input
            id={switchId}
            type="checkbox"
            checked={shown}
            onChange={(event) => setShown(event.target.checked)}
          />
          <span className="switch-track" aria-hidden="true">
            <span className="switch-knob" />
          </span>
          <span className="switch-label">Show data layer</span>
        </label>
        {shown && (
          <span className="datalayer-count">
            {sentences.length} {sentences.length === 1 ? "item" : "items"}
          </span>
        )}
      </div>

      {shown && (
        <pre className="json" aria-live="polite">
          {highlight(sentences)}
        </pre>
      )}
    </section>
  );
}

/**
 * `order` is not stored: it is the position on screen, so it is read off the
 * array every render and cannot go stale when statements are reordered.
 */
function asRow(sentence: Sentence, index: number) {
  return { order: index + 1, id: sentence.id, text: sentence.text,
           language: sentence.language, createdAt: sentence.createdAt };
}

/** Minimal JSON pretty-printer with colouring — no dependency needed. */
function highlight(sentences: Sentence[]) {
  if (sentences.length === 0) return <span className="json-punct">[]</span>;

  return (
    <>
      <span className="json-punct">[</span>
      {sentences.map((sentence, index) => {
        const row = asRow(sentence, index);
        const keys = Object.keys(row) as (keyof typeof row)[];
        return (
          <span key={sentence.id}>
            {"\n  "}
            <span className="json-punct">{"{"}</span>
            {keys.map((key, keyIndex) => {
              const value = row[key];
              return (
                <span key={key}>
                  {"\n    "}
                  <span className="json-key">&quot;{key}&quot;</span>
                  <span className="json-punct">: </span>
                  {typeof value === "number" ? (
                    <span className="json-number">{value}</span>
                  ) : (
                    <span className="json-string">&quot;{value}&quot;</span>
                  )}
                  {keyIndex < keys.length - 1 && <span className="json-punct">,</span>}
                </span>
              );
            })}
            {"\n  "}
            <span className="json-punct">{"}"}</span>
            {index < sentences.length - 1 && <span className="json-punct">,</span>}
          </span>
        );
      })}
      {"\n"}
      <span className="json-punct">]</span>
    </>
  );
}

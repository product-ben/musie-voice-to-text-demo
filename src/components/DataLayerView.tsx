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

/** Minimal JSON pretty-printer with colouring — no dependency needed. */
function highlight(sentences: Sentence[]) {
  if (sentences.length === 0) return <span className="json-punct">[]</span>;

  return (
    <>
      <span className="json-punct">[</span>
      {sentences.map((sentence, index) => (
        <span key={sentence.id}>
          {"\n  "}
          <span className="json-punct">{"{"}</span>
          {(Object.keys(sentence) as (keyof Sentence)[]).map((key, keyIndex, keys) => (
            <span key={key}>
              {"\n    "}
              <span className="json-key">&quot;{key}&quot;</span>
              <span className="json-punct">: </span>
              <span className="json-string">&quot;{sentence[key]}&quot;</span>
              {keyIndex < keys.length - 1 && <span className="json-punct">,</span>}
            </span>
          ))}
          {"\n  "}
          <span className="json-punct">{"}"}</span>
          {index < sentences.length - 1 && <span className="json-punct">,</span>}
        </span>
      ))}
      {"\n"}
      <span className="json-punct">]</span>
    </>
  );
}

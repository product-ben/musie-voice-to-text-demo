import { RecorderPanel } from "../components/RecorderPanel";

export function Lab() {
  return (
    <>
      <h1>Segmentation lab</h1>
      <p className="intro">
        The same demo, with control over how the transcript is cut into the sentences passed to{" "}
        <code>onSentenceFinal</code>. Say the same few lines in each mode and compare how the
        blocks come out — hesitant speech is where they differ most.
      </p>
      <RecorderPanel showSegmentation />
    </>
  );
}

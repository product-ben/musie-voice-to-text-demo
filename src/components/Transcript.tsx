type Props = { sentences: string[]; interim: string };

export function Transcript({ sentences, interim }: Props) {
  if (sentences.length === 0 && !interim) {
    return <p className="placeholder">Finished sentences will appear here, one block each.</p>;
  }

  return (
    <div className="transcript">
      {sentences.map((sentence, index) => (
        <p key={index} className="sentence-final">
          {sentence}
        </p>
      ))}
      {interim && <p className="sentence-interim">{interim}</p>}
    </div>
  );
}

import { useMicCheck } from "../hooks/useMicCheck";

const BAR_WEIGHTS = [0.45, 0.75, 1, 0.75, 0.45];

export function MicCheck({ disabled }: { disabled: boolean }) {
  const { running, level, secondsLeft, outcome, run } = useMicCheck();
  const hearing = level > 0.02;

  return (
    <div className="miccheck">
      <div className="row">
        <button type="button" onClick={run} disabled={disabled || running}>
          {running ? `Listening… ${secondsLeft}s` : outcome ? "Test again" : "Test microphone"}
        </button>

        {running && (
          <div className={hearing ? "mic is-speaking" : "mic"}>
            <div className="mic-bars" aria-hidden="true">
              {BAR_WEIGHTS.map((weight, index) => (
                <span
                  key={index}
                  className="mic-bar"
                  style={{ transform: `scaleY(${Math.min(1, 0.12 + level * 2.6 * weight)})` }}
                />
              ))}
            </div>
            <span className="mic-label">{hearing ? "Hearing you" : "Say something"}</span>
          </div>
        )}
      </div>

      {outcome ? (
        <p className={outcome.ok ? "check-pass" : "check-fail"} role="status">
          {outcome.ok ? "✓ " : "✕ "}
          {outcome.message}
        </p>
      ) : (
        !running && (
          <p className="note">
            Checks the microphone on its own — no API key, no cost. Use it to tell a microphone
            problem apart from a key or connection problem.
          </p>
        )
      )}
    </div>
  );
}

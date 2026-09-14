import { SESSION_SECONDS } from "../config";
import type { StopReason } from "../hooks/useTranscription";

/**
 * A session that ends without explanation reads as "it randomly stopped".
 * Always say which of the three things happened.
 */
export function StopNotice({ reason, onRestart }: { reason: StopReason; onRestart: () => void }) {
  if (!reason) return null;

  const text =
    reason === "timeout"
      ? `Stopped: the ${SESSION_SECONDS}-second limit was reached.`
      : reason === "manual"
        ? "Stopped."
        : "Stopped because of the error above.";

  return (
    <p className="stop-notice">
      <span>{text}</span>
      <button type="button" onClick={onRestart}>
        Record again
      </button>
    </p>
  );
}

import type { Status } from "../hooks/useTranscription";

type Props = { status: Status; level: number; speaking: boolean };

const BARS = 5;
// Middle bars react most, so the meter reads as a shape rather than a block.
const BAR_WEIGHTS = [0.45, 0.75, 1, 0.75, 0.45];

export function MicIndicator({ status, level, speaking }: Props) {
  if (status === "idle") return null;

  const connecting = status === "connecting";
  const label = connecting
    ? "Connecting…"
    : speaking
      ? "Hearing you"
      : "Listening — start speaking";

  return (
    <div className={`mic ${speaking ? "is-speaking" : ""}`} aria-live="polite">
      <div className="mic-bars" aria-hidden="true">
        {Array.from({ length: BARS }, (_, index) => (
          <span
            key={index}
            className="mic-bar"
            style={{
              // 0.12 keeps a resting sliver visible; level is amplified and capped.
              transform: `scaleY(${connecting ? 0.12 : Math.min(1, 0.12 + level * 2.6 * BAR_WEIGHTS[index])})`,
            }}
          />
        ))}
      </div>
      <span className="mic-label">{label}</span>
    </div>
  );
}

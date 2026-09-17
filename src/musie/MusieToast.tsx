import { X } from "lucide-react";
import { CtaButton } from "../../reference/musie260917/components/CtaButton";
import { IconButton } from "../../reference/musie260917/components/IconButton";

type Props = {
  /** What was undoable. Null hides the toast. */
  label: string | null;
  actionLabel?: string;
  onAction: () => void;
  onDismiss: () => void;
};

/**
 * A toast — the one pattern on this page the design system has no component
 * for, and says so twice: Message's own source notes that "base-ui's Toast is
 * a different pattern (portaled, queued, auto-dismissing)", and Content List
 * and Message are both explicitly not it. Layer 1 nevertheless ships
 * `--z-toast`, ranked above `--z-sheet` with the stated reason that "a session
 * saved confirmation must be visible over an open sheet" — a token with no
 * consumer in the released set.
 *
 * So this is built to the system's conventions rather than invented: every
 * value is a Layer 1 token, it sits at `--z-toast`, and it takes the entrance
 * from `--motion-duration-base` / `--motion-ease-entrance` with the travel from
 * `--motion-travel-sm`, so reduced motion flattens it with no branch here.
 * Written up as gap G5 in the README.
 *
 * Dismissal is the caller's: the undo window already expires on its own timer,
 * so a second timer here could disagree with it.
 *
 * `role="status"` rather than `role="alert"`: an undo offer is not urgent, and
 * assertive would cut across whatever the screen reader is already saying.
 */
export function MusieToast({ label, actionLabel = "Undo", onAction, onDismiss }: Props) {
  if (!label) return null;

  return (
    <div className="musie-toast" role="status" aria-live="polite">
      <p className="musie-toast__text" data-type-step="body-sm">
        {label}
      </p>
      <CtaButton variant="ghost" onClick={onAction}>
        {actionLabel}
      </CtaButton>
      <IconButton
        glyph={X}
        label="Dismiss"
        variant="ghost"
        size="min"
        // The X in a two-control bar explains itself, and a tooltip under the
        // thumb is worse than none — the same call Icon Button documents for a
        // close control in a sheet header.
        tooltip={false}
        onClick={onDismiss}
      />
    </div>
  );
}

import type { ReactNode } from "react";

export type StepState = "done" | "active" | "upcoming";

type Props = {
  index: number;
  title: string;
  state: StepState;
  /** Shown instead of the content once the step is complete. */
  summary?: ReactNode;
  onEdit?: () => void;
  editDisabled?: boolean;
  children?: ReactNode;
};

export function Step({ index, title, state, summary, onEdit, editDisabled, children }: Props) {
  return (
    <section className={`step is-${state}`}>
      <div className="step-head">
        <span className="step-number" aria-hidden="true">
          {state === "done" ? "✓" : index}
        </span>
        <h2 className="step-title">{title}</h2>
        {state === "done" && onEdit && (
          <button type="button" className="step-edit" onClick={onEdit} disabled={editDisabled}>
            Change
          </button>
        )}
      </div>

      <div className="step-body">
        {state === "active" ? children : state === "done" ? (
          <p className="step-summary">{summary}</p>
        ) : null}
      </div>
    </section>
  );
}

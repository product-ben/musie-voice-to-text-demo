type Props = { label: string | null; onUndo: () => void; onDismiss: () => void };

/** Makes drag-to-combine safe to try: a mis-drop is one tap from reversed. */
export function UndoBar({ label, onUndo, onDismiss }: Props) {
  if (!label) return null;
  return (
    <div className="undo-bar" role="status">
      <span>{label}</span>
      <button type="button" onClick={onUndo}>
        Undo
      </button>
      <button type="button" className="undo-close" onClick={onDismiss} aria-label="Dismiss">
        ✕
      </button>
    </div>
  );
}

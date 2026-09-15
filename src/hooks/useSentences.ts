import { useCallback, useEffect, useRef, useState } from "react";
import type { Sentence } from "../transcript/types";
import { onSentenceFinal } from "../onSentenceFinal";

/** How long the undo offer stays on screen after a destructive change. */
const UNDO_SECONDS = 6;

type Undoable = { label: string; snapshot: Sentence[] } | null;

/**
 * Which text leads once two statements merge. "targetFirst" appends the
 * dragged statement; "sourceFirst" prepends it, which is what keeps the
 * merged text in reading order when dragging downward.
 */
export type CombineOrder = "targetFirst" | "sourceFirst";

const newId = () =>
  typeof crypto?.randomUUID === "function"
    ? crypto.randomUUID()
    : `s-${Math.random().toString(36).slice(2)}`;

/**
 * Owns the list of finalised statements and every edit the user can make to it.
 *
 * Combining and deleting destroy text, so both snapshot the list first and
 * offer an undo. Editing does not: it has an explicit Cancel.
 */
export function useSentences() {
  const [sentences, setSentences] = useState<Sentence[]>([]);
  const [undoable, setUndoable] = useState<Undoable>(null);
  const undoTimer = useRef<number | null>(null);

  const offerUndo = useCallback((label: string, snapshot: Sentence[]) => {
    setUndoable({ label, snapshot });
    if (undoTimer.current) clearTimeout(undoTimer.current);
    undoTimer.current = window.setTimeout(() => setUndoable(null), UNDO_SECONDS * 1000);
  }, []);

  const dismissUndo = useCallback(() => {
    if (undoTimer.current) clearTimeout(undoTimer.current);
    setUndoable(null);
  }, []);

  const undo = useCallback(() => {
    setUndoable((current) => {
      if (current) setSentences(current.snapshot);
      return null;
    });
    if (undoTimer.current) clearTimeout(undoTimer.current);
  }, []);

  /** Called by the transcriber as each turn finalises. */
  const append = useCallback((texts: string[], language: string) => {
    setSentences((previous) => [
      ...previous,
      ...texts.map((text) => ({ id: newId(), text, language })),
    ]);
  }, []);

  /**
   * Marks where the current recording session's statements begin, so a second
   * session can insert its block above everything older while the statements
   * within it stay in the order they were spoken.
   */
  const sessionStart = useRef(0);

  const beginSession = useCallback(() => {
    sessionStart.current = 0;
  }, []);

  const appendToSession = useCallback((texts: string[], language: string) => {
    setSentences((previous) => {
      const fresh = texts.map((text) => ({ id: newId(), text, language }));
      const at = sessionStart.current;
      sessionStart.current = at + fresh.length;
      return [...previous.slice(0, at), ...fresh, ...previous.slice(at)];
    });
  }, []);

  const reset = useCallback(() => {
    setSentences([]);
    dismissUndo();
  }, [dismissUndo]);

  const edit = useCallback((id: string, text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setSentences((previous) =>
      previous.map((sentence) => {
        if (sentence.id !== id || sentence.text === trimmed) return sentence;
        // The corrected text is what downstream logic should judge.
        onSentenceFinal(trimmed, sentence.language);
        return { ...sentence, text: trimmed };
      }),
    );
  }, []);

  /** Appends the dragged statement's text to the one it was dropped on. */
  const combine = useCallback(
    (sourceId: string, targetId: string, order: CombineOrder = "targetFirst") => {
      if (sourceId === targetId) return;
      setSentences((previous) => {
        const source = previous.find((s) => s.id === sourceId);
        const target = previous.find((s) => s.id === targetId);
        if (!source || !target) return previous;

        offerUndo("Statements combined", previous);
        const parts =
          order === "sourceFirst" ? [source.text, target.text] : [target.text, source.text];
        const merged = parts.join(" ").replace(/\s+/g, " ").trim();
        onSentenceFinal(merged, target.language);

        return previous
          .filter((s) => s.id !== sourceId)
          .map((s) => (s.id === targetId ? { ...s, text: merged } : s));
      });
    },
    [offerUndo],
  );

  /** Moves a statement to just before or just after another one. */
  const move = useCallback((sourceId: string, targetId: string, position: "before" | "after") => {
    if (sourceId === targetId) return;
    setSentences((previous) => {
      const from = previous.findIndex((s) => s.id === sourceId);
      const target = previous.findIndex((s) => s.id === targetId);
      if (from === -1 || target === -1) return previous;

      const next = [...previous];
      const [moved] = next.splice(from, 1);
      // Recompute after removal so the index still points at the same box.
      const anchor = next.findIndex((s) => s.id === targetId);
      next.splice(position === "before" ? anchor : anchor + 1, 0, moved);
      return next;
    });
  }, []);

  const remove = useCallback(
    (id: string) => {
      setSentences((previous) => {
        if (!previous.some((s) => s.id === id)) return previous;
        offerUndo("Statement deleted", previous);
        return previous.filter((s) => s.id !== id);
      });
    },
    [offerUndo],
  );

  useEffect(() => () => { if (undoTimer.current) clearTimeout(undoTimer.current); }, []);

  return {
    sentences,
    undoLabel: undoable?.label ?? null,
    append,
    appendToSession,
    beginSession,
    reset,
    edit,
    combine,
    move,
    remove,
    undo,
    dismissUndo,
  };
}

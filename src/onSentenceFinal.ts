/**
 * ─────────────────────────────────────────────────────────────
 *  EXTENSION POINT
 *  Called once per finalised sentence. Later logic (for example a
 *  "no feeling mentioned" check) goes in here — nothing else in the
 *  app needs to change.
 * ─────────────────────────────────────────────────────────────
 */

type ToastListener = (message: string) => void;

const toastListeners = new Set<ToastListener>();

/** The UI subscribes here so the hook can raise a toast without importing React. */
export function subscribeToToasts(listener: ToastListener): () => void {
  toastListeners.add(listener);
  return () => toastListeners.delete(listener);
}

function showToast(message: string) {
  toastListeners.forEach((listener) => listener(message));
}

/**
 * @param sentence  The finalised sentence.
 * @param language  "de" | "en" when one was chosen, "auto" when detecting.
 */
export function onSentenceFinal(sentence: string, language: string): void {
  console.log("[onSentenceFinal]", { sentence, language });

  showToast("Sentence finished");

  // ↓ Plug new per-sentence logic in below.
}

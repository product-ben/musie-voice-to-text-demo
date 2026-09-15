import { useCallback, useEffect, useRef, useState } from "react";
import type { DropTarget } from "../transcript/types";

/** Movement before a press counts as a drag rather than a tap. */
const DRAG_THRESHOLD_PX = 8;

/** Hold this long to drag from anywhere on a card, on touch. */
const LONG_PRESS_MS = 350;

/** Moving further than this before the hold completes means you meant to scroll. */
const SCROLL_INTENT_PX = 10;

/** How close to the viewport edge before the page scrolls itself. */
const EDGE_PX = 80;
const EDGE_SPEED = 12;

type Rect = { id: string; top: number; bottom: number };

type Options = {
  onCombine: (sourceId: string, targetId: string) => void;
  onMove: (sourceId: string, targetId: string, position: "before" | "after") => void;
};

/**
 * Drag-and-drop on Pointer Events, because HTML5 drag-and-drop does not fire
 * on touch devices at all.
 *
 * Two ways in. The drag handle starts immediately, since `touch-action: none`
 * on a small target costs no scrolling. Pressing anywhere else on a card needs
 * a short hold first — otherwise a card would swallow every attempt to scroll
 * the page, which on a phone is most of what people do.
 *
 * The dragged card stays in place while a copy follows the finger, so the list
 * never reflows and the positions measured at drag start stay valid throughout.
 */
export function useDragList({ onCombine, onMove }: Options) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget>(null);
  const [pointer, setPointer] = useState<{ x: number; y: number } | null>(null);

  const items = useRef(new Map<string, HTMLElement>());
  const rects = useRef<Rect[]>([]);
  const origin = useRef<{ x: number; y: number } | null>(null);
  const pendingId = useRef<string | null>(null);
  const active = useRef(false);
  const moved = useRef(false);
  const holdTimer = useRef<number | null>(null);
  const awaitingHold = useRef(false);
  const scrollFrame = useRef<number | null>(null);
  const edgeVelocity = useRef(0);
  /**
   * Auto-scroll stays disarmed until the pointer has been away from both edges
   * once. Otherwise grabbing a card already near the bottom of a phone screen
   * scrolls the page out from under the finger the moment you press.
   */
  const edgeArmed = useRef(false);

  const registerItem = useCallback((id: string, element: HTMLElement | null) => {
    if (element) items.current.set(id, element);
    else items.current.delete(id);
  }, []);

  const stopEdgeScroll = useCallback(() => {
    if (scrollFrame.current !== null) cancelAnimationFrame(scrollFrame.current);
    scrollFrame.current = null;
    edgeVelocity.current = 0;
  }, []);

  const runEdgeScroll = useCallback(() => {
    if (scrollFrame.current !== null) return;
    const step = () => {
      if (edgeVelocity.current !== 0) window.scrollBy(0, edgeVelocity.current);
      scrollFrame.current = edgeVelocity.current !== 0 ? requestAnimationFrame(step) : null;
    };
    scrollFrame.current = requestAnimationFrame(step);
  }, []);

  /** Document-space positions, captured once so scrolling cannot invalidate them. */
  const measure = useCallback(() => {
    rects.current = [...items.current.entries()].map(([id, element]) => {
      const box = element.getBoundingClientRect();
      return { id, top: box.top + window.scrollY, bottom: box.bottom + window.scrollY };
    });
  }, []);

  const resolveTarget = useCallback((documentY: number, sourceId: string): DropTarget => {
    const hit = rects.current.find((r) => documentY >= r.top && documentY <= r.bottom);
    if (!hit) {
      const sorted = [...rects.current].sort((a, b) => a.top - b.top);
      const first = sorted[0];
      const last = sorted[sorted.length - 1];
      if (last && documentY > last.bottom && last.id !== sourceId) {
        return { id: last.id, mode: "after" };
      }
      if (first && documentY < first.top && first.id !== sourceId) {
        return { id: first.id, mode: "before" };
      }
      return null;
    }
    if (hit.id === sourceId) return null;

    const ratio = (documentY - hit.top) / Math.max(1, hit.bottom - hit.top);
    // Outer quarters reorder, the middle half combines.
    if (ratio < 0.25) return { id: hit.id, mode: "before" };
    if (ratio > 0.75) return { id: hit.id, mode: "after" };
    return { id: hit.id, mode: "combine" };
  }, []);

  const clearHold = useCallback(() => {
    if (holdTimer.current !== null) clearTimeout(holdTimer.current);
    holdTimer.current = null;
    awaitingHold.current = false;
  }, []);

  const finish = useCallback(() => {
    clearHold();
    stopEdgeScroll();
    setDraggingId(null);
    setDropTarget(null);
    setPointer(null);
    origin.current = null;
    pendingId.current = null;
    active.current = false;
    edgeArmed.current = false;
  }, [clearHold, stopEdgeScroll]);

  const beginDrag = useCallback(
    (id: string) => {
      active.current = true;
      moved.current = true;
      measure();
      setDraggingId(id);
    },
    [measure],
  );

  const startPress = useCallback(
    (id: string, event: React.PointerEvent, requireHold: boolean) => {
      const target = event.target as HTMLElement;
      // Buttons and inputs inside a card must stay usable.
      if (target.closest("[data-no-drag]")) return;
      if (event.pointerType === "mouse" && event.button !== 0) return;

      pendingId.current = id;
      origin.current = { x: event.clientX, y: event.clientY };
      moved.current = false;

      try {
        (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
      } catch {
        /* capture is an optimisation, not a requirement */
      }

      // A mouse has no scroll gesture to compete with, so never make it wait.
      if (requireHold && event.pointerType !== "mouse") {
        awaitingHold.current = true;
        holdTimer.current = window.setTimeout(() => {
          awaitingHold.current = false;
          holdTimer.current = null;
          if (pendingId.current === id) {
            navigator.vibrate?.(10);
            beginDrag(id);
          }
        }, LONG_PRESS_MS);
      }
    },
    [beginDrag],
  );

  const onPointerMove = useCallback(
    (event: React.PointerEvent) => {
      const id = pendingId.current;
      const from = origin.current;
      if (!id || !from) return;

      const distance = Math.hypot(event.clientX - from.x, event.clientY - from.y);

      if (awaitingHold.current) {
        // Moving before the hold completes means the user wants to scroll.
        if (distance > SCROLL_INTENT_PX) {
          clearHold();
          pendingId.current = null;
          origin.current = null;
        }
        return;
      }

      if (!active.current) {
        if (distance < DRAG_THRESHOLD_PX) return;
        beginDrag(id);
      }

      setPointer({ x: event.clientX, y: event.clientY });
      setDropTarget(resolveTarget(event.clientY + window.scrollY, id));

      const fromTop = event.clientY;
      const fromBottom = window.innerHeight - event.clientY;
      const inEdge = fromTop < EDGE_PX || fromBottom < EDGE_PX;
      if (!inEdge) edgeArmed.current = true;

      edgeVelocity.current =
        !edgeArmed.current || !inEdge ? 0 : fromTop < EDGE_PX ? -EDGE_SPEED : EDGE_SPEED;
      if (edgeVelocity.current !== 0) runEdgeScroll();
      else stopEdgeScroll();
    },
    [beginDrag, clearHold, resolveTarget, runEdgeScroll, stopEdgeScroll],
  );

  const onPointerUp = useCallback(() => {
    const id = pendingId.current;
    if (active.current && id && dropTarget) {
      if (dropTarget.mode === "combine") onCombine(id, dropTarget.id);
      else onMove(id, dropTarget.id, dropTarget.mode);
    }
    finish();
  }, [dropTarget, finish, onCombine, onMove]);

  /** While dragging on touch, stop the browser scrolling the page as well. */
  useEffect(() => {
    if (!draggingId) return;
    const block = (event: TouchEvent) => event.preventDefault();
    document.addEventListener("touchmove", block, { passive: false });
    return () => document.removeEventListener("touchmove", block);
  }, [draggingId]);

  useEffect(() => () => clearHold(), [clearHold]);

  /** True if the gesture that just ended was a drag, so a tap can be ignored. */
  const consumeDrag = useCallback(() => {
    const wasDrag = moved.current;
    moved.current = false;
    return wasDrag;
  }, []);

  const shared = {
    onPointerMove,
    onPointerUp,
    onPointerCancel: finish,
  };

  /**
   * The handle sits inside the card, and both listen for pointer events, so
   * without stopping propagation the card would re-arm the same gesture in
   * hold-to-drag mode and immediately cancel the handle's immediate drag.
   */
  const containedShared = {
    onPointerMove: (event: React.PointerEvent) => {
      event.stopPropagation();
      onPointerMove(event);
    },
    onPointerUp: (event: React.PointerEvent) => {
      event.stopPropagation();
      onPointerUp();
    },
    onPointerCancel: (event: React.PointerEvent) => {
      event.stopPropagation();
      finish();
    },
  };

  return {
    draggingId,
    dropTarget,
    pointer,
    registerItem,
    consumeDrag,
    /** For the handle icon: starts dragging immediately. */
    handleProps: (id: string) => ({
      onPointerDown: (event: React.PointerEvent) => {
        event.stopPropagation();
        startPress(id, event, false);
      },
      ...containedShared,
    }),
    /** For the whole card: needs a short hold on touch, so scrolling still works. */
    cardProps: (id: string) => ({
      onPointerDown: (event: React.PointerEvent) => startPress(id, event, true),
      ...shared,
    }),
  };
}

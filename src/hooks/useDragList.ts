import { useCallback, useRef, useState } from "react";
import type { DropTarget } from "../transcript/types";

/** Movement before a press counts as a drag rather than a tap. */
const DRAG_THRESHOLD_PX = 8;

/** How close to the viewport edge before the page scrolls itself. */
const EDGE_PX = 80;
const EDGE_SPEED = 12;

type Rect = { id: string; top: number; bottom: number };

type Options = {
  onCombine: (sourceId: string, targetId: string) => void;
  onMove: (sourceId: string, targetId: string, position: "before" | "after") => void;
};

/**
 * Drag-and-drop built on Pointer Events rather than HTML5 drag-and-drop,
 * which does not fire on touch devices at all.
 *
 * The dragged box stays in place at reduced opacity and a copy follows the
 * finger, so the list never reflows mid-drag and the measured positions stay
 * valid for the whole gesture.
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
  const scrollFrame = useRef<number | null>(null);
  const edgeVelocity = useRef(0);

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

  /** Document-space positions, captured once so scrolling does not invalidate them. */
  const measure = useCallback(() => {
    rects.current = [...items.current.entries()].map(([id, element]) => {
      const box = element.getBoundingClientRect();
      return { id, top: box.top + window.scrollY, bottom: box.bottom + window.scrollY };
    });
  }, []);

  const resolveTarget = useCallback((documentY: number, sourceId: string): DropTarget => {
    const hit = rects.current.find((r) => documentY >= r.top && documentY <= r.bottom);
    if (!hit) {
      // Past the end of the list: drop after the last box.
      const last = rects.current[rects.current.length - 1];
      if (last && documentY > last.bottom && last.id !== sourceId) {
        return { id: last.id, mode: "after" };
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

  const finish = useCallback(() => {
    stopEdgeScroll();
    setDraggingId(null);
    setDropTarget(null);
    setPointer(null);
    origin.current = null;
    pendingId.current = null;
    active.current = false;
  }, [stopEdgeScroll]);

  const onPointerDown = useCallback((id: string, event: React.PointerEvent) => {
    if (event.button !== 0 && event.pointerType === "mouse") return;
    pendingId.current = id;
    origin.current = { x: event.clientX, y: event.clientY };
    moved.current = false;
    // Capture keeps move/up events coming to the handle even when the finger
    // leaves it. Not fatal if the browser refuses.
    try {
      (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    } catch {
      /* ignore */
    }
  }, []);

  const onPointerMove = useCallback(
    (event: React.PointerEvent) => {
      const id = pendingId.current;
      const from = origin.current;
      if (!id || !from) return;

      const dx = event.clientX - from.x;
      const dy = event.clientY - from.y;

      if (!active.current) {
        if (Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;
        active.current = true;
        moved.current = true;
        measure();
        setDraggingId(id);
      }

      setPointer({ x: event.clientX, y: event.clientY });
      setDropTarget(resolveTarget(event.clientY + window.scrollY, id));

      const fromTop = event.clientY;
      const fromBottom = window.innerHeight - event.clientY;
      edgeVelocity.current =
        fromTop < EDGE_PX ? -EDGE_SPEED : fromBottom < EDGE_PX ? EDGE_SPEED : 0;
      if (edgeVelocity.current !== 0) runEdgeScroll();
      else stopEdgeScroll();
    },
    [measure, resolveTarget, runEdgeScroll, stopEdgeScroll],
  );

  const onPointerUp = useCallback(() => {
    const id = pendingId.current;
    if (active.current && id && dropTarget) {
      if (dropTarget.mode === "combine") onCombine(id, dropTarget.id);
      else onMove(id, dropTarget.id, dropTarget.mode);
    }
    finish();
  }, [dropTarget, finish, onCombine, onMove]);

  /** True if the gesture that just ended was a drag, so a tap can be ignored. */
  const consumeDrag = useCallback(() => {
    const wasDrag = moved.current;
    moved.current = false;
    return wasDrag;
  }, []);

  return {
    draggingId,
    dropTarget,
    pointer,
    registerItem,
    consumeDrag,
    handleProps: (id: string) => ({
      onPointerDown: (event: React.PointerEvent) => onPointerDown(id, event),
      onPointerMove,
      onPointerUp,
      onPointerCancel: finish,
    }),
  };
}

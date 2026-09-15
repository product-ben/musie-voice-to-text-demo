/** A finalised statement. Ids are needed so reordering survives re-renders. */
export type Sentence = {
  id: string;
  text: string;
  language: string;
  /** When the statement was finalised, ISO 8601. Shown in the data layer. */
  createdAt: string;
};

/** Where a dragged box will land relative to the box under the pointer. */
export type DropMode = "before" | "after" | "combine";

export type DropTarget = { id: string; mode: DropMode } | null;

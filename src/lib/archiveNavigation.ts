export interface ArchiveContext {
  search: string;
  scrollY: number;
  studyId: string;
  tagsExpanded: boolean;
}

// Only a query is accepted, never an arbitrary return URL.
export function readArchiveContext(value: unknown): ArchiveContext | null {
  if (!value || typeof value !== "object") return null;
  const context = value as Partial<ArchiveContext>;
  if (
    typeof context.search !== "string" ||
    (context.search !== "" && !context.search.startsWith("?")) ||
    typeof context.scrollY !== "number" ||
    !Number.isFinite(context.scrollY) ||
    context.scrollY < 0 ||
    typeof context.studyId !== "string" ||
    typeof context.tagsExpanded !== "boolean"
  )
    return null;
  return {
    search: context.search,
    scrollY: context.scrollY,
    studyId: context.studyId,
    tagsExpanded: context.tagsExpanded,
  };
}

export type Collections = Record<string, string[]>;
export const allSavedIds = (groups: Collections) => [
  ...new Set(Object.values(groups).flat()),
];
export function removeCollection(
  groups: Collections,
  name: string,
): Collections {
  if (name === "Default" || !Object.hasOwn(groups, name)) return groups;
  const next: Collections = {
    ...groups,
    Default: [...new Set([...(groups.Default || []), ...groups[name]])],
  };
  delete next[name];
  return next;
}
export function removeSavedIds(
  groups: Collections,
  ids: string[],
  collection?: string,
): Collections {
  const remove = new Set(ids);
  const next = Object.fromEntries(
    Object.entries(groups).map(([name, values]) => [
      name,
      !collection || name === collection
        ? values.filter((id) => !remove.has(id))
        : [...values],
    ]),
  );
  // Removing an organizational label must not discard the saved portrait.
  if (collection && collection !== "Default")
    next.Default = [
      ...new Set([
        ...(next.Default || []),
        ...ids.filter((id) => groups[collection]?.includes(id)),
      ]),
    ];
  return next;
}

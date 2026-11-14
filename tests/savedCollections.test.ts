import { describe, expect, it } from "vitest";
import {
  allSavedIds,
  removeCollection,
  removeSavedIds,
} from "@/lib/savedCollections";
describe("saved collection organization", () => {
  const original = { Default: ["a"], Lighting: ["b", "a"], Noir: ["c", "b"] };
  it("revisits the union of existing collections without duplicates", () => {
    expect(allSavedIds(original)).toEqual(["a", "b", "c"]);
  });
  it("retains portraits when removing a collection label", () => {
    const next = removeSavedIds(original, ["b"], "Lighting");
    expect(next.Lighting).toEqual(["a"]);
    expect(next.Default).toEqual(["a", "b"]);
    expect(allSavedIds(next).sort()).toEqual(["a", "b", "c"]);
    expect(original.Lighting).toEqual(["b", "a"]);
  });
  it("keeps all saved portraits when deleting a collection", () => {
    const next = removeCollection(original, "Lighting");
    expect(next.Lighting).toBeUndefined();
    expect(next.Default).toEqual(["a", "b"]);
    expect(allSavedIds(next).sort()).toEqual(["a", "b", "c"]);
    expect(removeCollection(original, "Default")).toBe(original);
  });
  it("unsaves a portrait everywhere while preserving other memberships", () => {
    const next = removeSavedIds(original, ["b"]);
    expect(next).toEqual({ Default: ["a"], Lighting: ["a"], Noir: ["c"] });
    expect(original.Noir).toEqual(["c", "b"]);
  });
});

import { describe, expect, it } from "vitest";
import { parsePromptTokens } from "../src/lib/promptParser";

describe("parsePromptTokens", () => {
  it("separates technical flags and classifies descriptive clauses", () => {
    const parsed = parsePromptTokens(
      "A portrait of a woman, golden hour rim lighting, shot on an 85mm lens with soft bokeh, Kodak Portra 400 film grain --ar 4:5 --v 6.1 --s 250",
    );
    expect(parsed.raw).toContain("--ar 4:5");
    expect(parsed.parameters).toEqual({ ar: "4:5", v: "6.1", s: "250" });
    expect(
      parsed.categories.find(
        (category) => category.label === "Subject / Figure",
      )?.tokens,
    ).toEqual(["A portrait of a woman"]);
    expect(
      parsed.categories.find((category) => category.label === "Lighting & Tone")
        ?.tokens,
    ).toEqual(["golden hour rim lighting"]);
    expect(
      parsed.categories.find((category) => category.label === "Optics & Camera")
        ?.tokens,
    ).toEqual(["shot on an 85mm lens with soft bokeh"]);
    expect(
      parsed.categories.find(
        (category) => category.label === "Palette & Medium",
      )?.tokens,
    ).toEqual(["Kodak Portra 400 film grain"]);
  });

  it("keeps unclassified clauses in General / Atmosphere", () => {
    const parsed = parsePromptTokens("A portrait, quiet rainy city atmosphere");
    expect(
      parsed.categories.find(
        (category) => category.label === "General / Atmosphere",
      )?.tokens,
    ).toEqual(["quiet rainy city atmosphere"]);
    expect(parsed.parameters).toEqual({});
  });
});

import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { PromptCard } from "../src/components/Study";
import { PromptStudioDrawer } from "../src/components/PromptStudioDrawer";
import { RelatedStudies } from "../src/components/RelatedStudies";
import {
  formatPromptText,
  getCommandParameters,
} from "../src/lib/promptFormatter";
import { getRelatedStudies } from "../src/lib/relatedStudies";
import { prompts, readerPath } from "../src/content";
import type { Prompt } from "../src/content/schema";
const original = prompts.find((prompt) => prompt.studyNumber === 5)!;
const flagged: Prompt = {
  ...original,
  prompt: "A portrait --ar 4:5 --stylize 50 --tile --no blur extra hands",
  parameters: { "--s": 250, v: "6.1", q: 0, fast: false },
};
let writeText: ReturnType<typeof vi.fn>;
beforeEach(() => {
  localStorage.clear();
  writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText },
  });
});
it("merges inline and recorded flags without duplicates, preserving multiword and boolean values", () => {
  const text = formatPromptText(flagged, "discord");
  expect(text).toBe(
    "/imagine prompt: A portrait --ar 4:5 --s 250 --tile --no blur extra hands --v 6.1 --q 0",
  );
  expect(
    getCommandParameters(flagged).map((parameter) => parameter.key),
  ).toEqual(["ar", "s", "tile", "no", "v", "q"]);
  expect(formatPromptText(flagged, "raw")).toBe(flagged.prompt);
  expect(formatPromptText(flagged, "params", ["v"])).toBe("A portrait --v 6.1");
});
it("omits deselected inline flags and can copy a command with no parameters", () => {
  expect(formatPromptText(flagged, "discord", ["v"])).toBe(
    "/imagine prompt: A portrait --v 6.1",
  );
  expect(formatPromptText(flagged, "discord", [])).toBe(
    "/imagine prompt: A portrait",
  );
});
it("uses the card's selected parameters for Discord while keeping raw copying exact", async () => {
  render(<PromptCard prompt={flagged} />);
  fireEvent.click(screen.getByRole("checkbox", { name: "--ar 4:5" }));
  await act(async () =>
    fireEvent.click(screen.getByRole("button", { name: "Discord /imagine" })),
  );
  expect(writeText.mock.calls[0][0]).not.toContain("--ar");
  expect(writeText.mock.calls[0][0]).toContain("--s 250");
  await act(async () =>
    fireEvent.click(
      screen.getByRole("button", { name: "Midjourney (+ Params)" }),
    ),
  );
  expect(writeText.mock.calls[1][0]).not.toContain("--ar");
  expect(writeText.mock.calls[1][0]).not.toContain("/imagine");
  expect(writeText.mock.calls[1][0]).toContain("--s 250");
  expect(screen.getByRole("status")).toHaveTextContent(
    "Midjourney prompt copied.",
  );
  await act(async () =>
    fireEvent.click(screen.getByRole("button", { name: "Copy prompt" })),
  );
  expect(writeText).toHaveBeenLastCalledWith(flagged.prompt);
});
it("offers unchecked optional starting points for studies without recorded parameters", async () => {
  render(<PromptCard prompt={original} />);
  const aspect = screen.getByRole("checkbox", { name: "--ar 4:5" });
  expect(aspect).not.toBeChecked();
  await act(async () =>
    fireEvent.click(screen.getByRole("button", { name: "Discord /imagine" })),
  );
  expect(writeText).toHaveBeenLastCalledWith(
    `/imagine prompt: ${original.prompt}`,
  );
  fireEvent.click(aspect);
  await act(async () =>
    fireEvent.click(screen.getByRole("button", { name: "Discord /imagine" })),
  );
  expect(writeText).toHaveBeenLastCalledWith(
    `/imagine prompt: ${original.prompt} --ar 4:5`,
  );
});
it("updates Studio flags and Discord copying when presets and checkboxes change", async () => {
  render(<PromptStudioDrawer prompt={original} isOpen onClose={() => {}} />);
  fireEvent.click(screen.getByRole("radio", { name: "16:9 Cinema" }));
  fireEvent.click(screen.getByRole("checkbox", { name: "--s 250" }));
  fireEvent.click(screen.getByRole("button", { name: /dramatic chiaroscuro/ }));
  await act(async () =>
    fireEvent.click(
      screen.getByRole("button", { name: "Copy Discord /imagine" }),
    ),
  );
  expect(writeText.mock.calls[0][0]).toContain("/imagine prompt:");
  expect(writeText.mock.calls[0][0]).toContain("dramatic chiaroscuro");
  expect(writeText.mock.calls[0][0]).toContain("--ar 16:9");
  expect(writeText.mock.calls[0][0]).not.toContain("--s ");
  expect(
    screen.getByRole("status", { name: "Copy feedback" }),
  ).toHaveTextContent("Discord /imagine command copied.");
  fireEvent.click(screen.getByRole("checkbox", { name: "--ar 16:9" }));
  expect(screen.getByLabelText("Live Prompt Preview")).not.toHaveTextContent(
    "--ar",
  );
});
it("reports failed Studio clipboard writes", async () => {
  writeText.mockRejectedValue(new Error("blocked"));
  render(<PromptStudioDrawer prompt={original} isOpen onClose={() => {}} />);
  await act(async () =>
    fireEvent.click(
      screen.getByRole("button", { name: "Copy Discord /imagine" }),
    ),
  );
  expect(
    screen.getByRole("status", { name: "Copy feedback" }),
  ).toHaveTextContent("Copy unavailable");
});
it("ranks shared tags deterministically and excludes the active study and unrelated candidates", () => {
  const study = { ...original, tags: [" NoIR ", "grain"] };
  const one = {
    ...original,
    id: "one",
    studyNumber: 1,
    tags: ["noir", "noir"],
  };
  const both = {
    ...original,
    id: "both",
    studyNumber: 9,
    tags: ["Noir", "Grain"],
  };
  const other = {
    ...original,
    id: "other",
    studyNumber: 2,
    tags: ["landscape"],
  };
  const tied = { ...one, id: "tied", studyNumber: 2 };
  expect(
    getRelatedStudies(study, [study, other, tied, both, one]).map(
      (item) => item.id,
    ),
  ).toEqual(["both", "one", "tied"]);
  expect(getRelatedStudies(study, [both, one], 1)).toEqual([both]);
  expect(getRelatedStudies({ ...study, tags: [] }, [both, one])).toEqual([]);
});
it.each(["detail", "reader"] as const)(
  "links related studies to the correct %s destination",
  (context) => {
    render(
      <MemoryRouter>
        <RelatedStudies prompt={original} context={context} />
      </MemoryRouter>,
    );
    const region = screen.getByRole("region", { name: "Related Studies" });
    const related = getRelatedStudies(original, prompts);
    const links = within(region).getAllByRole("link");
    expect(links).toHaveLength(related.length);
    related.forEach((prompt, index) =>
      expect(links[index]).toHaveAttribute(
        "href",
        context === "reader"
          ? readerPath(prompt.issueSlug, prompt.page)
          : `/prompts/${prompt.id}`,
      ),
    );
  },
);

const storedRemix = {
  id: "stored-remix",
  promptId: original.id,
  title: original.title,
  prompt: "A saved portrait",
  parameters: {
    aspectRatio: "16:9",
    stylize: 500,
    chaos: 5,
    keywords: ["film grain"],
  },
  timestamp: 1700000000000,
};

it.each([
  ["malformed JSON", "{broken"],
  ["null", "null"],
  ["an object", "{}"],
  ["a null record", "[null]"],
  [
    "invalid nested parameters",
    JSON.stringify([{ ...storedRemix, parameters: { keywords: {} } }]),
  ],
])("falls back to empty remix history and warns for %s", (_label, raw) => {
  localStorage.setItem("the-portrait-edit:remixes", raw);
  const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  render(<PromptStudioDrawer prompt={original} isOpen onClose={() => {}} />);
  expect(screen.getByText("Recent Remixes (0)")).toBeInTheDocument();
  expect(warn).toHaveBeenCalledWith(
    expect.stringContaining("the-portrait-edit:remixes"),
  );
});

it("keeps valid stored remixes usable", () => {
  localStorage.setItem(
    "the-portrait-edit:remixes",
    JSON.stringify([storedRemix]),
  );
  const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  render(<PromptStudioDrawer prompt={original} isOpen onClose={() => {}} />);
  expect(screen.getByText("Recent Remixes (1)")).toBeInTheDocument();
  fireEvent.click(screen.getByText("Recent Remixes (1)"));
  fireEvent.click(screen.getByRole("button", { name: "Re-apply settings" }));
  const preview = screen.getByLabelText("Live Prompt Preview");
  expect(preview).toHaveTextContent("--ar 16:9");
  expect(preview).toHaveTextContent("--s 500");
  expect(preview).toHaveTextContent("film grain");
  expect(warn).not.toHaveBeenCalled();
});

it("falls back to empty remix history when storage access is denied", () => {
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
    throw new Error("Storage denied");
  });
  const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  render(<PromptStudioDrawer prompt={original} isOpen onClose={() => {}} />);
  expect(screen.getByText("Recent Remixes (0)")).toBeInTheDocument();
  expect(warn).toHaveBeenCalledWith(expect.stringContaining("Storage denied"));
});

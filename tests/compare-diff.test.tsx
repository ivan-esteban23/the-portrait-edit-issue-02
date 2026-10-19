import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { CompareLab } from "../src/components/CompareLab";
import { prompts } from "../src/content";

it("renders shared and unique prompt phrases plus parameter differences", () => {
  const base = prompts[0];
  const studyA = {
    ...base,
    id: "compare-a",
    prompt: "A portrait, golden hour lighting, 85mm lens --ar 4:5 --s 120",
    model: "Model A",
    parameters: {},
  };
  const studyB = {
    ...base,
    id: "compare-b",
    prompt: "A portrait, neon lighting, 50mm lens --ar 16:9 --s 300",
    model: "Model B",
    parameters: {},
  };
  render(
    <CompareLab
      studyA={studyA}
      studyB={studyB}
      isOpen
      onClose={() => {}}
      onSwap={() => {}}
    />,
  );
  expect(screen.getByText("Prompt Comparison")).toBeInTheDocument();
  expect(screen.getAllByText("A portrait")).toHaveLength(2);
  expect(screen.getByText("golden hour lighting")).toHaveClass("is-unique-a");
  expect(screen.getByText("neon lighting")).toHaveClass("is-unique-b");
  expect(screen.getByRole("row", { name: /Aspect Ratio/ })).toHaveTextContent(
    "4:5",
  );
  expect(screen.getByRole("row", { name: /Stylize/ })).toHaveTextContent("120");
  expect(screen.getByRole("row", { name: /Model/ })).toHaveTextContent(
    "Model A",
  );
});

it("copies a combined prompt with unique phrases from both studies", async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText },
  });
  const base = prompts[0];
  render(
    <CompareLab
      studyA={{ ...base, prompt: "portrait, soft light" }}
      studyB={{ ...base, id: "compare-b", prompt: "portrait, film grain" }}
      isOpen
      onClose={() => {}}
      onSwap={() => {}}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Copy Combined Prompt" }));
  await vi.waitFor(() =>
    expect(writeText).toHaveBeenCalledWith("portrait, soft light, film grain"),
  );
});

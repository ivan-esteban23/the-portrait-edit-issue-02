import { act, fireEvent, render, screen } from "@testing-library/react";
import { it, expect, vi } from "vitest";
import { PromptCard } from "../src/components/Study";
import { copyText } from "../src/lib/utils";
import prompt from "../src/content/prompts/issue-02-study-005.json";
it("copies the full exact prompt with confirmation", async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText },
  });
  render(<PromptCard prompt={prompt} />);
  await act(async () => fireEvent.click(screen.getByText("Copy prompt")));
  expect(writeText).toHaveBeenCalledWith(prompt.prompt);
  expect(screen.getByRole("status")).toHaveTextContent("Prompt copied.");
});
it("ignores a copy response after the study is unmounted", async () => {
  let resolve!: () => void;
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText: () => new Promise<void>((r) => (resolve = r)) },
  });
  const old = render(<PromptCard prompt={prompt} />);
  fireEvent.click(screen.getByText("Copy prompt"));
  old.unmount();
  render(<PromptCard prompt={prompt} />);
  await act(async () => resolve());
  expect(screen.getByText("Copy prompt")).toBeEnabled();
  expect(screen.getByRole("status")).toBeEmptyDOMElement();
});
it("legacy copying removes the textarea and restores focus", async () => {
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: undefined,
  });
  const exec = vi.fn(() => true);
  Object.defineProperty(document, "execCommand", {
    configurable: true,
    value: exec,
  });
  render(<button>Origin</button>);
  const button = screen.getByText("Origin");
  button.focus();
  await copyText(prompt.prompt);
  expect(exec).toHaveBeenCalledWith("copy");
  expect(document.querySelector("textarea")).toBeNull();
  expect(document.activeElement).toBe(button);
});
it("reports failed copying without changing the prompt", async () => {
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText: () => Promise.reject(Error("denied")) },
  });
  render(<PromptCard prompt={prompt} />);
  await act(async () => fireEvent.click(screen.getByText("Copy prompt")));
  expect(screen.getByRole("status")).toHaveTextContent(
    "Select the prompt text",
  );
  expect(screen.getByText(prompt.prompt)).toBeVisible();
});

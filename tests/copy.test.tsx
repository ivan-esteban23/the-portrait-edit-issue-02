import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { it, expect, vi } from "vitest";
import { PromptCard } from "../src/components/Study";
import { StudyCard } from "../src/components/StudyCard";
import { copyText } from "../src/lib/utils";
import { formatPromptText } from "../src/lib/promptFormatter";
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
  // The legacy fallback is tried after a rejection; make it fail too.
  Object.defineProperty(document, "execCommand", {
    configurable: true,
    value: vi.fn(() => false),
  });
  render(<PromptCard prompt={prompt} />);
  await act(async () => fireEvent.click(screen.getByText("Copy prompt")));
  expect(screen.getByRole("status")).toHaveTextContent(
    "Select the prompt text",
  );
  expect(screen.getByText(prompt.prompt)).toBeVisible();
});

it("explains StudyCard clipboard failure, exposes manual copy, and ignores stale copy results", async () => {
  let rejectFirst!: (reason?: unknown) => void;
  const writeText = vi
    .fn()
    .mockRejectedValueOnce(new Error("denied"))
    .mockImplementationOnce(
      () =>
        new Promise<void>((_resolve, reject) => {
          rejectFirst = reject;
        }),
    )
    .mockResolvedValueOnce(undefined);
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText },
  });
  Object.defineProperty(document, "execCommand", {
    configurable: true,
    value: vi.fn(() => false),
  });

  render(
    <MemoryRouter>
      <StudyCard prompt={prompt} to={`/prompts/${prompt.id}`} />
    </MemoryRouter>,
  );

  const copyBtn = screen.getByRole("button", {
    name: `Copy prompt for Study ${prompt.studyNumber}`,
  });
  await act(async () => fireEvent.click(copyBtn));

  expect(screen.getByRole("status")).toHaveTextContent(
    `Copy unavailable for Study ${prompt.studyNumber}. Select the prompt text below to copy it.`,
  );
  const manualInput = screen.getByRole("textbox", {
    name: `Prompt to copy for Study ${prompt.studyNumber}`,
  }) as HTMLInputElement;
  expect(manualInput).toHaveValue(prompt.prompt);
  expect(manualInput).toHaveAttribute("readonly");
  fireEvent.focus(manualInput);
  expect(manualInput.selectionEnd).toBe(prompt.prompt.length);

  // Start a slow copy that will reject later, then immediately start a third copy that succeeds.
  fireEvent.click(copyBtn);
  fireEvent.click(
    screen.getByRole("button", {
      name: `More actions for Study ${prompt.studyNumber}`,
    }),
  );
  await act(async () =>
    fireEvent.click(screen.getByRole("button", { name: "Copy as Markdown" })),
  );

  expect(writeText).toHaveBeenLastCalledWith(
    formatPromptText(prompt, "markdown"),
  );
  expect(
    screen.queryByRole("textbox", {
      name: `Prompt to copy for Study ${prompt.studyNumber}`,
    }),
  ).toBeNull();
  expect(screen.getByRole("status")).toHaveTextContent(
    `Copied MD! Study ${prompt.studyNumber} prompt.`,
  );

  // Settling the older request must not overwrite the newer success state.
  await act(async () => rejectFirst(new Error("late failure")));
  expect(
    screen.queryByRole("textbox", {
      name: `Prompt to copy for Study ${prompt.studyNumber}`,
    }),
  ).toBeNull();
  expect(screen.getByRole("status")).toHaveTextContent(
    `Copied MD! Study ${prompt.studyNumber} prompt.`,
  );
});

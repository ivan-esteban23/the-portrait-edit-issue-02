import { act, fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { PromptCard } from "../src/components/Study";
import { prompts } from "../src/content";
import * as utils from "../src/lib/utils";
import * as cardExport from "../src/lib/cardExport";

it("keeps a newer export failure when an older prompt copy completes", async () => {
  let resolveOld!: () => void;
  vi.spyOn(utils, "copyText").mockImplementationOnce(
    () =>
      new Promise<void>((resolve) => {
        resolveOld = resolve;
      }),
  );
  vi.spyOn(cardExport, "exportStudyRecipeCard").mockRejectedValueOnce(
    new Error("unavailable"),
  );
  render(<PromptCard prompt={prompts[0]} />);
  fireEvent.click(screen.getByRole("button", { name: "Copy prompt" }));
  fireEvent.click(screen.getByText("More actions"));
  await act(async () =>
    fireEvent.click(
      screen.getByRole("button", { name: "Download recipe card" }),
    ),
  );
  expect(screen.getByRole("status")).toHaveTextContent(
    "Unable to export recipe card.",
  );
  await act(async () => resolveOld());
  expect(screen.getByRole("status")).toHaveTextContent(
    "Unable to export recipe card.",
  );
});

it("keeps the busy copy control focusable and ignores repeated activation", async () => {
  let finish!: () => void;
  const copy = vi.spyOn(utils, "copyText").mockImplementationOnce(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
  );
  render(<PromptCard prompt={prompts[0]} />);
  const button = screen.getByRole("button", { name: "Copy prompt" });
  button.focus();
  fireEvent.click(button);
  expect(button).toHaveFocus();
  expect(button).toHaveAttribute("aria-disabled", "true");
  fireEvent.click(button);
  expect(copy).toHaveBeenCalledTimes(1);
  await act(async () => finish());
  expect(button).toHaveFocus();
  expect(button).toHaveAttribute("aria-disabled", "false");
});

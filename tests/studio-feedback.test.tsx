import { act, fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { PromptStudioDrawer } from "../src/components/PromptStudioDrawer";
import { prompts } from "../src/content";
import * as utils from "../src/lib/utils";

it("keeps newer studio copy failure after an older request resolves", async () => {
  let resolveOld!: () => void;
  vi.spyOn(utils, "copyText")
    .mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          resolveOld = resolve;
        }),
    )
    .mockRejectedValueOnce(new Error("unavailable"));
  render(<PromptStudioDrawer prompt={prompts[0]} isOpen onClose={() => {}} />);
  fireEvent.click(screen.getByRole("button", { name: "Copy Modified Prompt" }));
  await act(async () =>
    fireEvent.click(
      screen.getByRole("button", { name: "Copy Discord /imagine" }),
    ),
  );
  expect(
    screen.getByRole("status", { name: "Copy feedback" }),
  ).toHaveTextContent("Copy unavailable");
  await act(async () => resolveOld());
  expect(
    screen.getByRole("status", { name: "Copy feedback" }),
  ).toHaveTextContent("Copy unavailable");
});

import { act, fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { CompareLab } from "../src/components/CompareLab";
import { prompts } from "../src/content";
import * as utils from "../src/lib/utils";

it("announces a copy failure and ignores older copy results", async () => {
  let resolveOld!: () => void;
  vi.spyOn(utils, "copyText")
    .mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          resolveOld = resolve;
        }),
    )
    .mockRejectedValueOnce(new Error("unavailable"));
  render(
    <CompareLab
      studyA={prompts[0]}
      studyB={prompts[1]}
      isOpen
      onClose={() => {}}
      onSwap={() => {}}
    />,
  );
  fireEvent.click(screen.getAllByRole("button", { name: "Copy Raw" })[0]);
  await act(async () =>
    fireEvent.click(
      screen.getByRole("button", { name: "Copy Combined Prompt" }),
    ),
  );
  expect(screen.getByRole("status")).toHaveTextContent("Copy unavailable");
  await act(async () => resolveOld());
  expect(screen.getByRole("status")).toHaveTextContent("Copy unavailable");
});

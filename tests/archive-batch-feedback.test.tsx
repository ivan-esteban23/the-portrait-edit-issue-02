import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { expect, it, vi } from "vitest";
import { ArchivePage } from "../src/pages/ArchivePage";
import * as utils from "../src/lib/utils";

it("keeps the latest batch-copy failure after an older copy resolves", async () => {
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
    <MemoryRouter initialEntries={["/?q=Frost+Fantasy"]}>
      <ArchivePage />
    </MemoryRouter>,
  );
  fireEvent.click(screen.getByText("Archive tools", { exact: true }));
  fireEvent.click(screen.getByRole("button", { name: "Select Prompts" }));
  fireEvent.click(screen.getByRole("button", { name: "Select All Filtered" }));
  fireEvent.click(screen.getByRole("button", { name: "Copy Prompts" }));
  await act(async () =>
    fireEvent.click(screen.getByRole("button", { name: "Copy Prompts" })),
  );
  expect(
    screen.getByText(/Copy unavailable\. Export the dossier/),
  ).toBeVisible();
  await act(async () => resolveOld());
  expect(
    screen.getByText(/Copy unavailable\. Export the dossier/),
  ).toBeVisible();
});

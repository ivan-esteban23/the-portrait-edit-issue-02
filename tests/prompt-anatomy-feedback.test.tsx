import { act, fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { PromptAnatomy } from "../src/components/PromptAnatomy";
import * as utils from "../src/lib/utils";

it("does not let an older copy response overwrite newer failure feedback", async () => {
  let resolveOld!: () => void;
  vi.spyOn(utils, "copyText")
    .mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          resolveOld = resolve;
        }),
    )
    .mockRejectedValueOnce(new Error("unavailable"));
  render(<PromptAnatomy prompt="portrait, soft light" />);
  fireEvent.click(screen.getByRole("button", { name: /Copy Subject/ }));
  await act(async () =>
    fireEvent.click(screen.getByRole("button", { name: /Copy Lighting/ })),
  );
  expect(screen.getByRole("status")).toHaveTextContent("Copy unavailable");
  await act(async () => resolveOld());
  expect(screen.getByRole("status")).toHaveTextContent("Copy unavailable");
});

it("does not let an earlier dismissal clear a later copy failure", async () => {
  vi.useFakeTimers();
  try {
    vi.spyOn(utils, "copyText")
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error("unavailable"));
    render(<PromptAnatomy prompt="portrait, soft light" />);
    await act(async () =>
      fireEvent.click(screen.getByRole("button", { name: /Copy Subject/ })),
    );
    await act(async () =>
      fireEvent.click(screen.getByRole("button", { name: /Copy Lighting/ })),
    );
    await act(async () => vi.advanceTimersByTime(1400));
    expect(screen.getByRole("status")).toHaveTextContent("Copy unavailable");
  } finally {
    vi.useRealTimers();
  }
});

import { act, fireEvent, render, screen } from "@testing-library/react";
import { useCallback, useState } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { Toast } from "../src/components/ui/Toast";

function Harness({ onUndo = () => {} }: { onUndo?: () => void }) {
  const [visible, setVisible] = useState(false);
  const dismiss = useCallback(() => setVisible(false), []);
  return (
    <main id="main" tabIndex={-1}>
      <button onClick={() => setVisible(true)}>Remove saved study</button>
      <Toast
        message="Study removed"
        visible={visible}
        onDismiss={dismiss}
        onUndo={() => {
          onUndo();
          dismiss();
        }}
      />
    </main>
  );
}

afterEach(() => vi.useRealTimers());

it("has no hidden Undo control and preserves the visible Undo action", () => {
  const onUndo = vi.fn();
  render(<Harness onUndo={onUndo} />);
  expect(
    screen.queryByRole("button", { name: "Undo", hidden: true }),
  ).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Remove saved study" }));
  expect(screen.getByRole("status")).toHaveTextContent("Study removed");
  fireEvent.click(screen.getByRole("button", { name: "Undo" }));
  expect(onUndo).toHaveBeenCalledOnce();
  expect(
    screen.queryByRole("button", { name: "Undo", hidden: true }),
  ).toBeNull();
});

it("restores focus to the opener if a focused toast expires", () => {
  vi.useFakeTimers();
  render(<Harness />);
  const remove = screen.getByRole("button", { name: "Remove saved study" });
  remove.focus();
  fireEvent.click(remove);
  screen.getByRole("button", { name: "Undo" }).focus();
  act(() => vi.advanceTimersByTime(4000));
  expect(remove).toHaveFocus();
  expect(
    screen.queryByRole("button", { name: "Undo", hidden: true }),
  ).toBeNull();
});

it("does not move focus when a toast expires while focus is elsewhere", () => {
  vi.useFakeTimers();
  render(<Harness />);
  const remove = screen.getByRole("button", { name: "Remove saved study" });
  remove.focus();
  fireEvent.click(remove);
  act(() => vi.advanceTimersByTime(4000));
  expect(remove).toHaveFocus();
});

it("falls back to main when the original control is no longer mounted", () => {
  vi.useFakeTimers();
  render(<Harness />);
  const remove = screen.getByRole("button", { name: "Remove saved study" });
  remove.focus();
  fireEvent.click(remove);
  remove.remove();
  screen.getByRole("button", { name: "Undo" }).focus();
  act(() => vi.advanceTimersByTime(4000));
  expect(document.getElementById("main")).toHaveFocus();
});

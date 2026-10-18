import { useState } from "react";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ShortcutsModal } from "../src/components/ShortcutsModal";
import { ImageLightbox } from "../src/components/ImageLightbox";
import { CompareLab } from "../src/components/CompareLab";
import { Reader } from "../src/components/Reader";
import { currentIssue, prompts } from "../src/content";

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal("scrollTo", vi.fn());
});

function ModalHarness({ kind }: { kind: "shortcuts" | "image" | "compare" }) {
  const [open, setOpen] = useState(false);
  const props = { isOpen: open, onClose: () => setOpen(false) };
  return (
    <>
      <button onClick={() => setOpen(true)}>Open modal</button>
      <button>Outside control</button>
      {kind === "shortcuts" ? (
        <ShortcutsModal {...props} />
      ) : kind === "image" ? (
        <ImageLightbox {...props} src="reference.webp" alt="Reference" />
      ) : (
        <CompareLab
          {...props}
          studyA={prompts[0]}
          studyB={prompts[1]}
          onSwap={() => {}}
        />
      )}
    </>
  );
}

it.each(["shortcuts", "image", "compare"] as const)(
  "%s contains focus, handles both Tab boundaries and restores its opener",
  async (kind) => {
    const user = userEvent.setup();
    render(<ModalHarness kind={kind} />);
    const opener = screen.getByRole("button", { name: "Open modal" });
    await user.click(opener);
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAccessibleName(
      kind === "shortcuts"
        ? "Keyboard Shortcuts"
        : kind === "image"
          ? "Image detail inspector"
          : "Compare Lab",
    );
    const close = within(dialog).getByRole("button", { name: /Close/ });
    await waitFor(() => expect(close).toHaveFocus());
    const controls = Array.from(
      dialog.querySelectorAll<HTMLButtonElement>("button:not(:disabled)"),
    );
    const first = controls[0],
      last = controls[controls.length - 1];
    last.focus();
    await user.tab();
    expect(first).toHaveFocus();
    await user.tab({ shift: true });
    expect(last).toHaveFocus();
    // Programmatic focus cannot escape either.
    screen
      .getByRole("button", { name: "Outside control", hidden: true })
      .focus();
    expect(dialog).toContainElement(document.activeElement as HTMLElement);
    await user.keyboard("{Escape}");
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    await waitFor(() => expect(opener).toHaveFocus());
  },
);

it.each(["button", "overlay"])(
  "shortcuts restores focus after %s dismissal and after reopening",
  async (method) => {
    const user = userEvent.setup();
    const { container } = render(<ModalHarness kind="shortcuts" />);
    const opener = screen.getByRole("button", { name: "Open modal" });
    for (let count = 0; count < 2; count++) {
      await user.click(opener);
      await waitFor(() =>
        expect(
          screen.getByRole("button", { name: /Close shortcuts/ }),
        ).toHaveFocus(),
      );
      if (method === "button")
        await user.click(
          screen.getByRole("button", { name: /Close shortcuts/ }),
        );
      else fireEvent.click(document.querySelector(".shortcuts-modal-overlay")!);
      await waitFor(() =>
        expect(container.querySelector("button")).toHaveFocus(),
      );
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    }
  },
);

function ReaderHarness() {
  const [focus, setFocus] = useState(false);
  return <Reader focus={focus} setFocus={setFocus} />;
}
function renderReader(page = 60) {
  return render(
    <MemoryRouter
      initialEntries={[`/issues/${currentIssue.slug}/pages/${page}`]}
    >
      <Routes>
        <Route path="/issues/:slug/pages/:page" element={<ReaderHarness />} />
      </Routes>
    </MemoryRouter>,
  );
}
const titleAt = (page: number) => {
  const prompt = prompts.find(
    (p) => p.issueSlug === currentIssue.slug && p.page === page,
  )!;
  return `Study ${String(prompt.studyNumber).padStart(3, "0")} - ${prompt.title}`;
};

it("announces committed page changes and Focus mode without repeating for previews or unrelated changes", async () => {
  const user = userEvent.setup();
  const { container } = renderReader();
  const live = container.querySelector(".reader-announcer")!;
  expect(live).toHaveAttribute("aria-live", "polite");
  expect(live).toHaveAttribute("aria-atomic", "true");
  expect(live).toHaveTextContent(`Page 60 of 196: ${titleAt(60)}`);
  const observer = new MutationObserver(() => {});
  observer.observe(live, {
    childList: true,
    subtree: true,
    characterData: true,
  });
  try {
    fireEvent.change(screen.getByRole("slider", { name: "Browse pages" }), {
      target: { value: "61" },
    });
    expect(live).toHaveTextContent("Page 60 of 196:");
    expect(observer.takeRecords()).toHaveLength(0);
    await user.keyboard("j");
    expect(live).toHaveTextContent(`Page 61 of 196: ${titleAt(61)}`);
    await user.keyboard("f");
    expect(live).toHaveTextContent("Focus mode activated");
    await user.keyboard("f");
    expect(live).toHaveTextContent("Focus mode deactivated");
    observer.takeRecords();
    fireEvent.click(screen.getByRole("button", { name: /Sound FX/ }));
    expect(observer.takeRecords()).toHaveLength(0);
    const number = screen.getByLabelText("Page number", { exact: true });
    fireEvent.change(number, { target: { value: "60" } });
    fireEvent.submit(number.closest("form")!);
    expect(live).toHaveTextContent(`Page 60 of 196: ${titleAt(60)}`);
  } finally {
    observer.disconnect();
  }
});

it("announces covers, spreads, and a final unpaired page without duplicating a spread", async () => {
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) =>
      Object.assign(new EventTarget(), {
        matches: query.includes("min-width"),
        media: query,
        onchange: null,
      }),
    ),
  );
  localStorage.setItem("portrait-edit-spread", "true");
  const user = userEvent.setup();
  const { container } = renderReader(1);
  const live = container.querySelector(".reader-announcer")!;
  expect(live).toHaveTextContent("Page 1 of 196: The Prompt Issue cover");
  await user.keyboard("j");
  expect(live).toHaveTextContent(
    "Pages 2 and 3 of 196: Front matter and Front matter",
  );
  const before = live.textContent;
  const number = screen.getByLabelText("Page number", { exact: true });
  fireEvent.change(number, { target: { value: "3" } });
  fireEvent.submit(number.closest("form")!);
  expect(number).toHaveValue(3);
  expect(live.textContent).toBe(before);
  act(() => number.blur());
  await user.keyboard("{End}");
  expect(live).toHaveTextContent(`Page 196 of 196: ${titleAt(196)}`);
});

it("preserves focus reached before the lazy reader mounts", () => {
  const skip = document.createElement("a");
  skip.href = "#main";
  skip.textContent = "Skip to content";
  document.body.append(skip);
  try {
    skip.focus();
    renderReader();
    expect(skip).toHaveFocus();
  } finally {
    skip.remove();
  }
});

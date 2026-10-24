import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { MemoryRouter, useLocation } from "react-router-dom";

vi.mock("../src/content", async (importOriginal) => {
  const original = await importOriginal<typeof import("../src/content")>();
  return {
    ...original,
    prompts: original.prompts.map((prompt, index) =>
      index === 0
        ? { ...prompt, model: "Model A", parameters: { ar: "4:5" } }
        : index === 1
          ? { ...prompt, model: "Model B", prompt: `${prompt.prompt} --ar 3:2` }
          : prompt,
    ),
  };
});

import { ArchivePage } from "../src/pages/ArchivePage";

function QueryProbe() {
  const location = useLocation();
  return <div data-testid="query-string">{location.search}</div>;
}

it("offers recorded model and ratio values alongside missing metadata, with working URLs", async () => {
  const user = userEvent.setup();
  render(
    <MemoryRouter initialEntries={["/prompts"]}>
      <ArchivePage />
      <QueryProbe />
    </MemoryRouter>,
  );
  await user.click(screen.getByText("More filters", { exact: true }));
  const model = screen.getByRole("combobox", { name: "Model" });
  const ratio = screen.getByRole("combobox", { name: "Aspect Ratio" });
  expect(model).toBeVisible();
  expect(ratio).toBeVisible();
  expect([...model.querySelectorAll("option")].map((o) => o.value)).toEqual([
    "",
    "Model A",
    "Model B",
    "Unspecified",
  ]);
  expect([...ratio.querySelectorAll("option")].map((o) => o.value)).toEqual([
    "",
    "3:2",
    "4:5",
    "none",
  ]);
  await user.selectOptions(model, "Model A");
  await user.selectOptions(ratio, "4:5");
  expect(screen.getByTestId("query-string")).toHaveTextContent(
    "model=Model+A&ar=4%3A5",
  );
  expect(screen.getByRole("status")).toHaveTextContent("1 study");
  await user.click(screen.getByRole("button", { name: "Reset all filters" }));
  expect(screen.getByTestId("query-string")).toBeEmptyDOMElement();
  expect(screen.getByRole("searchbox", { name: "Search" })).toHaveFocus();
});

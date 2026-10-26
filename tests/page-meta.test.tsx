import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { expect, it } from "vitest";
import { usePageMeta } from "../src/hooks/usePageMeta";

function MetaProbe({
  title,
  description,
  image,
  path,
}: {
  title: string;
  description?: string;
  image?: string;
  path?: string;
}) {
  usePageMeta({ title, description, image, path });
  return null;
}

it("updates page metadata and restores index defaults on unmount", () => {
  document.head.innerHTML = `
    <meta name="description" content="Default description">
    <meta property="og:title" content="Default share title">
    <meta property="og:description" content="Default share description">
    <meta property="og:image" content="https://example.test/default.webp">
    <meta property="og:url" content="https://example.test/issue/">
  `;
  document.title = "Default title";

  const view = render(
    <MemoryRouter>
      <MetaProbe
        title="Study 12"
        description="A portrait study"
        image="/assets/study.webp"
        path="/prompts/study-12"
      />
    </MemoryRouter>,
  );

  expect(document.title).toBe("Study 12");
  expect(
    document.querySelector('meta[name="description"]')?.getAttribute("content"),
  ).toBe("A portrait study");
  expect(
    document
      .querySelector('meta[property="og:title"]')
      ?.getAttribute("content"),
  ).toBe("Study 12");
  expect(
    document
      .querySelector('meta[property="og:description"]')
      ?.getAttribute("content"),
  ).toBe("A portrait study");
  expect(
    document
      .querySelector('meta[property="og:image"]')
      ?.getAttribute("content"),
  ).toBe(new URL("/assets/study.webp", window.location.href).href);
  expect(
    document.querySelector('meta[property="og:url"]')?.getAttribute("content"),
  ).toBe(new URL("/prompts/study-12/", window.location.origin).href);
  expect(
    document.querySelector('link[rel="canonical"]')?.getAttribute("href"),
  ).toBe(new URL("/prompts/study-12/", window.location.origin).href);

  view.unmount();

  expect(document.title).toBe("Default title");
  expect(
    document.querySelector('meta[name="description"]')?.getAttribute("content"),
  ).toBe("Default description");
  expect(
    document
      .querySelector('meta[property="og:title"]')
      ?.getAttribute("content"),
  ).toBe("Default share title");
  expect(
    document
      .querySelector('meta[property="og:description"]')
      ?.getAttribute("content"),
  ).toBe("Default share description");
  expect(
    document
      .querySelector('meta[property="og:image"]')
      ?.getAttribute("content"),
  ).toBe("https://example.test/default.webp");
  expect(
    document.querySelector('meta[property="og:url"]')?.getAttribute("content"),
  ).toBe("https://example.test/issue/");
  expect(
    document.querySelector('link[rel="canonical"]')?.getAttribute("href"),
  ).toBe("https://example.test/issue/");
});

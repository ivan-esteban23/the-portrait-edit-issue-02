import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { ImageLightbox } from "../src/components/ImageLightbox";

beforeEach(() => localStorage.clear());
const point = (clientX: number, clientY: number) => ({ clientX, clientY });
function touchStart(
  viewport: HTMLElement,
  event: { touches: ReturnType<typeof point>[] },
) {
  fireEvent.touchStart(viewport, { ...event, changedTouches: event.touches });
}
function touchMove(
  viewport: HTMLElement,
  event: { touches: ReturnType<typeof point>[] },
) {
  fireEvent.touchMove(viewport, { ...event, changedTouches: event.touches });
}
function setup() {
  const onClose = vi.fn();
  const vibrate = vi.fn();
  vi.stubGlobal(
    "navigator",
    Object.assign(Object.create(navigator), { vibrate }),
  );
  const result = render(
    <ImageLightbox src="image.webp" alt="Reference" isOpen onClose={onClose} />,
  );
  const image = screen.getByAltText("Reference");
  const viewport = image.parentElement!;
  vi.spyOn(viewport, "getBoundingClientRect").mockReturnValue({
    x: 100,
    y: 50,
    left: 100,
    top: 50,
    width: 400,
    height: 600,
    right: 500,
    bottom: 650,
    toJSON: () => ({}),
  });
  return { ...result, image, viewport, onClose, vibrate };
}
function tap(viewport: HTMLElement, x: number, y: number) {
  touchStart(viewport, { touches: [point(x, y)] });
  fireEvent.touchEnd(viewport, { touches: [], changedTouches: [point(x, y)] });
}
it("zooms around a double-tap point and resets on a second double-tap without a synthetic double-click undoing it", () => {
  const { viewport, image, vibrate } = setup();
  tap(viewport, 200, 250);
  tap(viewport, 200, 250);
  expect(image.style.transform).toBe("translate(150px, 150px) scale(2.5)");
  expect(screen.getByText("250%")).toHaveAttribute("aria-live", "polite");
  fireEvent.doubleClick(viewport, { clientX: 200, clientY: 250 });
  expect(image.style.transform).toContain("scale(2.5)");
  tap(viewport, 200, 250);
  tap(viewport, 200, 250);
  expect(image.style.transform).toBe("translate(0px, 0px) scale(1)");
  expect(vibrate).toHaveBeenCalledTimes(2);
  expect(vibrate).toHaveBeenCalledWith(10);
});
it("centers desktop double-click zoom at the click location", () => {
  const { viewport, image } = setup();
  fireEvent.doubleClick(viewport, { clientX: 400, clientY: 450 });
  expect(image.style.transform).toBe("translate(-150px, -150px) scale(2.5)");
});
it("uses the initial pinch ratio and anchors the moving midpoint", () => {
  const { viewport, image } = setup();
  touchStart(viewport, {
    touches: [point(200, 250), point(300, 250)],
  });
  touchMove(viewport, {
    touches: [point(150, 250), point(350, 250)],
  });
  expect(image.style.transform).toBe("translate(50px, 100px) scale(2)");
  touchMove(viewport, {
    touches: [point(110, 270), point(410, 270)],
  });
  expect(image.style.transform).toBe("translate(110px, 220px) scale(3)");
});
it("clamps pinch, touch pan, mouse pan, double-click and zoom-out at viewport bounds", () => {
  const { viewport, image, vibrate } = setup();
  touchStart(viewport, {
    touches: [point(200, 250), point(300, 250)],
  });
  touchMove(viewport, {
    touches: [point(5000, 5000), point(6000, 5000)],
  });
  expect(image.style.transform).toBe("translate(600px, 900px) scale(4)");
  touchMove(viewport, {
    touches: [point(5000, 5000), point(6000, 5000)],
  });
  expect(vibrate).toHaveBeenCalledTimes(1);
  fireEvent.touchEnd(viewport, { touches: [point(5000, 5000)] });
  touchMove(viewport, { touches: [point(-5000, -5000)] });
  expect(image.style.transform).toBe("translate(-600px, -900px) scale(4)");
  fireEvent.touchEnd(viewport, {
    touches: [],
    changedTouches: [point(-5000, -5000)],
  });
  fireEvent.mouseDown(viewport, { clientX: 300, clientY: 350 });
  fireEvent.mouseMove(viewport, { clientX: 10000, clientY: 10000 });
  fireEvent.mouseUp(viewport);
  expect(image.style.transform).toBe("translate(600px, 900px) scale(4)");
  fireEvent.click(screen.getByRole("button", { name: "Zoom out" }));
  expect(image.style.transform).toBe("translate(500px, 750px) scale(3.5)");
  fireEvent.click(screen.getByRole("button", { name: "Reset zoom" }));
  fireEvent.doubleClick(viewport, { clientX: -10000, clientY: -10000 });
  // A synthesized mouse double-click immediately after touch must be ignored.
  expect(image.style.transform).toBe("translate(0px, 0px) scale(1)");
});
it("clamps desktop double-clicks beyond the image and re-clamps on resize", () => {
  const { viewport, image } = setup();
  fireEvent.doubleClick(viewport, { clientX: -1000, clientY: -1000 });
  expect(image.style.transform).toBe("translate(300px, 450px) scale(2.5)");
  vi.mocked(viewport.getBoundingClientRect).mockReturnValue({
    left: 100,
    top: 50,
    width: 200,
    height: 300,
  } as DOMRect);
  fireEvent(window, new Event("resize"));
  expect(image.style.transform).toBe("translate(150px, 225px) scale(2.5)");
});
it.each([
  [0, 71, true],
  [0, 70, false],
  [100, 80, false],
  [0, -100, false],
])("dismisses only an unzoomed downward swipe (%s, %s)", (dx, dy, dismiss) => {
  const { viewport, onClose } = setup();
  touchStart(viewport, { touches: [point(200, 250)] });
  touchMove(viewport, { touches: [point(200 + dx, 250 + dy)] });
  fireEvent.touchEnd(viewport, {
    touches: [],
    changedTouches: [point(200 + dx, 250 + dy)],
  });
  expect(onClose).toHaveBeenCalledTimes(dismiss ? 1 : 0);
});
it("never dismisses a zoomed pan, a pinch followed by one finger, or a canceled swipe", () => {
  const { viewport, onClose } = setup();
  fireEvent.click(screen.getByRole("button", { name: "Zoom in" }));
  touchStart(viewport, { touches: [point(200, 250)] });
  touchMove(viewport, { touches: [point(200, 400)] });
  fireEvent.touchEnd(viewport, {
    touches: [],
    changedTouches: [point(200, 400)],
  });
  fireEvent.click(screen.getByRole("button", { name: "Reset zoom" }));
  touchStart(viewport, {
    touches: [point(200, 250), point(300, 250)],
  });
  fireEvent.touchEnd(viewport, { touches: [point(200, 250)] });
  touchMove(viewport, { touches: [point(200, 400)] });
  fireEvent.touchEnd(viewport, {
    touches: [],
    changedTouches: [point(200, 400)],
  });
  touchStart(viewport, { touches: [point(200, 250)] });
  touchMove(viewport, { touches: [point(200, 400)] });
  fireEvent.touchCancel(viewport);
  expect(onClose).not.toHaveBeenCalled();
});
it("ignores zero-distance pinches and resets transforms on a new image", () => {
  const { viewport, image, rerender } = setup();
  touchStart(viewport, {
    touches: [point(200, 250), point(200, 250)],
  });
  touchMove(viewport, {
    touches: [point(100, 250), point(300, 250)],
  });
  expect(image.style.transform).toBe("translate(0px, 0px) scale(1)");
  fireEvent.click(screen.getByRole("button", { name: "Zoom in" }));
  rerender(
    <ImageLightbox src="new.webp" alt="Reference" isOpen onClose={() => {}} />,
  );
  expect(image.style.transform).toBe("translate(0px, 0px) scale(1)");
});

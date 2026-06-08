// src/testing/conformance.ts
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
function conformanceSuite(adapter) {
  const caps = {
    asChild: true,
    tagPolymorphism: true,
    domPropFiltering: true,
    ...adapter.capabilities
  };
  beforeEach(() => adapter.setup());
  afterEach(() => adapter.cleanup());
  describe("conformance \u2014 displayName", () => {
    it("sets displayName from name option", () => {
      const Comp = adapter.createComponent({ name: "MyBox" });
      expect(Comp.displayName).toBe("MyBox");
    });
    it("defaults to PolymorphicComponent", () => {
      const Comp = adapter.createComponent({});
      expect(Comp.displayName).toBe("PolymorphicComponent");
    });
  });
  if (caps.tagPolymorphism)
    describe("conformance \u2014 tag rendering", () => {
      it("renders default tag (div)", () => {
        const Box = adapter.createComponent({});
        const { element } = adapter.render(Box);
        expect(element.tagName.toLowerCase()).toBe("div");
      });
      it("renders a different tag via the as prop", () => {
        const Box = adapter.createComponent({});
        const { element } = adapter.render(Box, { as: "section" });
        expect(element.tagName.toLowerCase()).toBe("section");
      });
      it("respects a custom tag option", () => {
        const Box = adapter.createComponent({ tag: "span" });
        const { element } = adapter.render(Box);
        expect(element.tagName.toLowerCase()).toBe("span");
      });
    });
  describe("conformance \u2014 class merging", () => {
    it("applies base class", () => {
      const Box = adapter.createComponent({ styling: { base: "base-cls" } });
      const { element } = adapter.render(Box);
      expect(element.className).toContain("base-cls");
    });
    it("merges caller class with base class", () => {
      const Box = adapter.createComponent({ styling: { base: "base" } });
      const { element } = adapter.render(Box, { class: "extra" });
      expect(element.className).toContain("base");
      expect(element.className).toContain("extra");
    });
  });
  describe("conformance \u2014 style forwarding", () => {
    it("applies an inline style object", () => {
      const Box = adapter.createComponent({});
      const { element } = adapter.render(Box, { style: { color: "red" } });
      expect(element.style.color).toBe("red");
    });
  });
  describe("conformance \u2014 prop forwarding", () => {
    it("forwards extra attributes to the DOM element", () => {
      const Box = adapter.createComponent({});
      const { element } = adapter.render(Box, { "data-testid": "box" });
      expect(element.getAttribute("data-testid")).toBe("box");
    });
    if (caps.domPropFiltering)
      it("strips variant keys before DOM forwarding", () => {
        const Box = adapter.createComponent({
          styling: { variants: { size: { sm: "text-sm", lg: "text-lg" } } }
        });
        const { element } = adapter.render(Box, { size: "lg" });
        expect(element.getAttribute("size")).toBeNull();
      });
    if (caps.domPropFiltering)
      it("custom filterProps strips matching keys", () => {
        const Box = adapter.createComponent({
          filterProps: (key) => key === "loading"
        });
        const { element } = adapter.render(Box, { loading: "true", "data-keep": "yes" });
        expect(element.getAttribute("loading")).toBeNull();
        expect(element.getAttribute("data-keep")).toBe("yes");
      });
  });
  describe("conformance \u2014 ARIA forwarding", () => {
    it("forwards aria-label to the DOM element", () => {
      const Box = adapter.createComponent({});
      const { element } = adapter.render(Box, { "aria-label": "Close" });
      expect(element.getAttribute("aria-label")).toBe("Close");
    });
    it("forwards aria-describedby to the DOM element", () => {
      const Box = adapter.createComponent({});
      const { element } = adapter.render(Box, { "aria-describedby": "hint" });
      expect(element.getAttribute("aria-describedby")).toBe("hint");
    });
    it("forwards a non-redundant role to the DOM element", () => {
      const Box = adapter.createComponent({});
      const { element } = adapter.render(Box, { role: "dialog" });
      expect(element.getAttribute("role")).toBe("dialog");
    });
  });
  describe("conformance \u2014 event forwarding", () => {
    it("fires onClick handler", () => {
      let called = false;
      const Box = adapter.createComponent({});
      const { element } = adapter.render(Box, {
        onClick: () => {
          called = true;
        }
      });
      element.click();
      expect(called).toBe(true);
    });
    it("fires onFocus handler", () => {
      let called = false;
      const Box = adapter.createComponent({});
      const { element } = adapter.render(Box, {
        onFocus: () => {
          called = true;
        }
      });
      element.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
      element.dispatchEvent(new FocusEvent("focus"));
      expect(called).toBe(true);
    });
    it("fires onBlur handler", () => {
      let called = false;
      const Box = adapter.createComponent({});
      const { element } = adapter.render(Box, {
        onBlur: () => {
          called = true;
        }
      });
      element.dispatchEvent(new FocusEvent("focusout", { bubbles: true }));
      element.dispatchEvent(new FocusEvent("blur"));
      expect(called).toBe(true);
    });
  });
  if (adapter.createRef) {
    describe("conformance \u2014 ref forwarding", () => {
      it("forwards ref to the DOM element", () => {
        const ref = adapter.createRef();
        const Box = adapter.createComponent({});
        adapter.render(Box, { ref });
        expect(ref.current).toBeInstanceOf(HTMLElement);
      });
      it("forwards ref when rendered as a different tag", () => {
        const ref = adapter.createRef();
        const Box = adapter.createComponent({});
        adapter.render(Box, { as: "button", ref });
        expect(ref.current).toBeInstanceOf(HTMLElement);
        expect(ref.current.tagName.toLowerCase()).toBe("button");
      });
      if (caps.asChild)
        it("forwards ref through asChild to the inner element", () => {
          const ref = adapter.createRef();
          const Box = adapter.createComponent({});
          adapter.render(Box, { asChild: true, ref }, [{ tag: "button" }]);
          expect(ref.current).toBeInstanceOf(HTMLElement);
          expect(ref.current.tagName.toLowerCase()).toBe("button");
        });
    });
  }
  describe("conformance \u2014 children", () => {
    it("renders children", () => {
      const Box = adapter.createComponent({});
      const { element } = adapter.render(Box, {}, [{ tag: "span", props: { id: "child" } }]);
      expect(element.querySelector("span#child")).toBeTruthy();
    });
  });
  if (caps.asChild)
    describe("conformance \u2014 asChild", () => {
      it("renders the child element type instead of the default tag", () => {
        const Box = adapter.createComponent({});
        const { element } = adapter.render(Box, { asChild: true }, [{ tag: "button" }]);
        expect(element.tagName.toLowerCase()).toBe("button");
      });
      it("merges base class onto the asChild element", () => {
        const Box = adapter.createComponent({ styling: { base: "box-cls" } });
        const { element } = adapter.render(Box, { asChild: true }, [{ tag: "button" }]);
        expect(element.className).toContain("box-cls");
      });
      it("throws when asChild has zero children", () => {
        const Box = adapter.createComponent({});
        expect(() => adapter.render(Box, { asChild: true }, [])).toThrow();
      });
      it("throws when asChild has multiple children", () => {
        const Box = adapter.createComponent({});
        expect(
          () => adapter.render(Box, { asChild: true }, [{ tag: "span" }, { tag: "span" }])
        ).toThrow();
      });
      it("throws when as and asChild are both provided", () => {
        const Box = adapter.createComponent({});
        expect(() => adapter.render(Box, { as: "button", asChild: true }, [{ tag: "a" }])).toThrow();
      });
      it("nested asChild: composes classes from both components onto the inner element", () => {
        const BoxA = adapter.createComponent({ styling: { base: "class-a" } });
        const BoxB = adapter.createComponent({ styling: { base: "class-b" } });
        const { element } = adapter.render(BoxA, { asChild: true }, [
          { component: BoxB, props: { asChild: true }, children: [{ tag: "button" }] }
        ]);
        expect(element.className).toContain("class-a");
        expect(element.className).toContain("class-b");
        expect(element.tagName.toLowerCase()).toBe("button");
      });
    });
  describe("conformance \u2014 variants", () => {
    it("applies variant class via default", () => {
      const Box = adapter.createComponent({
        styling: {
          variants: { intent: { primary: "bg-blue", secondary: "bg-gray" } },
          defaults: { intent: "primary" }
        }
      });
      const { element } = adapter.render(Box);
      expect(element.className).toContain("bg-blue");
    });
    it("applies variant class from prop", () => {
      const Box = adapter.createComponent({
        styling: { variants: { size: { sm: "text-sm", lg: "text-lg" } } }
      });
      const { element } = adapter.render(Box, { size: "lg" });
      expect(element.className).toContain("text-lg");
    });
    it("applies compound class when all conditions are met", () => {
      const Box = adapter.createComponent({
        styling: {
          variants: {
            intent: { primary: "btn-primary", secondary: "btn-secondary" },
            size: { sm: "btn-sm", lg: "btn-lg" }
          },
          compounds: [{ intent: "primary", size: "lg", class: "btn-primary-lg" }]
        }
      });
      const { element } = adapter.render(Box, { intent: "primary", size: "lg" });
      expect(element.className).toContain("btn-primary-lg");
    });
    it("does not apply compound class when only some conditions are met", () => {
      const Box = adapter.createComponent({
        styling: {
          variants: {
            intent: { primary: "btn-primary", secondary: "btn-secondary" },
            size: { sm: "btn-sm", lg: "btn-lg" }
          },
          compounds: [{ intent: "primary", size: "lg", class: "btn-primary-lg" }]
        }
      });
      const { element } = adapter.render(Box, { intent: "primary", size: "sm" });
      expect(element.className).not.toContain("btn-primary-lg");
    });
    it("activates a preset via variantKey", () => {
      const Box = adapter.createComponent({
        styling: {
          variants: {
            intent: { primary: "bg-blue", secondary: "bg-gray" },
            size: { sm: "text-sm", lg: "text-lg" }
          },
          presets: { cta: { intent: "primary", size: "lg" } }
        }
      });
      const { element } = adapter.render(Box, { variantKey: "cta" });
      expect(element.className).toContain("bg-blue");
      expect(element.className).toContain("text-lg");
    });
  });
  describe("conformance \u2014 enforcement", () => {
    it("throws when children count is below min (strict: throw)", () => {
      const Group = adapter.createComponent({
        enforcement: {
          strict: "throw",
          children: [
            { name: "Item", match: (c) => !!c || !c, cardinality: { min: 2 } }
          ]
        }
      });
      expect(() => adapter.render(Group, {}, [{ tag: "span" }])).toThrow();
    });
    it("throws when children count exceeds max (strict: throw)", () => {
      const Group = adapter.createComponent({
        enforcement: {
          strict: "throw",
          children: [
            { name: "Item", match: (c) => !!c || !c, cardinality: { max: 2 } }
          ]
        }
      });
      expect(
        () => adapter.render(Group, {}, [{ tag: "span" }, { tag: "span" }, { tag: "span" }])
      ).toThrow();
    });
    it("warns but does not throw when strict is warn", () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {
      });
      const Group = adapter.createComponent({
        enforcement: {
          strict: "warn",
          children: [
            {
              name: "Item",
              match: (c) => !!c || !c,
              cardinality: { min: 2, max: 2 }
            }
          ]
        }
      });
      expect(() => adapter.render(Group, {}, [{ tag: "span" }])).not.toThrow();
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });
    it("is silent when strict is false", () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {
      });
      const Group = adapter.createComponent({
        enforcement: {
          strict: false,
          children: [
            {
              name: "Item",
              match: (c) => !!c || !c,
              cardinality: { min: 2, max: 2 }
            }
          ]
        }
      });
      expect(() => adapter.render(Group, {}, [{ tag: "span" }])).not.toThrow();
      expect(warnSpy).not.toHaveBeenCalled();
      warnSpy.mockRestore();
    });
  });
  describe("conformance \u2014 reactivity", () => {
    it("updates class when variant prop changes on rerender", () => {
      const Box = adapter.createComponent({
        styling: { variants: { size: { sm: "text-sm", lg: "text-lg" } } }
      });
      const result = adapter.render(Box, { size: "sm" });
      expect(result.element.className).toContain("text-sm");
      result.rerender({ size: "lg" });
      expect(result.element.className).toContain("text-lg");
    });
    if (caps.tagPolymorphism)
      it("switches rendered tag on rerender with a new as prop", () => {
        const Box = adapter.createComponent({});
        const result = adapter.render(Box, { as: "div" });
        expect(result.element.tagName.toLowerCase()).toBe("div");
        result.rerender({ as: "section" });
        expect(result.element.tagName.toLowerCase()).toBe("section");
      });
  });
}

// src/testing/a11y.ts
import { describe as describe2, it as it2, expect as expect2 } from "vitest";
function conformanceA11ySuite(adapter) {
  describe2("a11y \u2014 tabIndex", () => {
    it2("forwards tabIndex={0} to the DOM element", () => {
      const Box = adapter.createComponent({});
      const { element } = adapter.render(Box, { tabIndex: 0 });
      expect2(element.getAttribute("tabindex")).toBe("0");
    });
    it2("forwards tabIndex={-1} to the DOM element", () => {
      const Box = adapter.createComponent({});
      const { element } = adapter.render(Box, { tabIndex: -1 });
      expect2(element.getAttribute("tabindex")).toBe("-1");
    });
    it2("element with tabIndex={0} is focusable", () => {
      const Box = adapter.createComponent({});
      const { element } = adapter.render(Box, { tabIndex: 0 });
      element.focus();
      expect2(document.activeElement).toBe(element);
    });
  });
  describe2("a11y \u2014 focus and blur events", () => {
    it2("fires onFocus handler when element receives focus", () => {
      let called = false;
      const Box = adapter.createComponent({});
      const { element } = adapter.render(Box, {
        tabIndex: 0,
        onFocus: () => {
          called = true;
        }
      });
      element.focus();
      expect2(called).toBe(true);
    });
    it2("fires onBlur handler on blur dispatch", () => {
      let called = false;
      const Box = adapter.createComponent({});
      const { element } = adapter.render(Box, {
        onBlur: () => {
          called = true;
        }
      });
      element.dispatchEvent(new FocusEvent("focusout", { bubbles: true }));
      element.dispatchEvent(new FocusEvent("blur"));
      expect2(called).toBe(true);
    });
  });
  describe2("a11y \u2014 keyboard events", () => {
    it2("fires onKeyDown handler", () => {
      let key = "";
      const Box = adapter.createComponent({});
      const { element } = adapter.render(Box, {
        onKeyDown: (e) => {
          key = e.key;
        }
      });
      element.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
      expect2(key).toBe("Enter");
    });
    it2("fires onKeyUp handler", () => {
      let key = "";
      const Box = adapter.createComponent({});
      const { element } = adapter.render(Box, {
        onKeyUp: (e) => {
          key = e.key;
        }
      });
      element.dispatchEvent(new KeyboardEvent("keyup", { key: "Escape", bubbles: true }));
      expect2(key).toBe("Escape");
    });
    it2("fires onKeyDown for Space key", () => {
      let key = "";
      const Box = adapter.createComponent({});
      const { element } = adapter.render(Box, {
        onKeyDown: (e) => {
          key = e.key;
        }
      });
      element.dispatchEvent(new KeyboardEvent("keydown", { key: " ", bubbles: true }));
      expect2(key).toBe(" ");
    });
  });
  describe2("a11y \u2014 keyboard activation patterns", () => {
    it2("role=button element activates on Enter key", () => {
      let activated = false;
      const Box = adapter.createComponent({});
      const { element } = adapter.render(Box, {
        role: "button",
        tabIndex: 0,
        onKeyDown: (e) => {
          if (e.key === "Enter") activated = true;
        }
      });
      element.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
      expect2(activated).toBe(true);
    });
    it2("role=button element activates on Space key", () => {
      let activated = false;
      const Box = adapter.createComponent({});
      const { element } = adapter.render(Box, {
        role: "button",
        tabIndex: 0,
        onKeyDown: (e) => {
          if (e.key === " ") activated = true;
        }
      });
      element.dispatchEvent(new KeyboardEvent("keydown", { key: " ", bubbles: true }));
      expect2(activated).toBe(true);
    });
  });
  describe2("a11y \u2014 disabled state", () => {
    it2("forwards disabled attribute on a button", () => {
      const Button = adapter.createComponent({ tag: "button" });
      const { element } = adapter.render(Button, { disabled: true });
      expect2(element.hasAttribute("disabled")).toBe(true);
    });
    it2("updates disabled state on rerender", () => {
      const Button = adapter.createComponent({ tag: "button" });
      const result = adapter.render(Button, { disabled: false });
      expect2(result.element.hasAttribute("disabled")).toBe(false);
      result.rerender({ disabled: true });
      expect2(result.element.hasAttribute("disabled")).toBe(true);
    });
  });
  describe2("a11y \u2014 interactive ARIA attributes", () => {
    it2("forwards aria-expanded", () => {
      const Box = adapter.createComponent({});
      const { element } = adapter.render(Box, { "aria-expanded": "true" });
      expect2(element.getAttribute("aria-expanded")).toBe("true");
    });
    it2("forwards aria-pressed", () => {
      const Box = adapter.createComponent({});
      const { element } = adapter.render(Box, { "aria-pressed": "true" });
      expect2(element.getAttribute("aria-pressed")).toBe("true");
    });
    it2("forwards aria-controls", () => {
      const Box = adapter.createComponent({});
      const { element } = adapter.render(Box, { "aria-controls": "menu-id" });
      expect2(element.getAttribute("aria-controls")).toBe("menu-id");
    });
    it2("forwards aria-disabled", () => {
      const Box = adapter.createComponent({});
      const { element } = adapter.render(Box, { "aria-disabled": "true" });
      expect2(element.getAttribute("aria-disabled")).toBe("true");
    });
    it2("forwards aria-labelledby", () => {
      const Box = adapter.createComponent({});
      const { element } = adapter.render(Box, { "aria-labelledby": "label-id" });
      expect2(element.getAttribute("aria-labelledby")).toBe("label-id");
    });
    it2("forwards aria-describedby", () => {
      const Box = adapter.createComponent({});
      const { element } = adapter.render(Box, { "aria-describedby": "help-text" });
      expect2(element.getAttribute("aria-describedby")).toBe("help-text");
    });
    it2("forwards aria-live", () => {
      const Box = adapter.createComponent({});
      const { element } = adapter.render(Box, { "aria-live": "polite" });
      expect2(element.getAttribute("aria-live")).toBe("polite");
    });
    it2("forwards role=button on a non-button element", () => {
      const Box = adapter.createComponent({});
      const { element } = adapter.render(Box, { role: "button" });
      expect2(element.getAttribute("role")).toBe("button");
    });
    it2("updates aria-expanded on rerender", () => {
      const Box = adapter.createComponent({});
      const result = adapter.render(Box, { "aria-expanded": "false" });
      expect2(result.element.getAttribute("aria-expanded")).toBe("false");
      result.rerender({ "aria-expanded": "true" });
      expect2(result.element.getAttribute("aria-expanded")).toBe("true");
    });
  });
  describe2("a11y \u2014 data attributes", () => {
    it2("forwards data-state", () => {
      const Box = adapter.createComponent({});
      const { element } = adapter.render(Box, { "data-state": "open" });
      expect2(element.getAttribute("data-state")).toBe("open");
    });
    it2("forwards data-disabled", () => {
      const Box = adapter.createComponent({});
      const { element } = adapter.render(Box, { "data-disabled": "" });
      expect2(element.hasAttribute("data-disabled")).toBe(true);
    });
  });
}

// src/testing/ssr.ts
import { describe as describe3, it as it3, expect as expect3 } from "vitest";
function ssrConformanceSuite(adapter) {
  describe3("ssr \u2014 basic rendering", () => {
    it3("renders without accessing browser globals", async () => {
      const Box = adapter.createComponent({ enforcement: { strict: false } });
      const result = adapter.renderToString(Box);
      await expect3(Promise.resolve(result)).resolves.not.toThrow();
    });
    it3("renders default tag (div) to HTML", async () => {
      const Box = adapter.createComponent({ enforcement: { strict: false } });
      const html = await adapter.renderToString(Box);
      expect3(html).toMatch(/<div[\s>]/);
    });
    it3("respects a custom tag option", async () => {
      const Nav = adapter.createComponent({ tag: "nav", enforcement: { strict: false } });
      const html = await adapter.renderToString(Nav);
      expect3(html).toMatch(/<nav[\s>]/);
    });
    it3("as prop overrides the default tag", async () => {
      const Box = adapter.createComponent({ enforcement: { strict: false } });
      const html = await adapter.renderToString(Box, { as: "section" });
      expect3(html).toMatch(/<section[\s>]/);
      expect3(html).not.toMatch(/<div[\s>]/);
    });
  });
  describe3("ssr \u2014 class output", () => {
    it3("applies base class", async () => {
      const Box = adapter.createComponent({
        styling: { base: "box-base" },
        enforcement: { strict: false }
      });
      const html = await adapter.renderToString(Box);
      expect3(html).toContain("box-base");
    });
    it3("applies variant class from default", async () => {
      const Box = adapter.createComponent({
        styling: {
          variants: { size: { sm: "text-sm", lg: "text-lg" } },
          defaults: { size: "lg" }
        },
        enforcement: { strict: false }
      });
      const html = await adapter.renderToString(Box);
      expect3(html).toContain("text-lg");
    });
    it3("applies variant class from prop", async () => {
      const Box = adapter.createComponent({
        styling: { variants: { size: { sm: "text-sm", lg: "text-lg" } } },
        enforcement: { strict: false }
      });
      const html = await adapter.renderToString(Box, { size: "sm" });
      expect3(html).toContain("text-sm");
    });
    it3("merges caller class with base", async () => {
      const Box = adapter.createComponent({
        styling: { base: "base" },
        enforcement: { strict: false }
      });
      const html = await adapter.renderToString(Box, { class: "extra" });
      expect3(html).toContain("base");
      expect3(html).toContain("extra");
    });
    it3("applies compound variant class", async () => {
      const Box = adapter.createComponent({
        styling: {
          base: "btn",
          variants: {
            size: { sm: "btn-sm", lg: "btn-lg" },
            intent: { primary: "btn-primary", ghost: "btn-ghost" }
          },
          compounds: [{ size: "lg", intent: "ghost", class: "btn-lg-ghost" }]
        },
        enforcement: { strict: false }
      });
      const html = await adapter.renderToString(Box, { size: "lg", intent: "ghost" });
      const classAttr = html.match(/class="([^"]*)"/)?.[1] ?? "";
      expect3(classAttr.split(" ")).toContain("btn-lg-ghost");
    });
  });
  describe3("ssr \u2014 prop forwarding", () => {
    it3("forwards data attributes", async () => {
      const Box = adapter.createComponent({ enforcement: { strict: false } });
      const html = await adapter.renderToString(Box, { "data-testid": "box" });
      expect3(html).toContain('data-testid="box"');
    });
    it3("forwards aria-label", async () => {
      const Box = adapter.createComponent({ enforcement: { strict: false } });
      const html = await adapter.renderToString(Box, { "aria-label": "Close" });
      expect3(html).toContain('aria-label="Close"');
    });
  });
  describe3("ssr \u2014 boolean attributes", () => {
    it3("renders disabled on a button element", async () => {
      const Button = adapter.createComponent({ tag: "button", enforcement: { strict: false } });
      const html = await adapter.renderToString(Button, { disabled: true });
      expect3(html).toMatch(/disabled/);
    });
    it3("renders hidden attribute", async () => {
      const Box = adapter.createComponent({ enforcement: { strict: false } });
      const html = await adapter.renderToString(Box, { hidden: true });
      expect3(html).toMatch(/hidden/);
    });
  });
  describe3("ssr \u2014 attribute escaping", () => {
    it3("escapes double quotes in aria-label", async () => {
      const Box = adapter.createComponent({ enforcement: { strict: false } });
      const html = await adapter.renderToString(Box, { "aria-label": 'Hello "world"' });
      expect3(html).not.toContain('aria-label="Hello "world""');
      expect3(html).toMatch(/aria-label=/);
    });
    it3("does not produce a bare script element from a data attribute value", async () => {
      const Box = adapter.createComponent({ enforcement: { strict: false } });
      const html = await adapter.renderToString(Box, { "data-value": "<b>text</b>" });
      expect3(html).toContain("data-value=");
      expect3(html).not.toMatch(/<b>text<\/b>(?=[^"]|$)/);
    });
  });
  describe3("ssr \u2014 ARIA normalisation", () => {
    it3("strips redundant role (nav has implicit role=navigation)", async () => {
      const Nav = adapter.createComponent({ tag: "nav", enforcement: { strict: false } });
      const html = await adapter.renderToString(Nav, { role: "navigation" });
      expect3(html).toContain("<nav");
      expect3(html).not.toContain("role=");
    });
    it3("forwards non-redundant role", async () => {
      const Box = adapter.createComponent({ enforcement: { strict: false } });
      const html = await adapter.renderToString(Box, { role: "dialog" });
      expect3(html).toContain('role="dialog"');
    });
  });
}

// src/testing/hydration.ts
import { beforeEach as beforeEach2, afterEach as afterEach2, describe as describe4, it as it4, expect as expect4 } from "vitest";
function parseAttributes(html) {
  const tpl = document.createElement("template");
  tpl.innerHTML = html;
  const child = tpl.content.firstElementChild;
  if (!child) return {};
  const out = {};
  for (const { name, value } of child.attributes) {
    out[name] = value;
  }
  return out;
}
function normalizeAttrs(attrs) {
  const out = {};
  for (const [k, v] of Object.entries(attrs)) {
    out[k] = k === "class" ? v.split(" ").sort().join(" ") : v;
  }
  return out;
}
async function ssrAttrs(adapter, comp, props) {
  const html = await adapter.renderToString(comp, props);
  return normalizeAttrs(parseAttributes(html));
}
async function domAttrs(adapter, comp, props) {
  const el = await adapter.renderToDOM(comp, props);
  const out = {};
  for (const { name, value } of el.attributes) {
    out[name] = value;
  }
  return normalizeAttrs(out);
}
function hydrationParitySuite(adapter) {
  beforeEach2(() => adapter.setup());
  afterEach2(() => adapter.cleanup());
  describe4("hydration parity \u2014 class attributes", () => {
    it4("base class matches between server and client", async () => {
      const Box = adapter.createComponent({
        styling: { base: "box-base" },
        enforcement: { strict: false }
      });
      expect4(await ssrAttrs(adapter, Box)).toEqual(await domAttrs(adapter, Box));
    });
    it4("variant class matches between server and client", async () => {
      const Box = adapter.createComponent({
        styling: {
          variants: { size: { sm: "box-sm", lg: "box-lg" } },
          defaults: { size: "lg" }
        },
        enforcement: { strict: false }
      });
      expect4(await ssrAttrs(adapter, Box)).toEqual(await domAttrs(adapter, Box));
    });
    it4("compound variant class matches between server and client", async () => {
      const Box = adapter.createComponent({
        styling: {
          base: "btn",
          variants: {
            size: { sm: "btn-sm", lg: "btn-lg" },
            intent: { primary: "btn-primary", ghost: "btn-ghost" }
          },
          compounds: [{ size: "lg", intent: "ghost", class: "btn-lg-ghost" }]
        },
        enforcement: { strict: false }
      });
      const props = { size: "lg", intent: "ghost" };
      const s = await ssrAttrs(adapter, Box, props);
      const d = await domAttrs(adapter, Box, props);
      expect4(s).toEqual(d);
      expect4(s["class"]?.split(" ")).toContain("btn-lg-ghost");
    });
  });
  describe4("hydration parity \u2014 ARIA normalisation", () => {
    it4("redundant role absent on both server and client", async () => {
      const Nav = adapter.createComponent({ tag: "nav", enforcement: { strict: false } });
      const props = { role: "navigation" };
      const s = await ssrAttrs(adapter, Nav, props);
      const d = await domAttrs(adapter, Nav, props);
      expect4(s).not.toHaveProperty("role");
      expect4(d).not.toHaveProperty("role");
      expect4(s).toEqual(d);
    });
    it4("non-redundant role present on both server and client", async () => {
      const Box = adapter.createComponent({ enforcement: { strict: false } });
      const props = { role: "dialog" };
      const s = await ssrAttrs(adapter, Box, props);
      const d = await domAttrs(adapter, Box, props);
      expect4(s["role"]).toBe("dialog");
      expect4(d["role"]).toBe("dialog");
    });
  });
  describe4("hydration parity \u2014 tag and props", () => {
    it4("as prop override: tag matches between server and client", async () => {
      const Box = adapter.createComponent({ enforcement: { strict: false } });
      const props = { as: "section" };
      const serverHtml = await adapter.renderToString(Box, props);
      const clientEl = await adapter.renderToDOM(Box, props);
      expect4(serverHtml).toContain("<section");
      expect4(clientEl.tagName.toLowerCase()).toBe("section");
    });
  });
}

// src/testing/performance.ts
import { describe as describe5, it as it5, expect as expect5 } from "vitest";
function conformancePerformanceSuite(adapter) {
  describe5("conformance \u2014 deterministic class generation", () => {
    it5("repeated renders with identical props produce the same className", () => {
      const Box = adapter.createComponent({
        styling: {
          base: "box-base",
          variants: { size: { sm: "text-sm", lg: "text-lg" } },
          defaults: { size: "sm" }
        },
        enforcement: { strict: false }
      });
      const result = adapter.render(Box, { size: "lg" });
      const first = result.element.className;
      result.rerender({ size: "lg" });
      expect5(result.element.className).toBe(first);
      result.rerender({ size: "lg" });
      expect5(result.element.className).toBe(first);
    });
    it5("repeated renders without props produce the same className", () => {
      const Box = adapter.createComponent({
        styling: { base: "base", variants: { size: { sm: "text-sm" } }, defaults: { size: "sm" } },
        enforcement: { strict: false }
      });
      const result = adapter.render(Box);
      const first = result.element.className;
      result.rerender();
      expect5(result.element.className).toBe(first);
    });
    it5("different variant values produce different className", () => {
      const Box = adapter.createComponent({
        styling: { variants: { size: { sm: "text-sm", lg: "text-lg" } } },
        enforcement: { strict: false }
      });
      const result = adapter.render(Box, { size: "sm" });
      const small = result.element.className;
      result.rerender({ size: "lg" });
      const large = result.element.className;
      expect5(small).not.toBe(large);
      expect5(small).toContain("text-sm");
      expect5(large).toContain("text-lg");
    });
    it5("base class is always present after multiple variant changes", () => {
      const Box = adapter.createComponent({
        styling: {
          base: "base-cls",
          variants: { size: { sm: "text-sm", lg: "text-lg" } }
        },
        enforcement: { strict: false }
      });
      const result = adapter.render(Box, { size: "sm" });
      expect5(result.element.className).toContain("base-cls");
      result.rerender({ size: "lg" });
      expect5(result.element.className).toContain("base-cls");
      result.rerender({ size: "sm" });
      expect5(result.element.className).toContain("base-cls");
    });
    it5("interleaved renders of two components are independent", () => {
      const Box = adapter.createComponent({
        styling: { base: "box", variants: { size: { sm: "text-sm", lg: "text-lg" } } },
        enforcement: { strict: false }
      });
      const Button = adapter.createComponent({
        styling: { base: "btn", variants: { intent: { primary: "btn-primary" } } },
        enforcement: { strict: false }
      });
      const boxResult = adapter.render(Box, { size: "sm" });
      const btnResult = adapter.render(Button, { intent: "primary" });
      expect5(boxResult.element.className).toContain("box");
      expect5(boxResult.element.className).toContain("text-sm");
      expect5(btnResult.element.className).toContain("btn");
      expect5(btnResult.element.className).toContain("btn-primary");
      boxResult.rerender({ size: "lg" });
      expect5(btnResult.element.className).toContain("btn");
      expect5(btnResult.element.className).toContain("btn-primary");
      expect5(btnResult.element.className).not.toContain("text-lg");
    });
    it5("compound variant output is stable across repeated renders", () => {
      const Box = adapter.createComponent({
        styling: {
          base: "base",
          variants: {
            size: { sm: "text-sm", lg: "text-lg" },
            intent: { primary: "bg-blue", ghost: "bg-transparent" }
          },
          compounds: [{ size: "lg", intent: "primary", class: "compound-cls" }]
        },
        enforcement: { strict: false }
      });
      const result = adapter.render(Box, { size: "lg", intent: "primary" });
      const first = result.element.className;
      expect5(first).toContain("compound-cls");
      result.rerender({ size: "lg", intent: "primary" });
      expect5(result.element.className).toBe(first);
    });
    it5("compound class appears and disappears correctly across re-renders", () => {
      const Box = adapter.createComponent({
        styling: {
          base: "base",
          variants: {
            size: { sm: "text-sm", lg: "text-lg" },
            intent: { primary: "bg-blue", ghost: "bg-transparent" }
          },
          compounds: [{ size: "lg", intent: "primary", class: "compound-cls" }]
        },
        enforcement: { strict: false }
      });
      const result = adapter.render(Box, { size: "lg", intent: "primary" });
      expect5(result.element.className).toContain("compound-cls");
      result.rerender({ size: "lg", intent: "ghost" });
      expect5(result.element.className).not.toContain("compound-cls");
      result.rerender({ size: "lg", intent: "primary" });
      expect5(result.element.className).toContain("compound-cls");
    });
    it5("repeated re-renders do not accumulate duplicate classes", () => {
      const Box = adapter.createComponent({
        styling: {
          base: "base",
          variants: { size: { lg: "text-lg" } }
        },
        enforcement: { strict: false }
      });
      const result = adapter.render(Box, { size: "lg" });
      result.rerender({ size: "lg" });
      result.rerender({ size: "lg" });
      const cls = result.element.className;
      expect5((cls.match(/\btext-lg\b/g) ?? []).length).toBe(1);
      expect5((cls.match(/\bbase\b/g) ?? []).length).toBe(1);
    });
    it5("two instances of the same component are independent", () => {
      const Box = adapter.createComponent({
        styling: { base: "box", variants: { size: { sm: "text-sm", lg: "text-lg" } } },
        enforcement: { strict: false }
      });
      const a = adapter.render(Box, { size: "sm" });
      const b = adapter.render(Box, { size: "lg" });
      expect5(a.element.className).toContain("text-sm");
      expect5(a.element.className).not.toContain("text-lg");
      expect5(b.element.className).toContain("text-lg");
      expect5(b.element.className).not.toContain("text-sm");
      a.rerender({ size: "lg" });
      expect5(a.element.className).toContain("text-lg");
      expect5(b.element.className).toContain("text-lg");
      expect5(b.element.className).not.toContain("text-sm");
    });
    it5("omitted variant prop and undefined variant prop produce the same default output", () => {
      const Box = adapter.createComponent({
        styling: {
          variants: { size: { sm: "text-sm", lg: "text-lg" } },
          defaults: { size: "sm" }
        },
        enforcement: { strict: false }
      });
      const withUndefined = adapter.render(Box, { size: void 0 }).element.className;
      const withOmitted = adapter.render(Box).element.className;
      expect5(withUndefined).toBe(withOmitted);
      expect5(withOmitted).toContain("text-sm");
    });
  });
}

// src/testing/isolation.ts
import { describe as describe6, it as it6, expect as expect6 } from "vitest";
function conformanceIsolationSuite(adapter) {
  const caps = { domPropFiltering: true, ...adapter.capabilities };
  describe6("conformance \u2014 component isolation", () => {
    it6("two components with different base classes render independently", () => {
      const Box = adapter.createComponent({
        styling: { base: "box-base" },
        enforcement: { strict: false }
      });
      const Button = adapter.createComponent({
        styling: { base: "btn-base" },
        enforcement: { strict: false }
      });
      const boxEl = adapter.render(Box).element;
      const btnEl = adapter.render(Button).element;
      expect6(boxEl.className).toContain("box-base");
      expect6(boxEl.className).not.toContain("btn-base");
      expect6(btnEl.className).toContain("btn-base");
      expect6(btnEl.className).not.toContain("box-base");
    });
    it6("variant definitions on one component do not affect another", () => {
      const Box = adapter.createComponent({
        styling: { variants: { size: { sm: "text-sm", lg: "text-lg" } } },
        enforcement: { strict: false }
      });
      const Button = adapter.createComponent({
        styling: { variants: { intent: { primary: "bg-blue", ghost: "bg-transparent" } } },
        enforcement: { strict: false }
      });
      const boxEl = adapter.render(Box, { size: "lg" }).element;
      const btnEl = adapter.render(Button, { intent: "primary" }).element;
      expect6(boxEl.className).toContain("text-lg");
      expect6(boxEl.className).not.toContain("bg-blue");
      expect6(btnEl.className).toContain("bg-blue");
      expect6(btnEl.className).not.toContain("text-lg");
    });
    it6("default variants on one component do not apply to another", () => {
      const Box = adapter.createComponent({
        styling: {
          variants: { size: { sm: "text-sm", lg: "text-lg" } },
          defaults: { size: "lg" }
        },
        enforcement: { strict: false }
      });
      const Button = adapter.createComponent({
        styling: { variants: { size: { sm: "text-sm", lg: "text-lg" } } },
        enforcement: { strict: false }
      });
      adapter.render(Box);
      adapter.render(Box);
      const btnEl = adapter.render(Button).element;
      expect6(btnEl.className).not.toContain("text-lg");
      expect6(btnEl.className).not.toContain("text-sm");
    });
    if (caps.domPropFiltering)
      it6("filterProps on one component does not filter on another", () => {
        const Filtered = adapter.createComponent({
          filterProps: (key) => key === "loading",
          enforcement: { strict: false }
        });
        const Plain = adapter.createComponent({
          enforcement: { strict: false }
        });
        const filteredEl = adapter.render(Filtered, { "data-id": "a", loading: "true" }).element;
        const plainEl = adapter.render(Plain, { "data-id": "b", loading: "true" }).element;
        expect6(filteredEl.getAttribute("data-id")).toBe("a");
        expect6(filteredEl.hasAttribute("loading")).toBe(false);
        expect6(plainEl.getAttribute("data-id")).toBe("b");
        expect6(plainEl.getAttribute("loading")).toBe("true");
      });
    it6("displayName is independent per component", () => {
      const Box = adapter.createComponent({ name: "Box", enforcement: { strict: false } });
      const Button = adapter.createComponent({ name: "Button", enforcement: { strict: false } });
      expect6(Box.displayName).toBe("Box");
      expect6(Button.displayName).toBe("Button");
    });
    it6("re-rendering one component does not change the other", () => {
      const Box = adapter.createComponent({
        styling: { base: "box", variants: { size: { sm: "text-sm", lg: "text-lg" } } },
        enforcement: { strict: false }
      });
      const Button = adapter.createComponent({
        styling: { base: "btn" },
        enforcement: { strict: false }
      });
      const boxResult = adapter.render(Box, { size: "sm" });
      const btnResult = adapter.render(Button);
      const btnClassBefore = btnResult.element.className;
      const btnHtmlBefore = btnResult.element.outerHTML;
      boxResult.rerender({ size: "lg" });
      expect6(btnResult.element.className).toBe(btnClassBefore);
      expect6(btnResult.element.outerHTML).toBe(btnHtmlBefore);
    });
    it6("creating a component does not mutate the variants config object", () => {
      const variants = { size: { sm: "text-sm", lg: "text-lg" } };
      const snapshot = JSON.stringify(variants);
      adapter.createComponent({ styling: { variants }, enforcement: { strict: false } });
      expect6(JSON.stringify(variants)).toBe(snapshot);
    });
  });
}
export {
  conformanceA11ySuite,
  conformanceIsolationSuite,
  conformancePerformanceSuite,
  conformanceSuite,
  hydrationParitySuite,
  ssrConformanceSuite
};

"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import type { SiteOverrides } from "@/src/lib/site-content";

type Entry = {
  key: string;
  type: "text" | "image";
  original: string;
  value: string;
  label: string;
  group: string;
  managed?: boolean;
  node: Node | HTMLImageElement;
};

export function CmsRuntime({ initialOverrides }: { initialOverrides: SiteOverrides }) {
  const pathname = usePathname();
  useEffect(() => {
    if (pathname.startsWith("/admin")) return;
    let active = true;
    let overrides: SiteOverrides = { ...initialOverrides };
    const editor = new URLSearchParams(window.location.search).get("cms-editor") === "1";
    const entries: Entry[] = [];
    const originalTexts = new WeakMap<Node, string>();
    let scheduled = false;
    function readEntries() {
      entries.length = 0;
      for (const [scopeName, scope] of [
        ["header", document.querySelector('[data-cms-scope="header"]')],
        [`page:${pathname}`, document.querySelector('[data-cms-scope="page"]')],
        ["footer", document.querySelector('[data-cms-scope="footer"]')],
      ] as Array<[string, Element | null]>) {
        if (!scope) continue;
        let textNumber = 0;
        const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT);
        let node: Node | null;
        while ((node = walker.nextNode())) {
          const parent = node.parentElement;
          if (
            !parent ||
            parent.closest("script,style,noscript,svg,textarea,option,[data-cms-ignore]")
          )
            continue;
          const currentText = (node as Text).data;
          if (!currentText.trim()) continue;
          if (!originalTexts.has(node)) originalTexts.set(node, currentText);
          const original = originalTexts.get(node) || currentText;
          const key = `${scopeName}:t:${textNumber++}`;
          const tag =
            parent.closest("h1,h2,h3,h4,button,a,p,li,address")?.tagName || parent.tagName;
          const label =
            tag === "H1"
              ? "Page title"
              : /^H[2-4]$/.test(tag)
                ? "Section heading"
                : tag === "A"
                  ? "Link text"
                  : tag === "BUTTON"
                    ? "Button text"
                    : "Paragraph";
          entries.push({
            key,
            type: "text",
            original,
            value: overrides[key] ?? original,
            label,
            group:
              scopeName === "header"
                ? "Website header"
                : scopeName === "footer"
                  ? "Website footer"
                  : "Page content",
            node,
          });
        }
        let imageNumber = 0;
        scope.querySelectorAll("img").forEach((img) => {
          const key = `${scopeName}:i:${imageNumber++}`;
          const original =
            img.getAttribute("data-cms-original-src") || img.getAttribute("src") || "";
          if (!img.hasAttribute("data-cms-original-src"))
            img.setAttribute("data-cms-original-src", original);
          const managed = img.dataset.cmsManaged === "homepage-background";
          entries.push({
            key,
            type: "image",
            original,
            value: managed ? original : (overrides[key] ?? original),
            label: img.alt || "School photograph",
            group:
              scopeName === "header"
                ? "Website header"
                : scopeName === "footer"
                  ? "Website footer"
                  : "Page images",
            managed,
            node: img,
          });
        });
      }
    }
    function apply() {
      readEntries();
      for (const e of entries) {
        if (e.managed) continue;
        const value = overrides[e.key];
        if (value === undefined) continue;
        if (e.type === "text" && e.node.textContent !== value) e.node.textContent = value;
        if (e.type === "image") {
          const el = e.node as HTMLImageElement;
          if (el.getAttribute("src") !== value) {
            el.removeAttribute("srcset");
            el.removeAttribute("sizes");
            el.setAttribute("src", value);
          }
        }
      }
    }
    function report() {
      if (!editor || window.parent === window) return;
      window.parent.postMessage(
        {
          source: "red-rose-cms",
          type: "entries",
          entries: entries.map(({ key, type, original, value, label, group, managed }) => ({
            key,
            type,
            original,
            value,
            label,
            group,
            managed,
          })),
        },
        window.location.origin,
      );
    }
    const observer = new MutationObserver(() => {
      if (!active || scheduled) return;
      scheduled = true;
      window.requestAnimationFrame(() => {
        scheduled = false;
        apply();
      });
    });
    // Browser renders the existing content first; overrides are applied after hydration.
    const timer = window.setTimeout(() => {
      if (!active) return;
      apply();
      report();
      const root = document.querySelector('[data-cms-scope="page"]');
      if (root) observer.observe(root, { childList: true, subtree: true, characterData: true });
    }, 120);
    const onMessage = (event: MessageEvent) => {
      if (
        event.origin !== window.location.origin ||
        event.source !== window.parent ||
        event.data?.source !== "red-rose-cms-admin"
      )
        return;
      if (event.data.type === "refresh") {
        overrides = { ...overrides, [event.data.key]: event.data.value };
        apply();
        report();
      }
    };
    const onClick = (event: MouseEvent) => {
      if (!editor) return;
      const target = event.target as HTMLElement;
      if (!target?.closest("[data-cms-scope]")) return;
      event.preventDefault();
      event.stopPropagation();
      const image = target.closest("img");
      const hit = image
        ? entries.find((entry) => entry.node === image)
        : entries.find(
            (entry) =>
              entry.type === "text" &&
              (entry.node.parentElement === target || target.contains(entry.node.parentElement)),
          );
      if (hit)
        window.parent.postMessage(
          { source: "red-rose-cms", type: "selected", key: hit.key },
          window.location.origin,
        );
    };
    window.addEventListener("message", onMessage);
    if (editor) document.addEventListener("click", onClick, true);
    return () => {
      active = false;
      clearTimeout(timer);
      observer.disconnect();
      window.removeEventListener("message", onMessage);
      document.removeEventListener("click", onClick, true);
    };
  }, [pathname, initialOverrides]);
  return null;
}

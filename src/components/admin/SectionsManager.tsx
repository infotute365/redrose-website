"use client";

import { useRef, useState, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpRight, ImageIcon, Pencil, Plus, Save, Search, Trash2 } from "lucide-react";
import type { EditableEvent, HomeSlide } from "@/src/lib/dynamic-sections";
import type { HomepageBackground } from "@/src/lib/background-types";
import { AdminShell, PageHeading, StatusMessage } from "./AdminShell";
import { ImagePicker, useImageDraft } from "./ImagePicker";
import { ConfirmDialog } from "./ConfirmDialog";

type Item = {
  id?: string;
  slug?: string;
  title: string;
  description: string;
  src?: string;
  image?: string;
  category?: string;
  alt?: string;
  displayOrder?: number;
  isPublished?: boolean;
  backgroundRevision?: number;
};
const empty = (order: number): Item => ({
  title: "",
  description: "",
  src: "",
  image: "",
  category: "",
  alt: "",
  isPublished: true,
  displayOrder: order,
});
function sortItems(items: Item[], idField: "id" | "slug") {
  return [...items].sort(
    (a, b) =>
      (a.displayOrder ?? -Infinity) - (b.displayOrder ?? -Infinity) ||
      (String(a[idField]) < String(b[idField]) ? -1 : 1),
  );
}
export function SectionsManager({
  initialSlides,
  initialEvents,
  initialKind = "slides",
  background,
}: {
  initialSlides: HomeSlide[];
  initialEvents: EditableEvent[];
  initialKind?: "slides" | "events";
  background: HomepageBackground | null;
}) {
  const kind = initialKind;
  const isSlides = kind === "slides";
  const [items, setItems] = useState<Item[]>(isSlides ? initialSlides : initialEvents);
  const [chosen, setChosen] = useState<string | null>(null);
  const [form, setForm] = useState<Item>(empty(items.length));
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pendingDelete, setPendingDelete] = useState<Item | null>(null);
  const panel = useRef<HTMLElement>(null);
  const image = useImageDraft(true);
  const router = useRouter();
  const idField = isSlides ? "id" : "slug";
  const imageField = isSlides ? "src" : "image";
  const active = sortItems(
    items.filter((item) => item.isPublished !== false),
    "id",
  )[0];
  function imageSrc(item: Item) {
    return isSlides && background && item.id === background.slideId && !item.backgroundRevision
      ? background.src
      : item[imageField] || "";
  }
  function begin(item?: Item) {
    setChosen(item ? String(item[idField]) : null);
    setForm(item ? { ...item } : empty(items.length));
    image.clear();
    setError("");
    setMessage("");
    panel.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    setError("");
    try {
      const payload = {
        ...form,
        ...(isSlides && chosen ? { expectedRevision: form.backgroundRevision || 0 } : {}),
      };
      if (image.selection) {
        const body = new FormData();
        body.set("file", image.selection.file);
        const response = await fetch("/api/admin/media", { method: "POST", body });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Could not upload your image.");
        payload[imageField] = data.url;
      }
      if (!payload[imageField]) throw new Error("Choose an image before saving.");
      const response = await fetch(`/api/admin/sections/${kind}`, {
        method: chosen ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save this item.");
      setItems((old) =>
        chosen
          ? old.map((item) => (item[idField] === chosen ? data.item : item))
          : [...old, data.item],
      );
      setChosen(data.item[idField]);
      setForm(data.item);
      image.clear();
      setMessage(
        data.item.isPublished === false
          ? "Saved. This item is hidden from the public website."
          : "Saved and published on the school website.",
      );
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save this item.");
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    if (!pendingDelete) return;
    setBusy(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch(`/api/admin/sections/${kind}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [idField]: pendingDelete[idField] }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not delete this item.");
      setItems((old) => old.filter((item) => item[idField] !== pendingDelete[idField]));
      if (chosen === pendingDelete[idField]) {
        setChosen(null);
        setForm(empty(items.length - 1));
        image.clear();
      }
      setMessage("Item removed from the website.");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not delete this item.");
    } finally {
      setBusy(false);
      setPendingDelete(null);
    }
  }
  const visible = sortItems(items, idField).filter(
    (item) =>
      `${item.title} ${item.description} ${item.category || ""}`
        .toLowerCase()
        .includes(search.toLowerCase()) &&
      (filter === "all" ||
        (filter === "published" ? item.isPublished !== false : item.isPublished === false)),
  );
  return (
    <AdminShell section={isSlides ? "slides" : "events"}>
      <PageHeading
        title={isSlides ? "Homepage Slides" : "Photo Gallery / Events"}
        description={
          isSlides
            ? "Manage the photographs in your homepage slideshow. Your current background is clearly marked below."
            : "Celebrate school life with photographs, achievements and events for your public gallery."
        }
      >
        <button className="admin-btn admin-btn-teal" onClick={() => begin()}>
          <Plus size={16} /> {isSlides ? "Add Homepage Slide" : "Add Photo / Event"}
        </button>
      </PageHeading>
      <div className="admin-toolbar">
        <div className="admin-tabs">
          <Link href="/admin/sections?tab=slides" aria-current={isSlides ? "page" : undefined}>
            Homepage Slides
          </Link>
          <Link href="/admin/sections?tab=events" aria-current={!isSlides ? "page" : undefined}>
            Photos & Events
          </Link>
        </div>
        {isSlides && (
          <Link href="/admin/background" className="admin-text-link">
            Change only the homepage background <ArrowUpRight size={14} />
          </Link>
        )}
      </div>
      {message && <StatusMessage>{message}</StatusMessage>}
      {(error || image.error) && <StatusMessage tone="error">{error || image.error}</StatusMessage>}
      <div className="admin-split">
        <section>
          <div className="admin-toolbar">
            <div className="admin-search">
              <Search size={16} />
              <input
                aria-label={isSlides ? "Search slides" : "Search events"}
                placeholder={isSlides ? "Search homepage photos…" : "Search photos and events…"}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <select
              aria-label="Publication status"
              style={{ width: "auto", fontSize: 12 }}
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
            >
              <option value="all">All items</option>
              <option value="published">Published</option>
              <option value="hidden">Hidden</option>
            </select>
          </div>
          <div className="admin-section-grid">
            {visible.map((item) => (
              <article className="admin-card admin-photo-card" key={item[idField]}>
                <div className="admin-photo-card-image">
                  {imageSrc(item) ? (
                    <Image
                      src={imageSrc(item)}
                      alt={item.alt || item.title}
                      fill
                      sizes="(max-width: 767px) 90vw, 30vw"
                    />
                  ) : (
                    <ImageIcon size={25} />
                  )}
                </div>
                <div className="admin-photo-card-content">
                  <span
                    className={`admin-badge ${item.isPublished === false ? "admin-badge-neutral" : isSlides && active?.id === item.id ? "admin-badge-gold" : ""}`}
                  >
                    {item.isPublished === false
                      ? "Hidden"
                      : isSlides && active?.id === item.id
                        ? "Current Homepage Background"
                        : "Published"}
                  </span>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                  <div className="admin-actions">
                    <button className="admin-text-link" onClick={() => begin(item)} disabled={busy}>
                      <Pencil size={14} /> Edit {isSlides ? "slide" : "event"}
                    </button>
                    <button
                      className="admin-icon-btn"
                      onClick={() => setPendingDelete(item)}
                      disabled={busy}
                      aria-label={`Delete ${item.title}`}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
          {!visible.length && (
            <div className="admin-card admin-empty">
              <ImageIcon size={30} />
              <h3>
                {items.length
                  ? "No matching photographs"
                  : isSlides
                    ? "Build your homepage slideshow"
                    : "Share a school moment"}
              </h3>
              <p>
                {items.length
                  ? "Try another search or change the publication filter."
                  : "Choose a photograph and add a short title to get started."}
              </p>
            </div>
          )}
        </section>
        <section
          ref={panel}
          className="admin-card admin-form-panel"
          style={{ scrollMarginTop: 95 }}
        >
          <h2>
            {chosen
              ? isSlides
                ? "Edit homepage slide"
                : "Edit photo / event"
              : isSlides
                ? "Add a homepage slide"
                : "Add a photo / event"}
          </h2>
          <p className="admin-card-note">
            Your changes appear on the website when you save a published item.
          </p>
          {isSlides && chosen === active?.id && (
            <p className="admin-form-hint">
              This is your current homepage background.{" "}
              <Link href="/admin/background" className="admin-text-link">
                Replace only its image here <ArrowUpRight size={12} />
              </Link>
            </p>
          )}
          <form className="admin-form" onSubmit={save}>
            <label className="admin-field">
              Title
              <input
                required
                maxLength={180}
                value={form.title}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
              />
            </label>
            {!isSlides && (
              <label className="admin-field">
                Category
                <input
                  required
                  maxLength={80}
                  placeholder="e.g. School activities"
                  value={form.category || ""}
                  onChange={(event) => setForm({ ...form, category: event.target.value })}
                />
              </label>
            )}
            <label className="admin-field">
              Description
              <textarea
                required
                rows={4}
                maxLength={3000}
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
              />
            </label>
            <label className="admin-field">
              Photo description
              <input
                maxLength={180}
                value={form.alt || ""}
                onChange={(event) => setForm({ ...form, alt: event.target.value })}
              />
              <small>A short description helps people using screen readers.</small>
            </label>
            {(image.selection?.url || form[imageField]) && (
              <div className="admin-preview-image">
                <Image
                  src={image.selection?.url || imageSrc(form)}
                  alt="Image preview before saving"
                  fill
                  sizes="350px"
                  unoptimized
                />
              </div>
            )}
            <ImagePicker
              label={chosen ? "Replace Image" : "Choose Image"}
              selection={image.selection}
              onSelect={(file) => {
                void image.select(file);
              }}
              disabled={busy}
              allowGif
            />
            <div className="admin-actions" style={{ justifyContent: "space-between" }}>
              <label className="admin-actions">
                <input
                  type="checkbox"
                  checked={form.isPublished !== false}
                  onChange={(event) => setForm({ ...form, isPublished: event.target.checked })}
                />{" "}
                Visible on website
              </label>
              <label className="admin-field" style={{ width: 90 }}>
                Photo sequence
                <input
                  type="number"
                  min={1}
                  max={100000}
                  value={(form.displayOrder ?? 0) + 1}
                  onChange={(event) =>
                    setForm({ ...form, displayOrder: Number(event.target.value) - 1 })
                  }
                />
              </label>
            </div>
            <div className="admin-actions">
              <button className="admin-btn admin-btn-teal" disabled={busy || Boolean(image.error)}>
                <Save size={15} />
                {busy ? "Saving…" : "Save Changes"}
              </button>
              <button
                className="admin-btn admin-btn-secondary"
                type="button"
                disabled={busy}
                onClick={() => {
                  const current = items.find((item) => item[idField] === chosen);
                  setForm(current ? { ...current } : empty(items.length));
                  image.clear();
                  setError("");
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </section>
      </div>
      {pendingDelete && (
        <ConfirmDialog
          title={`Delete this ${isSlides ? "slide" : "event"}?`}
          busy={busy}
          onConfirm={remove}
          onCancel={() => setPendingDelete(null)}
        >
          <p>
            “{pendingDelete.title}” will be removed from the public website. Your other photographs
            will stay in place.
          </p>
        </ConfirmDialog>
      )}
    </AdminShell>
  );
}

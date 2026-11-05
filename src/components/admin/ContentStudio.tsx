"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, ImageIcon, Monitor, PenLine, RotateCcw, Save, Search } from "lucide-react";
import { AdminShell, PageHeading, StatusMessage } from "./AdminShell";
import { ImagePicker, useImageDraft } from "./ImagePicker";
import { ConfirmDialog } from "./ConfirmDialog";

type Entry = {
  key: string;
  type: "text" | "image";
  original: string;
  value: string;
  label: string;
  group: string;
  managed?: boolean;
};
const PAGES = [
  ["/", "Homepage"],
  ["/pages/about-us", "About us"],
  ["/pages/message-from-md", "Managing Director"],
  ["/pages/message-from-principal", "Principal"],
  ["/pages/message-from-vice_principal", "Vice Principal"],
  ["/pages/facilities", "Facilities"],
  ["/pages/aims-of-objectives", "Aims and objectives"],
  ["/pages/contact-us", "Contact"],
  ["/pages/mandatory-disclosure", "Mandatory disclosure"],
  ["/pages/fee-structure", "Fees"],
  ["/pages/tc-format", "TC format"],
  ["/gallery", "Photo gallery"],
  ["/circulars", "Circulars page"],
];
export function ContentStudio() {
  const frame = useRef<HTMLIFrameElement>(null);
  const [page, setPage] = useState("/");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [selected, setSelected] = useState("");
  const [draftEdit, setDraftEdit] = useState<{ key: string; source: string; value: string } | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [group, setGroup] = useState("all");
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);
  const {
    selection,
    error: imageError,
    clear: clearImage,
    select: selectImage,
  } = useImageDraft(true);
  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (
        event.origin !== window.location.origin ||
        event.source !== frame.current?.contentWindow ||
        event.data?.source !== "red-rose-cms"
      )
        return;
      if (event.data.type === "entries" && Array.isArray(event.data.entries)) {
        setEntries(
          event.data.entries.filter(
            (item: Entry) => typeof item?.key === "string" && ["text", "image"].includes(item.type),
          ),
        );
        setLoading(false);
      }
      if (event.data.type === "selected" && typeof event.data.key === "string") {
        setSelected(event.data.key);
        setDraftEdit(null);
        clearImage();
        setError("");
        setMessage("");
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [clearImage]);
  const current = entries.find((entry) => entry.key === selected);
  const draft =
    draftEdit?.key === selected && draftEdit.source === current?.value
      ? draftEdit.value
      : current?.value || "";
  const changed = Boolean(selection || draft !== current?.value);
  function choose(entry: Entry) {
    setSelected(entry.key);
    setDraftEdit(null);
    clearImage();
    setError("");
    setMessage("");
  }
  function changePage(value: string) {
    setPage(value);
    setSelected("");
    setDraftEdit(null);
    setEntries([]);
    setSearch("");
    setGroup("all");
    setMessage("");
    setError("");
    setLoading(true);
    clearImage();
  }
  function cancel() {
    setDraftEdit(null);
    clearImage();
    setError("");
    setMessage("");
  }
  async function save(restore = false) {
    if (!current || current.managed) return;
    setBusy(true);
    setMessage("");
    setError("");
    try {
      let value = draft;
      if (!restore && current.type === "image" && selection) {
        const body = new FormData();
        body.set("file", selection.file);
        const upload = await fetch("/api/admin/media", { method: "POST", body });
        const data = await upload.json();
        if (!upload.ok) throw new Error(data.error || "Could not upload this image.");
        value = data.url;
      }
      const response = await fetch("/api/admin/content", {
        method: restore ? "DELETE" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(restore ? { key: current.key } : { key: current.key, value }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save this change.");
      const effective = restore ? current.original : value;
      frame.current?.contentWindow?.postMessage(
        { source: "red-rose-cms-admin", type: "refresh", key: current.key, value: effective },
        window.location.origin,
      );
      setEntries((old) =>
        old.map((entry) => (entry.key === current.key ? { ...entry, value: effective } : entry)),
      );
      setDraftEdit(null);
      clearImage();
      setResetting(false);
      setMessage(
        restore ? "Original content restored." : "Saved. Your change is now on the school website.",
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save this change.");
      setResetting(false);
    } finally {
      setBusy(false);
    }
  }
  const filtered = entries.filter(
    (entry) =>
      !entry.managed &&
      entry.value.trim() &&
      (group === "all" || entry.group === group) &&
      `${entry.label} ${entry.value}`.toLowerCase().includes(search.toLowerCase()),
  );
  const groups = [...new Set(filtered.map((entry) => entry.group))];
  const pageName = PAGES.find(([href]) => href === page)?.[1] || "Page";
  return (
    <AdminShell section="editor">
      <PageHeading
        title="Website Content Editor"
        description="Choose a page, find the wording or photograph you want to update, and review your change before saving."
      >
        <Link
          href={page}
          target="_blank"
          rel="noreferrer"
          className="admin-btn admin-btn-secondary"
        >
          View this page <ArrowUpRight size={15} />
        </Link>
      </PageHeading>
      {message && <StatusMessage>{message}</StatusMessage>}
      {(error || imageError) && <StatusMessage tone="error">{error || imageError}</StatusMessage>}
      <div
        className="admin-card admin-card-content"
        style={{
          marginBottom: 22,
          display: "flex",
          gap: 22,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <label className="admin-field" style={{ flex: 1, minWidth: 180, maxWidth: 340 }}>
          Which page would you like to edit?
          <select value={page} onChange={(event) => changePage(event.target.value)} disabled={busy}>
            {PAGES.map(([href, label]) => (
              <option key={href} value={href}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <p className="admin-card-note" style={{ flex: 1, minWidth: 200, marginBottom: 0 }}>
          Use the list below, or click a heading, paragraph or image in the page preview. Your
          original content stays in place until you save.
        </p>
      </div>
      <div className="admin-editor-grid">
        <aside className="admin-card">
          <div className="admin-card-head">
            <div>
              <h2>{pageName} content</h2>
              <p>{loading ? "Loading editable fields…" : `${filtered.length} editable fields`}</p>
            </div>
            <PenLine size={18} color="#63969f" />
          </div>
          <div style={{ padding: 16, display: "grid", gap: 10 }}>
            <div className="admin-search">
              <Search size={15} />
              <input
                aria-label="Find content"
                placeholder="Find a heading or photograph…"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <select
              aria-label="Content section"
              value={group}
              onChange={(event) => setGroup(event.target.value)}
              style={{ fontSize: 12 }}
            >
              <option value="all">All page sections</option>
              {["Page content", "Page images", "Website header", "Website footer"].map((value) => (
                <option value={value} key={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>
          {page === "/" && (
            <div style={{ padding: "0 16px 14px" }}>
              <Link
                href="/admin/background"
                className="admin-form-hint"
                style={{ display: "flex", alignItems: "center", gap: 9 }}
              >
                <ImageIcon size={15} />
                <span>
                  Looking for the main background?
                  <strong style={{ display: "block", color: "#167f84", fontSize: 11 }}>
                    Open Homepage Background →
                  </strong>
                </span>
              </Link>
            </div>
          )}
          <div className="admin-editor-fields">
            {groups.map((value) => (
              <div key={value}>
                <div className="admin-editor-group">{value}</div>
                {filtered
                  .filter((entry) => entry.group === value)
                  .map((entry) => (
                    <button
                      key={entry.key}
                      disabled={busy}
                      className="admin-editor-field"
                      aria-pressed={selected === entry.key}
                      onClick={() => choose(entry)}
                    >
                      {entry.type === "image" ? <ImageIcon size={15} /> : <PenLine size={14} />}
                      <span>
                        <strong>{entry.label}</strong>
                        <small>{entry.type === "image" ? entry.label : entry.value.trim()}</small>
                      </span>
                    </button>
                  ))}
              </div>
            ))}
            {!filtered.length && (
              <div className="admin-empty" style={{ padding: 24 }}>
                <p>
                  {loading
                    ? "Opening the page and its editable content…"
                    : "No matching fields. Try another search or section."}
                </p>
              </div>
            )}
          </div>
          <div className="admin-editor-edit" style={{ borderTop: "1px solid #e7edf3" }}>
            {current?.managed ? (
              <>
                <h3>Homepage background</h3>
                <p className="admin-card-note">
                  Use the dedicated background manager to preview, save and restore this photograph.
                </p>
                <Link href="/admin/background" className="admin-btn admin-btn-teal">
                  Manage Homepage Background
                </Link>
              </>
            ) : current ? (
              <>
                <h3>{current.label}</h3>
                <p className="admin-card-note">
                  {current.type === "image"
                    ? "Choose a new photograph, then save when you’re happy with the preview."
                    : "Review the current wording, then make your changes below."}
                </p>
                {current.type === "text" ? (
                  <>
                    <small className="admin-muted">Current wording</small>
                    <div className="admin-editor-existing">{current.value}</div>
                    <label className="admin-field">
                      Edit wording
                      <textarea
                        rows={5}
                        maxLength={10000}
                        value={draft}
                        disabled={busy}
                        onChange={(event) =>
                          setDraftEdit({
                            key: selected,
                            source: current.value,
                            value: event.target.value,
                          })
                        }
                      />
                    </label>
                  </>
                ) : (
                  <>
                    <small className="admin-muted">
                      {selection ? "New image preview · not saved" : "Current photograph"}
                    </small>
                    <div className="admin-editor-image">
                      <Image
                        src={selection?.url || current.value}
                        alt={current.label}
                        fill
                        sizes="320px"
                        unoptimized
                      />
                    </div>
                    <ImagePicker
                      label="Replace Image"
                      selection={selection}
                      onSelect={(file) => {
                        void selectImage(file);
                      }}
                      disabled={busy}
                      allowGif
                    />
                  </>
                )}
                <div className="admin-actions" style={{ marginTop: 18 }}>
                  <button
                    className="admin-btn admin-btn-teal"
                    disabled={busy || !changed || Boolean(imageError)}
                    onClick={() => save()}
                  >
                    <Save size={14} />
                    {busy ? "Saving…" : "Save Changes"}
                  </button>
                  <button
                    className="admin-btn admin-btn-secondary"
                    disabled={busy || !changed}
                    onClick={cancel}
                  >
                    Cancel
                  </button>
                </div>
                <button
                  className="admin-text-link"
                  style={{ marginTop: 18, color: "#8b98a8", fontSize: 11 }}
                  disabled={busy || current.value === current.original}
                  onClick={() => setResetting(true)}
                >
                  <RotateCcw size={12} /> Restore original content
                </button>
              </>
            ) : (
              <div style={{ padding: "6px 0 10px" }}>
                <PenLine size={24} style={{ color: "#93aab8", marginBottom: 12 }} />
                <h3>Choose something to edit</h3>
                <p className="admin-card-note">
                  Select a field above or click the same content in the preview. You’ll see the
                  current value and a simple edit form here.
                </p>
              </div>
            )}
          </div>
        </aside>
        <section className="admin-card">
          <div className="admin-card-head">
            <div>
              <h2 style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <Monitor size={17} /> Page preview
              </h2>
              <p>Click text or a photograph to select it</p>
            </div>
            <span className="admin-badge admin-badge-neutral">{pageName}</span>
          </div>
          <iframe
            ref={frame}
            key={page}
            title="Editable school website"
            src={`${page}?cms-editor=1`}
            className="admin-editor-frame"
          />
        </section>
      </div>
      {resetting && current && (
        <ConfirmDialog
          title="Restore the original content?"
          destructive={false}
          confirmLabel="Restore Original"
          busy={busy}
          onConfirm={() => save(true)}
          onCancel={() => setResetting(false)}
        >
          <p>
            The original {current.type === "image" ? "photograph" : "wording"} will replace the
            saved change for this field.
          </p>
        </ConfirmDialog>
      )}
    </AdminShell>
  );
}

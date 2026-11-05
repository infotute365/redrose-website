"use client";

import { useRef, useState, type FormEvent } from "react";
import {
  ArrowUp,
  ArrowUpRight,
  Bell,
  FileText,
  Pencil,
  Plus,
  Search,
  Trash2,
  UploadCloud,
} from "lucide-react";
import type { Circular } from "@/src/lib/circulars";
import { sortCirculars } from "@/src/lib/circulars-utils";
import { AdminShell, PageHeading, StatusMessage } from "./AdminShell";
import { ConfirmDialog } from "./ConfirmDialog";

export function CircularManager({ initialCirculars }: { initialCirculars: Circular[] }) {
  const [circulars, setCirculars] = useState(initialCirculars);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<Circular | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Circular | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [fileName, setFileName] = useState("");
  const panel = useRef<HTMLFormElement>(null);
  function start() {
    setBusy(true);
    setError("");
    setMessage("");
  }
  function begin(item: Circular | null) {
    setEditing(item);
    setError("");
    setMessage("");
    setFileName("");
    panel.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }
  async function publish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    start();
    try {
      const body = new FormData(form);
      const file = body.get("file");
      if (file instanceof File && file.size > 20 * 1024 * 1024)
        throw new Error("Choose a PDF smaller than 20 MB.");
      const response = await fetch("/api/admin/circulars", { method: "POST", body });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not publish this notice.");
      setCirculars((items) => sortCirculars([data.circular, ...items]));
      form.reset();
      setFileName("");
      setMessage("Notice published on the school website and homepage.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not publish this notice.");
    } finally {
      setBusy(false);
    }
  }
  async function update(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    const form = new FormData(event.currentTarget);
    start();
    try {
      const response = await fetch("/api/admin/circulars", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editing.id,
          title: form.get("title"),
          description: form.get("description"),
          noticeDate: form.get("noticeDate"),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not update this notice.");
      setCirculars((items) =>
        sortCirculars(items.map((item) => (item.id === editing.id ? data.circular : item))),
      );
      setEditing(null);
      setMessage("Circular updated successfully.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not update this notice.");
    } finally {
      setBusy(false);
    }
  }
  async function promote(item: Circular) {
    start();
    try {
      const response = await fetch("/api/admin/circulars", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not move this notice.");
      setCirculars((items) =>
        sortCirculars(items.map((value) => (value.id === item.id ? data.circular : value))),
      );
      setMessage("Notice moved to the top of homepage updates.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not move this notice.");
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    if (!pendingDelete) return;
    start();
    try {
      const response = await fetch("/api/admin/circulars", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: pendingDelete.id }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not delete this notice.");
      setCirculars((items) => items.filter((item) => item.id !== pendingDelete.id));
      if (editing?.id === pendingDelete.id) setEditing(null);
      setMessage("Notice removed from the website.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not delete this notice.");
    } finally {
      setBusy(false);
      setPendingDelete(null);
    }
  }
  const visible = circulars.filter((item) =>
    `${item.title} ${item.description} ${item.noticeDate}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  return (
    <AdminShell section="circulars">
      <PageHeading
        title="Circulars & Notices"
        description="Share timely school updates with families. Published notices also appear on your homepage."
      >
        <button className="admin-btn admin-btn-teal" onClick={() => begin(null)}>
          <Plus size={16} /> Add Circular
        </button>
      </PageHeading>
      {message && <StatusMessage>{message}</StatusMessage>}
      {error && <StatusMessage tone="error">{error}</StatusMessage>}
      <div className="admin-split">
        <section>
          <div className="admin-toolbar">
            <div className="admin-search">
              <Search size={16} />
              <input
                aria-label="Search circulars"
                placeholder="Search notices and circulars…"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <span className="admin-muted" style={{ fontSize: 12 }}>
              {visible.length} notice{visible.length === 1 ? "" : "s"}
            </span>
          </div>
          <div className="admin-card">
            <div className="admin-card-head">
              <div>
                <h2>Published circulars</h2>
                <p>Your latest updates for the school community</p>
              </div>
              <Bell size={19} color="#5a939d" />
            </div>
            {visible.length ? (
              visible.map((item) => (
                <article
                  className="admin-file-row"
                  key={item.id}
                  style={{ alignItems: "flex-start" }}
                >
                  <span className="admin-file-icon">
                    <FileText size={21} />
                  </span>
                  <div className="admin-file-info">
                    <span className="admin-badge">Published</span>
                    <h3 style={{ marginTop: 8, whiteSpace: "normal" }}>{item.title}</h3>
                    <p>
                      {item.noticeDate}
                      {(item.priority || 0) > 0 ? " · Pinned to top" : ""}
                    </p>
                    <p
                      style={{
                        whiteSpace: "normal",
                        fontSize: 12,
                        lineHeight: 1.8,
                        color: "#8190a2",
                      }}
                    >
                      {item.description}
                    </p>
                    {item.pdfUrl && (
                      <a
                        className="admin-text-link"
                        href={item.pdfUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={{ marginTop: 10 }}
                      >
                        <FileText size={13} /> View attached PDF <ArrowUpRight size={12} />
                      </a>
                    )}
                  </div>
                  <div className="admin-row-actions">
                    <button
                      className="admin-icon-btn"
                      disabled={busy}
                      onClick={() => begin(item)}
                      aria-label={`Edit ${item.title}`}
                      title="Edit circular"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      className="admin-icon-btn"
                      disabled={busy || circulars[0]?.id === item.id}
                      onClick={() => promote(item)}
                      aria-label={`Move ${item.title} to the top`}
                      title="Move to top"
                    >
                      <ArrowUp size={15} />
                    </button>
                    <button
                      className="admin-icon-btn"
                      disabled={busy}
                      onClick={() => setPendingDelete(item)}
                      aria-label={`Delete ${item.title}`}
                      title="Delete circular"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </article>
              ))
            ) : (
              <div className="admin-empty">
                <Bell size={30} />
                <h3>
                  {circulars.length ? "No matching notices" : "Keep your school community informed"}
                </h3>
                <p>
                  {circulars.length
                    ? "Try a different title or date."
                    : "Publish your first notice using the form. You can attach a PDF if needed."}
                </p>
              </div>
            )}
          </div>
        </section>
        <aside className="admin-card admin-form-panel">
          <h2>{editing ? "Edit circular" : "Add a circular"}</h2>
          <p className="admin-card-note">
            Give families a clear title, date and the details they need.
          </p>
          <form
            ref={panel}
            key={editing?.id || "new"}
            onSubmit={editing ? update : publish}
            className="admin-form"
          >
            <label className="admin-field">
              Notice title
              <input
                name="title"
                required
                maxLength={160}
                defaultValue={editing?.title || ""}
                placeholder="e.g. Parent teacher meeting"
              />
            </label>
            <label className="admin-field">
              Notice date
              <input
                name="noticeDate"
                required
                type="date"
                defaultValue={editing?.noticeDate || new Date().toISOString().slice(0, 10)}
              />
            </label>
            <label className="admin-field">
              Notice details
              <textarea
                name="description"
                required
                rows={5}
                maxLength={3000}
                defaultValue={editing?.description || ""}
                placeholder="What should families know?"
              />
            </label>
            {!editing && (
              <label className="admin-field">
                PDF attachment{" "}
                <span className="admin-dropzone" style={{ padding: 18 }}>
                  <UploadCloud size={22} style={{ margin: "0 auto 9px", color: "#24858c" }} />
                  <span style={{ display: "block", fontSize: 12, color: "#59718a" }}>
                    {fileName || "Choose a PDF"}
                  </span>
                  <small>Optional · up to 20 MB</small>
                  <input
                    name="file"
                    type="file"
                    className="sr-only"
                    accept="application/pdf,.pdf"
                    onChange={(event) => setFileName(event.target.files?.[0]?.name || "")}
                  />
                </span>
              </label>
            )}
            {editing?.pdfUrl && (
              <a className="admin-text-link" href={editing.pdfUrl} target="_blank" rel="noreferrer">
                View existing PDF attachment <ArrowUpRight size={13} />
              </a>
            )}
            <div className="admin-actions">
              <button className="admin-btn admin-btn-teal" disabled={busy}>
                <UploadCloud size={15} />
                {busy ? "Saving…" : editing ? "Save Changes" : "Publish Notice"}
              </button>
              <button
                type="button"
                className="admin-btn admin-btn-secondary"
                disabled={busy}
                onClick={() => {
                  setEditing(null);
                  panel.current?.reset();
                  setFileName("");
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </aside>
      </div>
      {pendingDelete && (
        <ConfirmDialog
          title="Delete this circular?"
          busy={busy}
          onConfirm={remove}
          onCancel={() => setPendingDelete(null)}
        >
          <p>
            “{pendingDelete.title}” will be removed from the homepage and circulars page. This
            action cannot be undone.
          </p>
        </ConfirmDialog>
      )}
    </AdminShell>
  );
}

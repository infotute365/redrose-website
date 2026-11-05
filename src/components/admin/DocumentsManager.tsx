"use client";

import { useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  FileText,
  ImageIcon,
  Pencil,
  RefreshCw,
  Search,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import type { SchoolDocument } from "@/src/lib/documents";
import { AdminShell, PageHeading, StatusMessage } from "./AdminShell";
import { ConfirmDialog } from "./ConfirmDialog";
import { formatFileSize } from "./ImagePicker";

const sections = {
  disclosure: "Mandatory disclosure",
  fees: "Fee structure",
  tcformat: "TC format",
} as const;
export function DocumentsManager({ initialDocuments }: { initialDocuments: SchoolDocument[] }) {
  const [documents, setDocuments] = useState(initialDocuments);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pendingDelete, setPendingDelete] = useState<SchoolDocument | null>(null);
  const [editing, setEditing] = useState<SchoolDocument | null>(null);
  const [title, setTitle] = useState("");
  const [fileNames, setFileNames] = useState("");
  const [previewId, setPreviewId] = useState<string | null>(null);
  const preview = documents.find((document) => document.id === previewId) || null;
  function setPreview(document: SchoolDocument | null) {
    setPreviewId(document?.id || null);
  }
  const uploadForm = useRef<HTMLFormElement>(null);
  function start() {
    setBusy(true);
    setMessage("");
    setError("");
  }
  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    start();
    try {
      const body = new FormData(form);
      const files = body
        .getAll("files")
        .filter((file): file is File => file instanceof File && file.size > 0);
      if (!files.length || files.length > 10 || files.some((file) => file.size > 20 * 1024 * 1024))
        throw new Error("Choose 1–10 files, each no larger than 20 MB.");
      const response = await fetch("/api/admin/documents", { method: "POST", body });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not publish these files.");
      setDocuments((items) => [...data.documents, ...items]);
      form.reset();
      setFileNames("");
      setMessage(
        `${data.documents.length} document${data.documents.length === 1 ? "" : "s"} published successfully.`,
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not publish these files.");
    } finally {
      setBusy(false);
    }
  }
  async function updateTitle(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    start();
    try {
      const response = await fetch("/api/admin/documents", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editing.id, title: title.trim() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not update this title.");
      setDocuments((items) => items.map((item) => (item.id === editing.id ? data.document : item)));
      setEditing(null);
      setMessage("Document title updated.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not update this title.");
    } finally {
      setBusy(false);
    }
  }
  async function replace(document: SchoolDocument, file?: File) {
    if (!file) return;
    start();
    try {
      if (!file.size || file.size > 20 * 1024 * 1024)
        throw new Error("Choose a file between 1 byte and 20 MB.");
      const body = new FormData();
      body.set("id", document.id);
      body.set("file", file);
      const response = await fetch("/api/admin/documents", { method: "PATCH", body });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not replace this file.");
      setDocuments((items) =>
        items.map((item) => (item.id === document.id ? data.document : item)),
      );
      setMessage("File replaced. Existing public download links still work.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not replace this file.");
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    if (!pendingDelete) return;
    start();
    try {
      const response = await fetch("/api/admin/documents", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: pendingDelete.id }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not delete this document.");
      setDocuments((items) => items.filter((item) => item.id !== pendingDelete.id));
      if (preview?.id === pendingDelete.id) setPreview(null);
      if (editing?.id === pendingDelete.id) setEditing(null);
      setMessage("Document removed from the website.");
      setPendingDelete(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not delete this document.");
      setPendingDelete(null);
    } finally {
      setBusy(false);
    }
  }
  const filtered = documents.filter(
    (item) =>
      (!category || item.category === category) &&
      `${item.title} ${item.fileName}`.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <AdminShell section="documents">
      <PageHeading
        title="Documents & PDFs"
        description="Keep school information easy to find. Publish a new document or update a file while keeping its public link."
      >
        <button
          className="admin-btn admin-btn-teal"
          onClick={() => {
            uploadForm.current?.scrollIntoView({ behavior: "smooth", block: "center" });
            uploadForm.current?.querySelector<HTMLInputElement>('input[name="title"]')?.focus();
          }}
        >
          <UploadCloud size={16} /> Add Documents
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
                aria-label="Search documents"
                placeholder="Search documents…"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <select
              aria-label="Filter document section"
              style={{ width: "auto", fontSize: 12 }}
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            >
              <option value="">All sections</option>
              {Object.entries(sections).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="admin-card">
            <div className="admin-card-head">
              <div>
                <h2>Published documents</h2>
                <p>
                  {filtered.length} document{filtered.length === 1 ? "" : "s"}
                  {search || category ? " matching your search" : " on the school website"}
                </p>
              </div>
              <span className="admin-badge">Public</span>
            </div>
            {filtered.length ? (
              filtered.map((document) => (
                <div className="admin-file-row" key={document.id}>
                  <span className="admin-file-icon">
                    {document.mimeType === "application/pdf" ? (
                      <FileText size={21} />
                    ) : (
                      <ImageIcon size={21} />
                    )}
                  </span>
                  <div className="admin-file-info">
                    <h3>{document.title}</h3>
                    <p>
                      {sections[document.category]} · {document.fileName} ·{" "}
                      {formatFileSize(document.size)}
                    </p>
                    {editing?.id === document.id && (
                      <form
                        onSubmit={updateTitle}
                        className="admin-actions"
                        style={{ marginTop: 12 }}
                      >
                        <input
                          aria-label="New document title"
                          value={title}
                          maxLength={160}
                          required
                          onChange={(event) => setTitle(event.target.value)}
                        />
                        <button className="admin-btn" disabled={busy}>
                          Save
                        </button>
                        <button
                          type="button"
                          className="admin-btn admin-btn-secondary"
                          onClick={() => setEditing(null)}
                        >
                          Cancel
                        </button>
                      </form>
                    )}
                  </div>
                  <div className="admin-row-actions">
                    <button
                      className="admin-icon-btn"
                      onClick={() => setPreview(preview?.id === document.id ? null : document)}
                      aria-label={`Preview ${document.title}`}
                      title="Preview document"
                    >
                      <ArrowUpRight size={16} />
                    </button>
                    <button
                      className="admin-icon-btn"
                      disabled={busy}
                      onClick={() => {
                        setEditing(document);
                        setTitle(document.title);
                      }}
                      aria-label={`Edit ${document.title}`}
                      title="Edit title"
                    >
                      <Pencil size={16} />
                    </button>
                    <label className="admin-icon-btn" title="Replace file">
                      <RefreshCw size={16} />
                      <input
                        type="file"
                        aria-label={`Replace ${document.title}`}
                        className="sr-only"
                        disabled={busy}
                        accept="application/pdf,image/jpeg,image/png,image/webp,image/gif"
                        onChange={(event) => {
                          void replace(document, event.target.files?.[0]);
                          event.target.value = "";
                        }}
                      />
                    </label>
                    <button
                      className="admin-icon-btn"
                      disabled={busy}
                      onClick={() => setPendingDelete(document)}
                      aria-label={`Delete ${document.title}`}
                      title="Delete document"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="admin-empty">
                <FileText size={30} />
                <h3>
                  {documents.length ? "No matching documents" : "Your document library starts here"}
                </h3>
                <p>
                  {documents.length
                    ? "Try a different search or choose another section."
                    : "Add your school’s first PDF or image using the form."}
                </p>
              </div>
            )}
          </div>
          {preview && (
            <div className="admin-card" style={{ marginTop: 20 }}>
              <div className="admin-card-head">
                <h2>{preview.title}</h2>
                <button
                  className="admin-icon-btn"
                  aria-label="Close document preview"
                  onClick={() => setPreview(null)}
                >
                  <X size={17} />
                </button>
              </div>
              <iframe
                key={`${preview.id}-${preview.uploadedAt}`}
                title={`Preview: ${preview.title}`}
                src={preview.url}
                style={{ width: "100%", height: 480, border: 0 }}
              />
              <div className="admin-card-content">
                <a className="admin-text-link" href={preview.url} target="_blank" rel="noreferrer">
                  Open document in a new tab <ArrowUpRight size={14} />
                </a>
              </div>
            </div>
          )}
        </section>
        <aside className="admin-card admin-form-panel">
          <h2>Add documents</h2>
          <p className="admin-card-note">Choose where the file should appear, then upload it.</p>
          <form ref={uploadForm} onSubmit={upload} className="admin-form">
            <label className="admin-field">
              Website section
              <select name="category">
                {Object.entries(sections).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="admin-field">
              Document title
              <input
                name="title"
                required
                maxLength={160}
                placeholder="A clear title for families"
              />
            </label>
            <label className="admin-field">
              Choose files
              <span className="admin-dropzone" style={{ padding: 20 }}>
                <UploadCloud size={22} style={{ margin: "0 auto 10px", color: "#24858c" }} />
                <span style={{ display: "block", fontSize: 12, color: "#59718a" }}>
                  {fileNames || "Select PDFs or images"}
                </span>
                <small>Up to 10 files · 20 MB each</small>
                <input
                  name="files"
                  type="file"
                  className="sr-only"
                  required
                  multiple
                  accept="application/pdf,image/jpeg,image/png,image/webp,image/gif"
                  onChange={(event) =>
                    setFileNames(
                      Array.from(event.target.files || [])
                        .map((file) => file.name)
                        .join(", "),
                    )
                  }
                />
              </span>
            </label>
            <button className="admin-btn admin-btn-teal" disabled={busy}>
              <UploadCloud size={16} />
              {busy ? "Uploading…" : "Upload and Publish"}
            </button>
            <p className="admin-form-hint">
              Published documents are visible to families on the section you choose. Replacing a
              file preserves its public download link.
            </p>
          </form>
          <hr className="admin-divider" />
          <Link className="admin-text-link" href="/pages/mandatory-disclosure" target="_blank">
            View document pages <ArrowUpRight size={14} />
          </Link>
        </aside>
      </div>
      {pendingDelete && (
        <ConfirmDialog
          title="Delete this document?"
          busy={busy}
          onConfirm={remove}
          onCancel={() => setPendingDelete(null)}
        >
          <p>
            “{pendingDelete.title}” will be removed from the website. This action cannot be undone.
          </p>
        </ConfirmDialog>
      )}
    </AdminShell>
  );
}

"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Check, ImageIcon, Monitor, RotateCcw, Save, Smartphone } from "lucide-react";
import { AdminShell, PageHeading, StatusMessage } from "./AdminShell";
import { ImagePicker, useImageDraft } from "./ImagePicker";
import { ConfirmDialog } from "./ConfirmDialog";
import {
  backgroundPositions,
  type BackgroundPosition,
  type HomepageBackground,
} from "@/src/lib/background-types";

export function BackgroundManager({
  initialBackground,
}: {
  initialBackground: HomepageBackground | null;
}) {
  const [background, setBackground] = useState(initialBackground);
  const [position, setPosition] = useState<BackgroundPosition | null>(
    initialBackground?.position ?? null,
  );
  const [mobile, setMobile] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [restoring, setRestoring] = useState(false);
  const image = useImageDraft();
  const router = useRouter();
  const changed = Boolean(image.selection || position !== background?.position);
  function cancel() {
    image.clear();
    setPosition(background?.position ?? null);
    setError("");
    setMessage("");
  }
  async function reload() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/admin/sections/slides?view=background", {
        cache: "no-store",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not reload the image.");
      setBackground(data.background);
      setPosition(data.background?.position ?? null);
      image.clear();
      setMessage("Current homepage background reloaded.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not reload the image.");
    } finally {
      setBusy(false);
    }
  }
  async function save(restore = false) {
    if (!background) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      let src: string | undefined;
      if (!restore && image.selection) {
        const form = new FormData();
        form.set("file", image.selection.file);
        const upload = await fetch("/api/admin/media?purpose=homepage-background", {
          method: "POST",
          body: form,
        });
        const data = await upload.json();
        if (!upload.ok) throw new Error(data.error || "The image could not be uploaded.");
        src = data.url;
      }
      const response = await fetch("/api/admin/sections/slides", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "background",
          id: background.slideId,
          expectedRevision: background.revision,
          expectedSrc: background.src,
          src,
          position,
          restore,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "The background could not be saved.");
      setBackground(data.background);
      setPosition(data.background.position);
      image.clear();
      setRestoring(false);
      setMessage(
        restore
          ? "Previous background restored. Your homepage text and other photographs are unchanged."
          : "Homepage background saved. Open the public website to see your change.",
      );
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save your change.");
      setRestoring(false);
    } finally {
      setBusy(false);
    }
  }
  return (
    <AdminShell section="background">
      <PageHeading
        title="Homepage Background"
        description="Give your school a fresh first impression. Preview a new photograph, then save when you’re ready."
      >
        <Link href="/" target="_blank" rel="noreferrer" className="admin-btn admin-btn-secondary">
          Preview homepage <ArrowUpRight size={15} />
        </Link>
      </PageHeading>
      {!background ? (
        <div className="admin-card admin-empty">
          <ImageIcon size={32} />
          <h2>No homepage background yet</h2>
          <p>Add a published homepage slide to choose the first photograph visitors see.</p>
          <Link className="admin-btn" href="/admin/sections?tab=slides">
            Manage Homepage Slides
          </Link>
        </div>
      ) : (
        <>
          {message && <StatusMessage>{message}</StatusMessage>}
          {(error || image.error) && (
            <StatusMessage tone="error">
              {error || image.error}
              {error && (
                <button className="admin-text-link" onClick={reload} disabled={busy}>
                  {" "}
                  Reload current image
                </button>
              )}
            </StatusMessage>
          )}
          <div className="admin-background-grid">
            <div>
              <section className="admin-card">
                <div className="admin-background-preview">
                  <div className="admin-background-preview-header">
                    <h2>{image.selection ? "Preview New Image" : "Current Background"}</h2>
                    <div className="admin-device-switch" aria-label="Background preview size">
                      <button
                        aria-label="Desktop preview"
                        aria-pressed={!mobile}
                        onClick={() => setMobile(false)}
                      >
                        <Monitor size={16} />
                      </button>
                      <button
                        aria-label="Mobile preview"
                        aria-pressed={mobile}
                        onClick={() => setMobile(true)}
                      >
                        <Smartphone size={16} />
                      </button>
                    </div>
                  </div>
                  <div className="admin-background-canvas">
                    <div className="admin-background-photo" data-mobile={mobile}>
                      <Image
                        loading="eager"
                        src={image.selection?.url || background.src}
                        alt={
                          image.selection
                            ? "New homepage background preview"
                            : "Current homepage background"
                        }
                        fill
                        sizes="(max-width: 767px) 90vw, 60vw"
                        unoptimized={Boolean(image.selection)}
                        style={{ objectFit: "cover", objectPosition: position || "center" }}
                      />
                      <div className="admin-background-overlay" />
                      <span className="admin-image-badge">
                        <span className="admin-live-dot" />
                        {image.selection ? "PREVIEW · NOT SAVED" : "CURRENT HOMEPAGE BACKGROUND"}
                      </span>
                    </div>
                  </div>
                  <div className="admin-background-caption">
                    <span>
                      {image.selection
                        ? "Your new image is only a preview until you save."
                        : "The first photo in your homepage slideshow."}
                    </span>
                    <span className="admin-badge">
                      <Check size={11} /> {image.selection ? "Ready to preview" : "Published"}
                    </span>
                  </div>
                </div>
                <div className="admin-background-controls" style={{ marginTop: 0 }}>
                  <ImagePicker
                    label="Replace Background Image"
                    selection={image.selection}
                    onSelect={(file) => {
                      setMessage("");
                      void image.select(file);
                    }}
                    disabled={busy}
                  />
                  <hr className="admin-divider" />
                  <h3>Image position</h3>
                  <p className="admin-card-note">
                    Choose which part of your photograph stays in view on smaller screens.
                  </p>
                  <div className="admin-position-options" aria-label="Background position">
                    <button
                      disabled={busy}
                      aria-pressed={position === null}
                      onClick={() => setPosition(null)}
                    >
                      Original
                    </button>
                    {backgroundPositions.map((value) => (
                      <button
                        key={value}
                        disabled={busy}
                        aria-pressed={position === value}
                        onClick={() => setPosition(value)}
                      >
                        {value[0].toUpperCase() + value.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="admin-background-savebar">
                  <p>
                    {changed
                      ? "You have changes ready to save."
                      : "Your published background is up to date."}
                  </p>
                  <div className="admin-actions">
                    <button
                      className="admin-btn admin-btn-secondary"
                      onClick={cancel}
                      disabled={busy || !changed}
                    >
                      Cancel
                    </button>
                    <button
                      className="admin-btn admin-btn-teal"
                      onClick={() => save()}
                      disabled={busy || !changed || Boolean(image.error)}
                    >
                      <Save size={15} />
                      {busy ? "Saving…" : "Save Changes"}
                    </button>
                  </div>
                </div>
              </section>
            </div>
            <aside className="admin-background-aside">
              <section className="admin-card">
                <span className="admin-badge admin-badge-gold">A little guidance</span>
                <h2 style={{ marginTop: 17 }}>A photograph that feels like your school</h2>
                <p>
                  Use a clear landscape photograph, ideally at least 1920 pixels wide.
                  High-resolution images, including 4K photos, are welcome.
                </p>
                <p>
                  Check both desktop and mobile previews before saving. Your homepage text and its
                  contrast overlay stay in place.
                </p>
              </section>
              <section className="admin-card">
                <h2>Previous background</h2>
                {background.previous ? (
                  <>
                    <p>Your last background is kept so you can switch back.</p>
                    <div className="admin-preview-image">
                      <Image
                        src={background.previous.src}
                        alt="Previous homepage background"
                        fill
                        sizes="280px"
                        style={{ objectPosition: background.previous.position || "center" }}
                      />
                    </div>
                    <button
                      className="admin-btn admin-btn-secondary"
                      onClick={() => setRestoring(true)}
                      disabled={busy}
                    >
                      <RotateCcw size={15} /> Restore Previous Image
                    </button>
                  </>
                ) : (
                  <p>
                    After your first change, the previous image will appear here. Your original
                    photographs remain available.
                  </p>
                )}
              </section>
              <section className="admin-card">
                <h2>Looking for the other photos?</h2>
                <p>Manage the rest of the slideshow without changing this background.</p>
                <Link className="admin-text-link" href="/admin/sections?tab=slides">
                  Manage Homepage Slides <ArrowUpRight size={14} />
                </Link>
              </section>
            </aside>
          </div>
          {restoring && (
            <ConfirmDialog
              title="Restore previous background?"
              destructive={false}
              confirmLabel="Restore Image"
              busy={busy}
              onConfirm={() => save(true)}
              onCancel={() => setRestoring(false)}
            >
              <p>
                The previous photograph and its position will return to the homepage. Your current
                background stays available to restore again.
              </p>
            </ConfirmDialog>
          )}
        </>
      )}
    </AdminShell>
  );
}

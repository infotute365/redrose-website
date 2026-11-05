"use client";

import { useEffect, useRef, type ReactNode } from "react";

export function ConfirmDialog({
  title,
  children,
  confirmLabel = "Delete",
  busy = false,
  destructive = true,
  onConfirm,
  onCancel,
}: {
  title: string;
  children: ReactNode;
  confirmLabel?: string;
  busy?: boolean;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  return (
    <dialog
      ref={dialog}
      className="admin-confirm"
      aria-label={title}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onCancel();
      }}
    >
      <div className="admin-confirm-content">
        <h2>{title}</h2>
        <div>{children}</div>
        <div className="admin-actions">
          <button className="admin-btn admin-btn-secondary" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button
            className={`admin-btn ${destructive ? "admin-btn-danger" : "admin-btn-teal"}`}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? "Please wait…" : confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}

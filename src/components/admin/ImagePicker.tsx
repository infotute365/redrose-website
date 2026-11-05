"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { ImagePlus, UploadCloud } from "lucide-react";

export type ImageSelection = { file: File; url: string; width: number; height: number };
export function formatFileSize(bytes: number) {
  return bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function useImageDraft(allowGif = false) {
  const [selection, setSelection] = useState<ImageSelection | null>(null);
  const [error, setError] = useState("");
  const serial = useRef(0);
  useEffect(
    () => () => {
      serial.current++;
    },
    [],
  );
  useEffect(() => {
    const url = selection?.url;
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [selection?.url]);
  const clear = useCallback(() => {
    serial.current++;
    setSelection(null);
    setError("");
  }, []);
  const select = useCallback(
    async (file?: File) => {
      if (!file) return;
      const attempt = ++serial.current;
      setError("");
      const allowed = ["image/jpeg", "image/png", "image/webp", ...(allowGif ? ["image/gif"] : [])];
      if (!allowed.includes(file.type)) {
        setError(`Choose a JPEG, PNG or WebP image${allowGif ? ", or a GIF" : ""}.`);
        return;
      }
      if (!file.size || file.size > 20 * 1024 * 1024) {
        setError("Choose an image between 1 byte and 20 MB.");
        return;
      }
      const url = URL.createObjectURL(file);
      try {
        const image = new window.Image();
        image.src = url;
        await image.decode();
        if (image.naturalWidth * image.naturalHeight > 40_000_000)
          throw new Error("Choose an image smaller than 40 megapixels.");
        if (attempt !== serial.current) {
          URL.revokeObjectURL(url);
          return;
        }
        setSelection({ file, url, width: image.naturalWidth, height: image.naturalHeight });
      } catch (caught) {
        URL.revokeObjectURL(url);
        if (attempt === serial.current)
          setError(
            caught instanceof Error && caught.message.includes("megapixels")
              ? caught.message
              : "This image could not be opened. Try another photograph.",
          );
      }
    },
    [allowGif],
  );
  return { selection, error, select, clear };
}

export function ImagePicker({
  onSelect,
  selection,
  disabled,
  label = "Replace Image",
  allowGif = false,
}: {
  onSelect: (file?: File) => void;
  selection: ImageSelection | null;
  disabled?: boolean;
  label?: string;
  allowGif?: boolean;
}) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  return (
    <div>
      <div
        className="admin-dropzone"
        data-dragging={dragging}
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          if (!disabled) onSelect(event.dataTransfer.files[0]);
        }}
      >
        <span className="admin-drop-icon">
          <UploadCloud size={23} />
        </span>
        <button
          type="button"
          className="admin-btn admin-btn-teal"
          onClick={() => input.current?.click()}
          disabled={disabled}
        >
          <ImagePlus size={16} />
          {label}
        </button>
        <p id={`${id}-help`}>or drag and drop your photograph here</p>
        <small>JPEG, PNG, WebP{allowGif ? ", GIF" : ""} · up to 20 MB</small>
        <input
          ref={input}
          id={id}
          type="file"
          aria-label={label}
          aria-describedby={`${id}-help`}
          accept={`image/jpeg,image/png,image/webp${allowGif ? ",image/gif" : ""}`}
          className="sr-only"
          disabled={disabled}
          onChange={(event) => {
            onSelect(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
      </div>
      {selection && (
        <div className="admin-file-details">
          <strong>{selection.file.name}</strong>
          <span>
            {selection.width} × {selection.height} px
          </span>
          <span>{formatFileSize(selection.file.size)}</span>
          {selection.width < 1600 && (
            <span>A wider photograph will look sharper on large screens.</span>
          )}
        </div>
      )}
    </div>
  );
}

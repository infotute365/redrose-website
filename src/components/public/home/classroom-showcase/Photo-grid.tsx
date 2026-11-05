"use client";

import { useCallback, useEffect } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { PhotoTile } from "./Photo-tile";

type Photo = { id: string; src: string; alt: string; title: string };

export function PhotoGrid({
  photos,
  activeIndex,
  onChange,
}: {
  photos: Photo[];
  activeIndex: number;
  onChange: (index: number) => void;
}) {
  const showPhoto = useCallback(
    (index: number) => onChange((index + photos.length) % photos.length),
    [onChange, photos.length],
  );

  useEffect(() => {
    if (photos.length < 2) return;
    const timer = window.setInterval(() => {
      onChange((activeIndex + 1) % photos.length);
    }, 6000);
    return () => window.clearInterval(timer);
  }, [activeIndex, onChange, photos.length]);

  if (!photos.length) return null;

  const activePhoto = photos[activeIndex];

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
      className="min-w-0"
      aria-roledescription="carousel"
      aria-label="School photo gallery"
    >
      <div className="relative">
        <PhotoTile
          key={activePhoto.id}
          src={activePhoto.src}
          alt={activePhoto.alt}
          eager={activeIndex === 0}
        />
        <div className="absolute bottom-4 left-4 rounded-full border border-white/30 bg-neutral-950/35 px-4 py-2 text-xs font-semibold tracking-wide text-white backdrop-blur sm:bottom-6 sm:left-6">
          {activePhoto.title}
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2" aria-label="Choose a slide">
          {photos.map((photo, index) => (
            <button
              key={photo.id}
              type="button"
              onClick={() => showPhoto(index)}
              aria-label={`Show slide ${index + 1}: ${photo.title}`}
              aria-current={index === activeIndex}
              className={`h-2.5 rounded-full transition-all ${index === activeIndex ? "w-8 bg-sky-800" : "w-2.5 bg-sky-200 hover:bg-sky-300"}`}
            />
          ))}
          <span className="ml-2 text-sm tabular-nums text-neutral-500">
            {String(activeIndex + 1).padStart(2, "0")} <span className="text-neutral-300">/</span>{" "}
            {String(photos.length).padStart(2, "0")}
          </span>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => showPhoto(activeIndex - 1)}
            aria-label="Previous photo"
            className="grid size-11 place-items-center rounded-full border border-neutral-200 bg-white text-neutral-800 transition hover:border-sky-200 hover:bg-sky-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-800"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => showPhoto(activeIndex + 1)}
            aria-label="Next photo"
            className="grid size-11 place-items-center rounded-full bg-sky-800 text-white transition hover:bg-sky-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-800"
          >
            <ArrowRight className="size-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

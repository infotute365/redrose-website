"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import type { EduPhoto } from "./EduPhotoGrid";

type EduPhotoTileProps = Omit<EduPhoto, "id">;

export function EduPhotoTile({
  src,
  alt,
  title,
  delay = 0,
}: EduPhotoTileProps & { delay?: number }) {
  return (
    <motion.figure
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
      className="group overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm transition-shadow hover:shadow-lg"
    >
      <div className="relative aspect-4/3 overflow-hidden bg-sky-50">
        <Image
          src={src}
          alt={alt}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 560px"
          className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />
      </div>
      <figcaption className="px-5 py-4 text-base font-semibold text-neutral-900">
        {title}
      </figcaption>
    </motion.figure>
  );
}

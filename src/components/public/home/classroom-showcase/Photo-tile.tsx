import Image from "next/image";
import { motion } from "framer-motion";

type PhotoTileProps = {
  src: string;
  alt: string;
  eager?: boolean;
};

export function PhotoTile({ src, alt, eager = false }: PhotoTileProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 1.025 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
      className="relative aspect-4/3 overflow-hidden rounded-[1.75rem] bg-sky-100 shadow-2xl shadow-sky-950/10 sm:aspect-5/4"
    >
      <Image
        src={src}
        alt={alt}
        fill
        preload={eager}
        sizes="(max-width: 1024px) 100vw, 52vw"
        className="object-cover transition-transform duration-700"
      />
      <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-neutral-950/25 via-transparent to-transparent" />
    </motion.div>
  );
}

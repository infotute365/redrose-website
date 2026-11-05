"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

type ShowcaseIntroProps = {
  title: string;
  description: string;
};

export function ShowcaseIntro({ title, description }: ShowcaseIntroProps) {
  return (
    <motion.div
      className="max-w-xl"
      initial="hidden"
      animate="visible"
      variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.1 } } }}
    >
      <motion.p
        variants={{ hidden: { opacity: 0, y: 14 }, visible: { opacity: 1, y: 0 } }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wider text-neutral-600 shadow-sm"
      >
        <span className="size-1.5 rounded-full bg-cyan-700" />
        Our school
      </motion.p>

      <motion.h2
        variants={{ hidden: { opacity: 0, y: 14 }, visible: { opacity: 1, y: 0 } }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className="mt-6 text-5xl font-semibold leading-[1.02] tracking-tight text-balance text-neutral-900 sm:text-6xl"
      >
        {title}
      </motion.h2>

      <motion.p
        variants={{ hidden: { opacity: 0, y: 14 }, visible: { opacity: 1, y: 0 } }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className="mt-6 text-lg leading-relaxed text-neutral-600"
      >
        {description}
      </motion.p>

      <motion.div
        variants={{ hidden: { opacity: 0, y: 14 }, visible: { opacity: 1, y: 0 } }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className="mt-10 flex flex-wrap gap-3"
      >
        <Link
          href="#gallery"
          className="inline-flex h-12 items-center gap-2 rounded-full bg-sky-800 px-6 text-[15px] font-semibold text-white transition-colors hover:bg-sky-800"
        >
          View full gallery
          <ArrowRight data-icon="inline-end" />
        </Link>
        <Link
          href="#contact"
          className="inline-flex h-12 items-center rounded-full border border-neutral-300 bg-white px-6 text-[15px] font-semibold text-neutral-800 transition-colors hover:bg-neutral-50"
        >
          Book a school visit
        </Link>
      </motion.div>
    </motion.div>
  );
}

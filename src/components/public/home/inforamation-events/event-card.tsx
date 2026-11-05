"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { SchoolEvent } from "@/src/lib/content/home";

const toneDot: Record<SchoolEvent["tone"], string> = {
  amber: "bg-amber-400",
  rose: "bg-cyan-700",
  sky: "bg-sky-500",
  emerald: "bg-emerald-500",
};

export function EventCard({ event, delay = 0 }: { event: SchoolEvent; delay?: number }) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -4 }}
      className="group relative flex flex-col rounded-[28px] bg-white p-2 shadow-sm ring-1 ring-black/5 transition duration-300 hover:shadow-xl hover:shadow-neutral-900/10"
    >
      <div className="relative aspect-4/3 overflow-hidden sm:aspect-4/5 rounded-[22px] bg-neutral-100">
        <Image
          src={event.image}
          alt={event.alt}
          fill
          sizes="(min-width: 1024px) 300px, (min-width: 640px) 50vw, 100vw"
          className="object-cover object-[50%_30%] transition-transform duration-700 ease-out group-hover:scale-105 motion-reduce:transition-none"
        />
        <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-neutral-800 shadow-sm backdrop-blur">
          <span className={cn("size-1.5 rounded-full", toneDot[event.tone])} />
          {event.category}
        </span>
      </div>

      <div className="flex flex-1 flex-col px-3 pb-3 pt-5">
        <h3 className="text-lg font-semibold tracking-tight text-neutral-900">
          <Link
            href={`#${event.slug}`}
            className="outline-none after:absolute after:inset-0 after:rounded-[28px] focus-visible:after:ring-2 focus-visible:after:ring-cyan-700"
          >
            {event.title}
          </Link>
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-neutral-600">{event.description}</p>

        {/* <div className="mt-auto flex items-center justify-between pt-6">
          <span className="text-sm font-medium text-neutral-900">Read more</span>
          <span className="grid size-9 place-items-center rounded-full bg-neutral-100 text-neutral-900 transition-colors duration-300 group-hover:bg-cyan-700 group-hover:text-white">
            <ArrowUpRight className="size-4 transition-transform duration-300 group-hover:rotate-45" />
          </span>
        </div> */}
      </div>
    </motion.article>
  );
}

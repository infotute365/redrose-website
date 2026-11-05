"use client";

import { EventCard } from "./event-card";
import { Container } from "@/src/components/shared/Container";
import { eventsSection } from "@/src/lib/content/home";
import type { EditableEvent } from "@/src/lib/dynamic-sections";
import { motion } from "framer-motion";

export function EventsSection({ events }: { events: EditableEvent[] }) {
  const { eyebrow, title, highlight } = eventsSection;

  return (
    <section id="school-events" aria-label={eyebrow} className="py-16 sm:py-24">
      <Container>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          >
            <p className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wider text-neutral-600 shadow-sm">
              <span className="size-1.5 rounded-full bg-cyan-700" />
              {eyebrow}
            </p>
            <h2 className="mt-5 text-4xl font-semibold tracking-tight text-neutral-900 sm:text-5xl">
              {title}{" "}
              <span className="font-serif font-normal italic text-cyan-700">{highlight}</span>
            </h2>
          </motion.div>

          <div className="flex flex-col gap-5 lg:max-w-sm lg:items-end lg:text-right">
            {/* <p className="text-neutral-600">{description}</p>
                         <Link
                             href="#events"
                             className={cn(
                             buttonVariants({ variant: "outline", size: "lg" }),
                             "h-11 w-fit rounded-full bg-white px-5",
                             )}
                             >
                             View all events
                           <ArrowRight data-icon="inline-end" />
                             </Link> */}
          </div>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {events.map((event, index) => (
            <EventCard key={event.slug} event={event} delay={index * 0.09} />
          ))}
        </div>
      </Container>
    </section>
  );
}

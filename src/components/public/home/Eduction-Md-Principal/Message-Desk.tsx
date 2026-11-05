"use client";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Container } from "@/src/components/shared/Container";
import { motion } from "framer-motion";

export function MessageDesk() {
  return (
    <section aria-labelledby="message-desk-title" className="py-16 sm:py-24">
      <Container>
        <div className="overflow-hidden rounded-[2rem] bg-sky-50/70 ring-1 ring-sky-100">
          <div className="grid items-center gap-8 p-6 sm:p-10 lg:grid-cols-[minmax(0,1.35fr)_minmax(16rem,0.65fr)] lg:gap-14 lg:p-14">
            <motion.div
              initial={{ opacity: 0, x: -18 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            >
              <p className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-sky-800">
                A message from our leadership
              </p>
              <h2
                id="message-desk-title"
                className="mt-5 text-3xl font-semibold tracking-tight text-neutral-900 sm:text-4xl"
              >
                Message from the Desk of the Managing Director
              </h2>

              <div className="mt-6 space-y-5 text-base leading-8 text-neutral-700 sm:text-lg sm:leading-8">
                <p>
                  Education is a process of gathering knowledge while developing intelligence,
                  conscience, and sound judgment through experience and continuous learning. It
                  helps each person realize their potential and contribute to the growth of society.
                </p>
                <p>
                  At Red Rose Academy, we aim to nurture every student’s abilities and help them
                  grow with confidence. With the support of our dedicated teaching staff, we work to
                  provide engaging, forward-looking education that prepares students for the
                  challenges of life.
                </p>
                <p>
                  Learning here reaches beyond textbooks. We value strong moral foundations,
                  personal growth, and extracurricular activities alongside academic achievement.
                </p>
              </div>
              <Link
                href="/pages/message-from-md"
                className="mt-7 inline-flex h-12 items-center gap-2 rounded-full bg-sky-800 px-6 text-sm font-semibold text-white transition-colors hover:bg-sky-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-800"
              >
                Read more
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>

              <p className="mt-8 border-t border-sky-200 pt-5 text-sm font-semibold uppercase tracking-[0.12em] text-neutral-900">
                Akmal Hussain Barbhuiya
                <span className="ml-2 font-normal normal-case tracking-normal text-neutral-500">
                  Managing Director, Red Rose Academy
                </span>
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 18 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.65, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
              className="relative mx-auto aspect-4/5 w-full max-w-sm overflow-hidden rounded-[1.5rem] bg-sky-100 shadow-xl shadow-sky-950/10 lg:mx-0 lg:max-w-none"
            >
              <Image
                src="/images/Md.jpeg"
                alt="Managing Director of Red Rose Academy"
                fill
                sizes="(max-width: 1024px) 100vw, 35vw"
                className="object-cover object-top"
              />
            </motion.div>
          </div>
        </div>
      </Container>
    </section>
  );
}

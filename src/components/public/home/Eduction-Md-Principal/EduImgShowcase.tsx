"use client";

import { Container } from "@/src/components/shared/Container";
import { EduPhotoGrid } from "./EduPhotoGrid";
import { EduImgShowcase as educationPhotos } from "@/src/lib/content/Edu-md-principal";
import { motion } from "framer-motion";

export function Edu_Img_Showcase() {
  return (
    <section aria-labelledby="education-links-title" className="bg-sky-50/60 py-16 sm:py-24">
      <Container>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto mb-10 max-w-2xl text-center sm:mb-14"
        >
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-800">
            Information for families
          </p>
          <h2
            id="education-links-title"
            className="mt-3 text-3xl font-semibold tracking-tight text-neutral-900 sm:text-4xl"
          >
            Everything you need to know
          </h2>
          <p className="mt-4 text-base leading-relaxed text-neutral-600">
            Find key details about admissions, school fees, the academic calendar, and student
            achievements.
          </p>
        </motion.div>
        <EduPhotoGrid photos={educationPhotos} />
      </Container>
    </section>
  );
}

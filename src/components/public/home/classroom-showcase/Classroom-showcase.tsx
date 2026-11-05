"use client";

import { useState } from "react";
import { Container } from "@/src/components/shared/Container";
import { ShowcaseIntro } from "./Showcase-intro";
import { PhotoGrid } from "./Photo-grid";
import { classroomShowcase } from "@/src/lib/content/home";
import { CircularsSection } from "../CircularsSection";
import type { Circular } from "@/src/lib/circulars";

export function ClassroomShowcase({ circulars }: { circulars: Circular[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeSlide = classroomShowcase[activeIndex];

  return (
    <section aria-label="Our school" className="overflow-hidden py-16 sm:py-24">
      <Container className="grid items-center gap-14 lg:grid-cols-[1fr_1.1fr] lg:gap-16">
        <ShowcaseIntro title={activeSlide.title} description={activeSlide.description} />
        <div className="min-w-0">
          <PhotoGrid
            photos={classroomShowcase}
            activeIndex={activeIndex}
            onChange={setActiveIndex}
          />
          <CircularsSection circulars={circulars} />
        </div>
      </Container>
    </section>
  );
}

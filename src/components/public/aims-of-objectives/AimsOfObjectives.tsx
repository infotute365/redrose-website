import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Container } from "@/src/components/shared/Container";

export function AimsOfObjectives() {
  return (
    <main className="flex-1 py-12 sm:py-20">
      <Container>
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-sky-800 transition-colors hover:text-sky-800"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to home
        </Link>

        <article className="mx-auto mt-8 max-w-5xl overflow-hidden rounded-[2rem] bg-sky-50/70 ring-1 ring-sky-100 sm:mt-10">
          <div className="grid lg:grid-cols-[minmax(0)_19rem]">
            <div className="p-6 sm:p-10 lg:p-14">
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-neutral-900 sm:text-4xl">
                Aim Of Objectives
              </h1>
              <div className="mt-7 space-y-5 text-base leading-8 text-neutral-700 sm:text-lg sm:leading-8">
                <p>
                  The aim of the school is to provide the best possible education to the students.
                  It is therefore , the main aim of the Red Rose Academy. Our primary objective is
                  to develop the students qualities of integrity , honesty , trust , tolerance and
                  compassion to promote a sprit of enquiry to foster a scientific temper within the
                  bonds of humanism, to help the student to become a meaningful part of his
                  environment and to see that courage and industry as their due reward. The pursuits
                  of excellence encouraged at Red Rose Academy rests on the positive belief that
                  every man has it in him to produce first class work.
                </p>
                <p>
                  Towards this end the school endeavors to provide a large , qualified , experienced
                  and dedicated staffs with a wide range of skills and interest, a varied and wide
                  choice of activities , academic , aesthetic and athletic , an environment enriched
                  with the excitement of discovery challenge and competitiveness and discipline
                  based on the belief that responsibility comes before freedom.
                </p>
              </div>
            </div>
          </div>
        </article>
      </Container>
    </main>
  );
}

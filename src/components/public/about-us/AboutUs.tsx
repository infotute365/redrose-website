import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Container } from "@/src/components/shared/Container";

export function AboutUs() {
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
                About Red Rose Academy
              </h1>
              <div className="mt-7 space-y-5 text-base leading-8 text-neutral-700 sm:text-lg sm:leading-8">
                <p>
                  It has been 8 years since the idea of Red Rose Academy was mooted and made a
                  reality. From the pioneering days the school has developed much and has evolved
                  into on academic institution to the best.
                </p>
                <p>
                  The school shall gain its affiliation from the Central Board of Secondary
                  Education, New Delhi.
                </p>
                <p>
                  Over the year the school has progressed into an Avant- grade one, with excellent
                  teaching methods and latest equipment’s and the onward thrust has found expression
                  in the trail blazing academic achievements of the students.
                </p>
                <p>
                  Red Rose Academy is a strong institution staffed by highly qualified teachers. Our
                  fully equipped laboratories are second to none with the most modern equipment’s
                  and facilities. The School library too boasts of an impressive collection of
                  books, the pride of which is the reference section.
                </p>
                <p>
                  The school has a modern campus designed to provide a learning and the living
                  environment that would meet the academic , developmental and social needs of
                  students. The school is ambitious and has a grandiose plan for the future. The
                  recently built modern multipurpose hall is another step towards the infrastructure
                  development plans that the school has taken.
                </p>
                <p>
                  Since the onset of pandemic our qualified faculty excelled to fit the classrooms
                  into our screens. Our online classes had been another success story studded with
                  interactive sessions between teachers and students , copy corrections and
                  assessments. Your child gets a transparent , high quality education regardless of
                  situation and location. Our technology enabled learning platform provides relevant
                  and timely feedback.
                </p>
              </div>
            </div>
          </div>
        </article>
      </Container>
    </main>
  );
}

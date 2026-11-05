import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Container } from "@/src/components/shared/Container";

export const metadata = {
  title: "A Message from the Managing Director | Red Rose Academy",
  description: "Read the full message from the Managing Director of Red Rose Academy.",
};

export default function MessageFromMdPage() {
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
          <div className="grid lg:grid-cols-[minmax(0,1fr)_19rem]">
            <div className="p-6 sm:p-10 lg:p-14">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-800">
                From our leadership
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-neutral-900 sm:text-4xl">
                Message from the Desk of the Managing Director
              </h1>

              <div className="mt-7 space-y-5 text-base leading-8 text-neutral-700 sm:text-lg sm:leading-8">
                <p>
                  Education is a process of gathering knowledge by developing the power of
                  intelligence, conscience, and the ability to judge through the continuous
                  evaluation and construction of experiences and skills. Education develops and
                  polishes our inherent potential for personal, social, and national development. It
                  is the light that removes darkness and enlightens society. Education has led us
                  from primitive times to modern civilization. Moreover, primary education is the
                  foundation for building a developed nation.
                </p>
                <p>
                  Red Rose Academy aims to provide students with a complete education by nourishing
                  and nurturing their inherent abilities so they can excel and face every challenge
                  in life. With the help of our efficient, energetic, and sincere teaching staff, we
                  strive to provide advanced and innovative education that prepares the next
                  generation to succeed in every aspect of life. Knowledge is power, and our
                  institution is committed to helping students and society gain this power through
                  comprehensive education. Education at our institution is not limited to books: we
                  also strengthen students’ moral and ethical foundations, develop their
                  personalities, and encourage extracurricular activities.
                </p>
              </div>

              <p className="mt-9 border-t border-sky-200 pt-5 text-sm font-semibold uppercase tracking-[0.12em] text-neutral-900">
                Akmal Hussain Barbhuiya
                <span className="ml-2 font-normal normal-case tracking-normal text-neutral-500">
                  Managing Director, Red Rose Academy
                </span>
              </p>
            </div>

            <div className="relative h-80 bg-sky-100 lg:h-auto lg:aspect-[4/5] lg:self-start">
              <Image
                src="/images/Md.jpeg"
                alt="Managing Director of Red Rose Academy"
                fill
                sizes="(max-width: 1024px) 100vw, 304px"
                className="object-cover object-top"
              />
            </div>
          </div>
        </article>
      </Container>
    </main>
  );
}

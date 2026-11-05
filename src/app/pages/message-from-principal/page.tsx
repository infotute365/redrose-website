import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Container } from "@/src/components/shared/Container";

export const metadata = {
  title: "A Message from the Principal | Red Rose Academy",
  description: "Read the message from Aparajita Shome Dhar, Principal of Red Rose Academy.",
};

export default function MessageFromPrincipalPage() {
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
                From our school leadership
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-neutral-900 sm:text-4xl">
                Message from our Principal
              </h1>
              <div className="mt-7 space-y-5 text-base leading-8 text-neutral-700 sm:text-lg sm:leading-8">
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
              <p className="mt-9 border-t border-sky-200 pt-5 text-sm font-semibold uppercase tracking-[0.12em] text-neutral-900">
                Aparajita Shome Dhar
                <span className="ml-2 font-normal normal-case tracking-normal text-neutral-500">
                  Principal, Red Rose Academy
                </span>
              </p>
            </div>

            <div className="relative min-h-72 bg-sky-100 lg:min-h-full">
              <Image
                src="/images/principal.jpg"
                alt="Principal of Red Rose Academy"
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

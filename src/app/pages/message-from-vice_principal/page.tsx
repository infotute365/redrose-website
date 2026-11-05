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
          <div className="grid lg:grid-cols-[minmax(0)_19rem]">
            <div className="p-6 sm:p-10 lg:p-14">
              <p className="text-xs font-semibold  uppercase tracking-[0.18em] text-sky-800">
                From our school leadership
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-neutral-900 sm:text-4xl">
                Message from our Vice Principal
              </h1>
              <div className="mt-7 space-y-5 text-base leading-8 text-neutral-700 sm:text-lg sm:leading-8">
                <p>
                  John Dewey. Red Rose Academy Concurs on the magnitude of this statement and
                  strives to impact the lives of the students under its fold with positiving and
                  transforming learning experiences. The holistic intervention in education is
                  imperative at every growth phase of the student. We are thus constantly striving
                  to provide a conductive environment to create a balance in the academic ,
                  emotional, spiritual , creative and physical development of students.
                </p>
                <p>
                  We believe that in today’s world where change is constant and fast paced, we need
                  to as educators , adapt to the continuous innovative and improvised models and
                  trends in education research.
                </p>
                <p>
                  This helps us to deliver quality of the highest standards and provide a firm
                  foundation for the holistic development of our students .The learning environment
                  in the classroom is also aimed at teachers being sensitive to the various needs of
                  the different learners, in particular to students with learning challenges and
                  slow learners. So, I wholeheartedly request everyone to join us and enjoy the
                  atmosphere where the learning interaction inside and outside the classroom is done
                  with a lot of understanding and sensitivity.
                </p>
              </div>
              <p className="mt-9 border-t border-sky-200 pt-5 text-sm font-semibold uppercase tracking-[0.12em] text-neutral-900">
                Tania Mazumder
                <span className="ml-2 font-normal normal-case tracking-normal text-neutral-500">
                  Vice Principal, Red Rose Academy
                </span>
              </p>
            </div>

            {/* <div className="relative min-h-72 bg-sky-100 lg:min-h-full">
              <Image
                src="/images/principal.jpg"
                alt="Principal of Red Rose Academy"
                fill
                sizes="(max-width: 1024px) 100vw, 304px"
                className="object-cover object-top"
              />
            </div> */}
          </div>
        </article>
      </Container>
    </main>
  );
}

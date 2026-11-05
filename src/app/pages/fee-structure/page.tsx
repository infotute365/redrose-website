import { Suspense } from "react";
import { DocumentLibrary } from "@/src/components/public/DocumentLibrary";
import { getDocuments } from "@/src/lib/documents";

export const metadata = { title: "Fee Structure | Red Rose Academy" };

export default function FeeStructurePage() {
  return (
    <main className="flex-1 bg-[#f5f8fc]">
      <section className="mx-auto max-w-6xl px-5 py-14 sm:px-8 sm:py-20">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-800">Admissions</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-stone-900 sm:text-5xl">
          Fee structure
        </h1>
        <p className="mt-4 max-w-2xl leading-7 text-stone-600">
          Review the current fee information for Red Rose Academy.
        </p>
        <div className="mt-10">
          <Suspense fallback={<DocumentLoading />}>
            <FeeDocuments />
          </Suspense>
        </div>
      </section>
    </main>
  );
}

async function FeeDocuments() {
  const documents = await getDocuments("fees");
  return (
    <DocumentLibrary
      documents={documents}
      emptyMessage="The fee structure 
                          will appear here once 
                          it has been published."
      large
    />
  );
}

function DocumentLoading() {
  return (
    <div
      className="rounded-2xl border border-dashed border-sky-200 bg-white p-10 text-center text-sm text-stone-500"
      aria-live="polite"
    >
      Loading published documents…
    </div>
  );
}

import Link from "next/link";
import { Bell, FileText, ArrowLeft, ExternalLink, CalendarDays } from "lucide-react";
import { getCirculars } from "@/src/lib/circulars";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Circulars & Notices | Red Rose Academy",
  description: "Official school circulars and notices from Red Rose Academy, Silchar.",
};

export default async function CircularsPage() {
  const circulars = await getCirculars();
  return (
    <main className="flex-1 bg-[#f8faf8] px-5 py-14 text-[#19314a] sm:px-8 sm:py-20">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#0e6776]"
        >
          <ArrowLeft size={16} /> Back to homepage
        </Link>
        <div className="mt-9 flex flex-wrap items-center gap-5">
          <span className="rr-clay-icon grid size-16 place-items-center rounded-3xl text-[#0d6c82]">
            <Bell size={27} />
          </span>
          <div>
            <p className="rr-eyebrow">Official school information</p>
            <h1 className="mt-2 font-serif text-4xl font-bold tracking-tight text-[#163754] sm:text-5xl">
              Notices & Circulars
            </h1>
          </div>
        </div>
        <p className="mt-5 max-w-2xl leading-7 text-[#5c6e78]">
          Updates published by Red Rose Academy. Official PDFs are available with each circular when
          attached.
        </p>
        <div className="mt-9 grid gap-4">
          {circulars.length ? (
            circulars.map((item) => (
              <article
                key={item.id}
                className="rounded-[24px] border border-[#e0e8e9] bg-white p-5 shadow-sm sm:p-7"
              >
                <div className="flex items-start gap-4">
                  <span className="rr-clay-icon grid size-12 shrink-0 place-items-center rounded-2xl text-[#0f6b7a]">
                    <FileText size={22} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 text-xs font-semibold text-[#a06d30]">
                      <CalendarDays size={13} />
                      {item.noticeDate}
                    </p>
                    <h2 className="mt-2 font-serif text-2xl font-bold text-[#183550]">
                      {item.title}
                    </h2>
                    <p className="mt-3 whitespace-pre-line text-sm leading-7 text-[#536a7b]">
                      {item.description}
                    </p>
                    {item.pdfUrl && (
                      <a
                        href={item.pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#0e6070] px-5 py-2.5 text-sm font-bold text-white"
                      >
                        Open document <ExternalLink size={15} />
                      </a>
                    )}
                  </div>
                </div>
              </article>
            ))
          ) : (
            <div className="rounded-[25px] border border-[#e2ebeb] bg-white p-12 text-center">
              <Bell size={30} className="mx-auto text-[#0c6978]" />
              <p className="mt-4 font-semibold">No circulars have been published yet.</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

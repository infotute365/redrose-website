import { ArrowUpRight, Bell, FileText } from "lucide-react";
import type { Circular } from "@/src/lib/circulars";

export function CircularsSection({ circulars }: { circulars: Circular[] }) {
  const latestCirculars = circulars.slice(0, 3);
  return (
    <section
      aria-labelledby="circulars-heading"
      className="mt-5 rounded-2xl border border-sky-100 bg-sky-50/60 p-4 sm:p-5"
    >
      <div className="flex items-center gap-2.5">
        <span className="grid size-9 place-items-center rounded-xl bg-white text-sky-800 shadow-sm">
          <Bell className="size-4" />
        </span>
        <h2 id="circulars-heading" className="text-lg font-semibold tracking-tight text-stone-900">
          School notices
        </h2>
      </div>
      {!latestCirculars.length ? (
        <p className="mt-3 text-sm text-stone-500">No notices at the moment.</p>
      ) : (
        <ul className="mt-3 space-y-2.5">
          {latestCirculars.map((circular) => (
            <li
              key={circular.id}
              className="rounded-xl border border-sky-100/80 bg-white px-3 py-2.5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <time
                    dateTime={circular.noticeDate}
                    className="text-[11px] font-semibold uppercase tracking-wider text-sky-800"
                  >
                    {new Date(`${circular.noticeDate}T00:00:00`).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </time>
                  <h3 className="mt-0.5 text-sm font-semibold text-stone-900">{circular.title}</h3>
                  <p className="mt-1 line-clamp-2 whitespace-pre-line text-xs leading-5 text-stone-600">
                    {circular.description}
                  </p>
                </div>
                {circular.pdfUrl && (
                  <a
                    href={circular.pdfUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-800 hover:bg-sky-100"
                  >
                    <FileText className="size-4" />
                    PDF
                    <ArrowUpRight className="size-4" />
                  </a>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

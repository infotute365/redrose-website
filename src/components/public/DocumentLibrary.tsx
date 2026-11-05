import Link from "next/link";
import { FileText, Image as ImageIcon, ArrowUpRight } from "lucide-react";
import type { SchoolDocument } from "@/src/lib/documents";
import Image from "next/image";

export function DocumentLibrary({
  documents,
  emptyMessage,
  large = false,
}: {
  documents: SchoolDocument[];
  emptyMessage: string;
  large?: boolean;
}) {
  if (!documents.length)
    return (
      <div className="rounded-2xl border border-dashed border-sky-200 bg-white p-10 text-center text-sm leading-6 text-stone-500">
        {emptyMessage}
      </div>
    );
  return (
    <div className={`grid gap-6 ${large ? "grid-cols-1" : "md:grid-cols-3"}`}>
      {documents.map((document) => (
        <article
          key={document.id}
          className="overflow-hidden rounded-2xl border border-sky-100 bg-white shadow-sm"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-sky-50 px-5 py-4 sm:px-7">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-sky-50 text-sky-800">
                {document.mimeType === "application/pdf" ? (
                  <FileText className="size-5" />
                ) : (
                  <ImageIcon className="size-5" />
                )}
              </span>
              <div>
                <h2 className="font-semibold text-stone-900">{document.title}</h2>
                <p className="mt-1 text-xs text-stone-500">{document.fileName}</p>
              </div>
            </div>
            <Link
              href={document.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-sky-800 hover:bg-sky-50"
            >
              Open file
              <ArrowUpRight className="size-4" />
            </Link>
          </div>
          <div className="w-full">
            {document.mimeType === "application/pdf" ? (
              <iframe
                title={document.title}
                src={`${document.url}#view=FitH`}
                className={`${large ? "h-[min(75vh,760px)]" : "h-[400px]"} w-full border-0 bg-stone-100`}
              />
            ) : (
              <Image
                src={document.url}
                alt={document.title}
                width={large ? 1200 : 640}
                height={large ? 900 : 420}
                className={`${large ? "max-h-[760px]" : "max-h-96"} w-full bg-stone-50 object-contain`}
              />
            )}
          </div>
        </article>
      ))}
    </div>
  );
}

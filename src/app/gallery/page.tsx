import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Images } from "lucide-react";
import { getSchoolEvents, getHomeSlides } from "@/src/lib/dynamic-sections";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "School Gallery | Red Rose Academy",
  description: "Photographs and school events of Red Rose Academy, Silchar.",
};

export default async function GalleryPage() {
  const [slides, events] = await Promise.all([getHomeSlides(), getSchoolEvents()]);
  const photos = [
    ...slides.map((s) => ({
      id: `slide-${s.id}`,
      src: s.src,
      alt: s.alt,
      title: s.title,
      description: s.description,
    })),
    ...events.map((e) => ({
      id: `event-${e.slug}`,
      src: e.image,
      alt: e.alt,
      title: e.title,
      description: e.description,
    })),
  ];
  return (
    <main className="flex-1 bg-[#f8faf8] px-5 py-14 text-[#19314a] sm:px-8 sm:py-20">
      <div className="mx-auto max-w-7xl">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#0e6776]"
        >
          <ArrowLeft size={16} /> Back to homepage
        </Link>
        <div className="mt-9 flex items-center gap-5">
          <span className="rr-clay-icon grid size-16 place-items-center rounded-3xl text-[#0d6c82]">
            <Images size={27} />
          </span>
          <div>
            <p className="rr-eyebrow">Moments at our school</p>
            <h1 className="mt-2 font-serif text-4xl font-bold tracking-tight text-[#163754] sm:text-5xl">
              Red Rose Gallery
            </h1>
          </div>
        </div>
        <p className="mt-5 max-w-2xl leading-7 text-[#5c6e78]">
          Original school photographs and published event pictures. New photographs appear when the
          school administrator publishes them.
        </p>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {photos.map((photo, index) => (
            <article
              key={photo.id}
              className="overflow-hidden rounded-[27px] border border-white bg-white p-2 shadow-[0_15px_42px_rgba(26,64,78,.08)]"
            >
              <div className="relative aspect-[4/3] overflow-hidden rounded-[22px] bg-[#e7f0ed]">
                <Image
                  loading={index === 0 ? "eager" : "lazy"}
                  src={photo.src}
                  alt={photo.alt || photo.title}
                  fill
                  sizes="(min-width:1280px) 33vw, (min-width:640px) 50vw, 100vw"
                  className="object-cover transition-transform duration-500 hover:scale-[1.035]"
                />
              </div>
              <div className="p-4">
                <h2 className="font-serif text-xl font-bold text-[#1b3e56]">{photo.title}</h2>
                <p className="mt-2 text-sm leading-6 text-[#5b6d7a]">{photo.description}</p>
              </div>
            </article>
          ))}
        </div>
        {!photos.length && (
          <p className="mt-12 rounded-2xl bg-white p-12 text-center">
            No photographs have been published yet.
          </p>
        )}
      </div>
    </main>
  );
}

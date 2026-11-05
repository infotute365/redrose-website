import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, LockKeyhole, MapPin, School } from "lucide-react";

const schoolAddress = "Rongpur Part III, Rongpur, Silchar, Assam 788009";
const links = [
  ["Home", "/"],
  ["About Us", "/pages/about-us"],
  ["Facilities", "/pages/facilities"],
  ["Gallery", "/gallery"],
  ["Circulars", "/circulars"],
  ["Mandatory Disclosure", "/pages/mandatory-disclosure"],
  ["Fee Structure", "/pages/fee-structure"],
  ["TC Format", "/pages/tc-format"],
  ["Contact us", "/pages/contact-us"],
];
export function Footer() {
  return (
    <footer className="rr-footer mt-auto text-white">
      <div className="mx-auto max-w-7xl px-5 pb-6 pt-16 sm:px-8">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1.1fr] lg:gap-20">
          <div>
            <Link href="/" className="inline-flex items-center gap-4">
              <span className="rounded-2xl bg-white p-2">
                <Image
                  src="/images/RedRoseLogoBBG.png"
                  alt="Red Rose Academy"
                  width={80}
                  height={72}
                  className="h-14 w-auto object-contain"
                />
              </span>
              <div>
                <p className="font-serif text-2xl">Red Rose Academy</p>
                <p className="text-xs uppercase tracking-[.22em] text-[#b7dadf]">Silchar, Assam</p>
              </div>
            </Link>
            <p className="mt-6 max-w-xs text-sm leading-7 text-white/75">
              A place to learn, grow, and discover the best in every student. Explore the moments,
              achievements, and events that bring our school community together.
            </p>
            <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs tracking-wider text-[#d1f2ed]">
              <School size={14} /> School Code 35669 · Affiliation 230354
            </div>
          </div>
          <div>
            <h2 className="mb-5 text-sm font-bold uppercase tracking-[.16em] text-[#e0c58e]">
              Explore the school
            </h2>
            <nav className="grid gap-3" aria-label="Footer navigation">
              {links.map(([label, href]) => (
                <Link
                  key={href}
                  href={href}
                  className="w-fit text-sm text-white/80 hover:text-white"
                >
                  {label}
                </Link>
              ))}
            </nav>
          </div>
          <div>
            <h2 className="mb-5 text-sm font-bold uppercase tracking-[.16em] text-[#e0c58e]">
              Visit our campus
            </h2>
            <address className="flex items-start gap-3 text-sm not-italic leading-7 text-white/80">
              <MapPin size={18} className="mt-1 shrink-0 text-[#90d5d6]" />
              {schoolAddress}
            </address>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(schoolAddress)}`}
              target="_blank"
              rel="noreferrer"
              className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/30 px-5 py-2.5 text-sm font-semibold transition hover:bg-white/15"
            >
              Find directions <ArrowUpRight size={16} />
            </a>
            <div className="mt-6 rounded-2xl border border-white/15 bg-white/5 p-4">
              <p className="text-sm font-semibold">Managing Director’s message</p>
              <Link
                href="/pages/message-from-md"
                className="mt-2 inline-flex items-center gap-1 text-xs text-[#bbebeb]"
              >
                Read message <ArrowUpRight size={13} />
              </Link>
            </div>
          </div>
        </div>
        <div className="mt-12 flex flex-col gap-3 border-t border-white/15 pt-6 text-xs text-white/65 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Red Rose Academy. All rights reserved.</p>
          <div className="flex flex-wrap items-center gap-5">
            <Link
              href="/admin/login"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/30 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#90d5d6] focus-visible:ring-offset-2 focus-visible:ring-offset-[#183b63]"
            >
              <LockKeyhole size={16} aria-hidden="true" /> Admin Login
            </Link>
            <Link href="/" className="inline-flex items-center gap-1 hover:text-white">
              Back to home <ArrowUpRight size={13} />
            </Link>
          </div>
        </div>
        <p className="rr-footer-credit" data-cms-ignore>
          Design by Apex@aspire Digicom solution
        </p>
      </div>
    </footer>
  );
}

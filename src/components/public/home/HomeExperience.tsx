"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Bell,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  FileText,
  GraduationCap,
  School,
  Images,
  Phone,
  CalendarDays,
  ShieldCheck,
  Star,
  ExternalLink,
} from "lucide-react";
import type { HomeSlide } from "@/src/lib/dynamic-sections";
import type { Circular } from "@/src/lib/circulars";

const quickLinks = [
  { title: "About Us", href: "/pages/about-us", icon: GraduationCap },
  { title: "Academics", href: "/pages/aims-of-objectives", icon: BookOpen },
  { title: "Facilities", href: "/pages/facilities", icon: School },
  { title: "Activities", href: "/#school-events", icon: Star },
  { title: "Gallery", href: "/gallery", icon: Images },
  { title: "Contact Us", href: "/pages/contact-us", icon: Phone },
];

export function HomeExperience({
  circulars,
  slides,
}: {
  circulars: Circular[];
  slides: HomeSlide[];
}) {
  const [active, setActive] = useState(0);
  const [noticeTab, setNoticeTab] = useState<"notices" | "circulars">("notices");
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("cms-editor") === "1") return;
    if (slides.length < 2) return;
    const timer = window.setInterval(() => setActive((index) => (index + 1) % slides.length), 7500);
    return () => window.clearInterval(timer);
  }, [slides.length]);
  const slide = slides[active] || slides[0];
  // Display the original school photos until an admin publishes a replacement through Photos & Events.
  if (!slide) return null;
  const featured = circulars.slice(0, noticeTab === "notices" ? 3 : 4);
  return (
    <>
      <div className="rr-home-opening">
        <section
          className="rr-hero relative isolate overflow-hidden"
          aria-label="Red Rose Academy homepage"
        >
          <div className="rr-hero-photo absolute inset-0" key={slide.id}>
            <Image
              src={slide.src}
              alt={slide.alt || "Red Rose Academy school photograph"}
              fill
              preload={active === 0}
              sizes="100vw"
              className="object-cover object-center"
              style={{ objectPosition: slide.backgroundPosition || undefined }}
              data-cms-managed="homepage-background"
            />
          </div>
          <div className="rr-hero-shade absolute inset-0" />
          <div className="rr-hero-layout relative mx-auto max-w-[1450px] px-5 sm:px-8">
            <div className="rr-hero-copy text-white">
              <div className="rr-hero-pill inline-flex items-center gap-2.5 rounded-full px-4 py-2 text-[11px] font-bold tracking-[.025em] text-white/95">
                <GraduationCap size={15} /> Learning • Growth • Community
              </div>
              <h1 className="rr-hero-title font-serif font-bold text-white">
                Red Rose <span className="rr-gold-text">Academy</span>
              </h1>
              <p className="rr-hero-location font-serif font-semibold text-white">Silchar</p>
              <div className="rr-hero-rule" />
              <p className="rr-hero-tagline font-serif text-white">{slide.title}</p>
              <p className="rr-hero-description text-white">{slide.description}</p>
              <div className="rr-hero-actions flex flex-wrap items-center gap-3">
                <Link
                  href="/pages/about-us"
                  className="rr-primary-cta inline-flex items-center justify-center gap-3 rounded-full text-sm font-bold"
                >
                  Explore Our School <ArrowRight size={17} />
                </Link>
                <Link
                  href="/gallery"
                  className="rr-secondary-cta inline-flex items-center justify-center gap-3 rounded-full text-sm font-semibold text-white"
                >
                  View School Gallery <Images size={17} />
                </Link>
              </div>
              {slides.length > 1 && (
                <div
                  className="rr-hero-controls flex items-center gap-3"
                  aria-label="Hero slideshow controls"
                >
                  <button
                    type="button"
                    onClick={() => setActive((active + slides.length - 1) % slides.length)}
                    aria-label="Previous school photo"
                    className="rr-hero-arrow"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <div className="flex items-center gap-2">
                    {slides.map((item, i) => (
                      <button
                        key={item.id}
                        aria-label={`Show photo ${i + 1}`}
                        aria-current={i === active ? "true" : undefined}
                        className={`rr-hero-dot h-1.5 rounded-full transition-all ${i === active ? "w-9" : "w-3"}`}
                        onClick={() => setActive(i)}
                      />
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setActive((active + 1) % slides.length)}
                    aria-label="Next school photo"
                    className="rr-hero-arrow"
                  >
                    <ChevronRight size={18} />
                  </button>
                  <span className="ml-2 text-xs font-semibold tracking-wider text-white/80">
                    {String(active + 1).padStart(2, "0")} / {String(slides.length).padStart(2, "0")}
                  </span>
                </div>
              )}
            </div>
          </div>
        </section>
        <aside
          className="rr-glass rr-notice-box rounded-[24px] p-4 sm:p-5"
          aria-label="School notices and circulars"
        >
          <div className="mb-4 grid grid-cols-2 gap-2" role="tablist" aria-label="School updates">
            <button
              role="tab"
              aria-selected={noticeTab === "notices"}
              onClick={() => setNoticeTab("notices")}
              className={`rr-notice-tab inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-3 py-2 text-sm font-bold ${noticeTab === "notices" ? "rr-notice-tab-active" : ""}`}
            >
              <Bell size={17} /> Notice Board
            </button>
            <button
              role="tab"
              aria-selected={noticeTab === "circulars"}
              onClick={() => setNoticeTab("circulars")}
              className={`rr-notice-tab inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-3 py-2 text-sm font-bold ${noticeTab === "circulars" ? "rr-notice-tab-active" : ""}`}
            >
              <FileText size={17} /> Circulars
            </button>
          </div>
          <div className="rr-notice-panel space-y-2.5" role="tabpanel">
            {featured.length ? (
              featured.map((item) => (
                <article
                  key={item.id}
                  className="rr-notice-item group flex items-start gap-3 rounded-[18px] border border-white/80 bg-white/78 px-3 py-3 shadow-[0_4px_18px_rgba(17,59,97,.04)]"
                >
                  <span className="rr-clay-icon mt-0.5 grid size-10 shrink-0 place-items-center rounded-2xl text-[#197a86]">
                    <FileText size={18} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 className="line-clamp-2 text-[13px] font-bold leading-5 text-[#1b304d]">
                      {item.title}
                    </h2>
                    <p className="mt-1 line-clamp-2 text-xs leading-[1.4] text-[#536678]">
                      {item.description}
                    </p>
                    <p className="mt-1.5 flex items-center gap-1 text-[11px] font-semibold text-[#a06a2d]">
                      <CalendarDays size={12} />
                      {item.noticeDate}
                    </p>
                  </div>
                  {item.pdfUrl && (
                    <a
                      href={item.pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Open PDF for ${item.title}`}
                      className="mt-2 rounded-full p-1.5 text-[#167d8a] hover:bg-[#e5f4f3]"
                    >
                      <ExternalLink size={15} />
                    </a>
                  )}
                </article>
              ))
            ) : (
              <div className="rr-notice-empty rounded-[16px] px-5 py-6 text-center">
                <Bell className="mx-auto mb-3" size={25} />
                <p className="text-sm font-semibold">No notices published yet</p>
                <p className="mt-2 text-xs leading-5">
                  Official circulars will appear here when the school publishes them.
                </p>
              </div>
            )}
          </div>
          <Link
            href="/circulars"
            className="rr-view-notices mt-4 flex items-center justify-center gap-2 rounded-full px-5 py-3.5 text-sm font-bold"
          >
            View All Notices & Circulars <ArrowRight size={16} />
          </Link>
        </aside>
      </div>
      <div className="rr-quicklinks-wrap relative z-20 mx-auto max-w-[1380px] px-4 sm:px-8">
        <nav
          aria-label="Quick access links"
          className="rr-quickbar grid grid-cols-2 gap-1 rounded-[34px] p-2.5 shadow-[0_25px_70px_rgba(14,46,69,.19)] sm:grid-cols-3 lg:grid-cols-6"
        >
          {quickLinks.map(({ title, href, icon: Icon }) => (
            <Link
              href={href}
              key={href}
              className="rr-quick-link group flex min-h-[100px] items-center justify-center gap-3 rounded-[25px] px-3 py-4 transition sm:px-2"
            >
              <span className="rr-clay-icon grid size-[51px] shrink-0 place-items-center rounded-[18px] text-[#0d6c82]">
                <Icon size={23} />
              </span>
              <span className="text-[13px] font-bold text-[#21334d] sm:text-sm">{title}</span>
            </Link>
          ))}
        </nav>
      </div>
      <section
        className="rr-intro relative overflow-hidden px-5 pb-24 pt-24 sm:px-8 lg:pb-28 lg:pt-28"
        aria-labelledby="rr-welcome-heading"
      >
        <div className="pointer-events-none absolute -left-24 top-20 size-80 rounded-full bg-[#def3ea]/70 blur-3xl" />
        <div className="pointer-events-none absolute -right-20 bottom-5 size-96 rounded-full bg-[#f7ecd6]/70 blur-3xl" />
        <div className="relative mx-auto grid max-w-[1320px] items-center gap-12 lg:grid-cols-[1fr_1fr] lg:gap-20">
          <div className="rr-about-photo relative order-2 lg:order-1">
            <div className="overflow-hidden rounded-[35px] border-[8px] border-white bg-white shadow-[0_27px_75px_rgba(26,64,78,.13)]">
              <Image
                src="/images/home1.jpeg"
                alt="Original photograph of Red Rose Academy school building"
                width={980}
                height={720}
                className="h-[310px] w-full object-cover sm:h-[440px]"
              />
            </div>
            <div className="rr-glass absolute bottom-6 left-6 inline-flex items-center gap-3 rounded-2xl px-4 py-3 text-xs font-semibold text-[#17415d]">
              <School size={17} className="text-[#18838b]" /> Red Rose Academy, Silchar
            </div>
          </div>
          <div className="order-1 lg:order-2">
            <p className="rr-eyebrow inline-flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[#cda65f]" /> About the School
            </p>
            <h2
              id="rr-welcome-heading"
              className="mt-5 max-w-xl font-serif text-[clamp(2.6rem,4.1vw,4.75rem)] font-bold leading-[1.08] tracking-[-.035em] text-[#163754]"
            >
              A Place to <span className="text-[#aa722d]">Learn and Grow</span>
            </h2>
            <p className="mt-7 max-w-xl text-base leading-8 text-[#576c7b]">{slide.description}</p>
            <div className="mt-9 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { title: "School life", icon: School, href: "/pages/about-us" },
                { title: "Facilities", icon: GraduationCap, href: "/pages/facilities" },
                { title: "Achievements", icon: Star, href: "/#school-events" },
                { title: "Documents", icon: ShieldCheck, href: "/pages/mandatory-disclosure" },
              ].map(({ title, icon: Icon, href }) => (
                <Link
                  key={title}
                  href={href}
                  className="rr-about-tile flex flex-col items-center gap-3 rounded-[20px] p-4 text-center"
                >
                  <Icon size={25} className="text-[#b78b3c]" />
                  <span className="text-xs font-bold text-[#24364b]">{title}</span>
                </Link>
              ))}
            </div>
            <Link
              href="/pages/about-us"
              className="rr-about-button mt-9 inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-bold"
            >
              Know More About Us <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

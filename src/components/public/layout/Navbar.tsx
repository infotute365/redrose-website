"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowUpRight,
  ChevronDown,
  GraduationCap,
  Menu,
  X,
  MapPin,
  ShieldCheck,
} from "lucide-react";

const menus = [
  {
    label: "About Us",
    links: [
      { label: "About the academy", href: "/pages/about-us" },
      { label: "Principal's message", href: "/pages/message-from-principal" },
      { label: "Managing Director's message", href: "/pages/message-from-md" },
      { label: "Vice Principal's message", href: "/pages/message-from-vice_principal" },
    ],
  },
  {
    label: "Academics",
    links: [
      { label: "Aims & Objectives", href: "/pages/aims-of-objectives" },
      { label: "Mandatory Disclosure", href: "/pages/mandatory-disclosure" },
      { label: "Fee Structure", href: "/pages/fee-structure" },
      { label: "TC Format", href: "/pages/tc-format" },
    ],
  },
];

export function Navbar() {
  const [open, setOpen] = useState(false);
  const header = useRef<HTMLElement>(null);
  useEffect(() => {
    const element = header.current;
    if (!element) return;
    const measure = () =>
      document.documentElement.style.setProperty(
        "--rr-header-height",
        `${element.getBoundingClientRect().height}px`,
      );
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    measure();
    return () => {
      observer.disconnect();
      document.documentElement.style.removeProperty("--rr-header-height");
    };
  }, []);
  return (
    <header ref={header} className="rr-header relative z-40">
      <div className="rr-topbar">
        <div className="mx-auto flex max-w-[1450px] flex-wrap items-center justify-between gap-x-6 gap-y-1 px-5 py-2.5 text-[11px] font-medium tracking-wide sm:px-8 sm:text-xs">
          <span className="inline-flex items-center gap-2">
            <MapPin size={14} aria-hidden="true" /> Rongpur, Silchar, Assam
          </span>
          <span className="flex items-center gap-4 text-white/85">
            <span>
              School Code <strong className="text-white">35669</strong>
            </span>
            <span className="h-3 w-px bg-white/30" />
            <span>
              CBSE Affiliation <strong className="text-white">230354</strong>
            </span>
          </span>
        </div>
      </div>
      <div className="rr-nav-outer px-3 sm:px-6">
        <div className="rr-nav-frame mx-auto max-w-[1450px] rounded-[28px] px-4 sm:px-7 lg:px-8">
          <div className="rr-nav-content flex min-h-[76px] items-center justify-between gap-4">
            <Link
              href="/"
              className="group inline-flex min-w-0 items-center gap-2 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0c7583] sm:gap-3"
              aria-label="Red Rose Academy home"
            >
              <Image
                src="/images/RedRoseLogoBBG.png"
                alt="Original Red Rose Academy crest"
                width={126}
                height={108}
                className="h-[54px] w-auto max-w-[100px] object-contain transition-transform duration-300 group-hover:scale-[1.035] sm:h-[64px]"
                preload
              />
              <span className="min-w-0 border-l border-[#174b5a]/15 pl-3">
                <strong className="rr-school-name block font-serif text-[19px] font-bold leading-[1.07] tracking-[-.035em] text-[#132b4e] sm:text-[25px]">
                  Red Rose Academy
                </strong>
                <small className="rr-school-location mt-1 block text-[9px] font-bold uppercase tracking-[.25em] text-[#ad782f] sm:text-[11px]">
                  Silchar · Assam
                </small>
              </span>
            </Link>
            <nav className="hidden items-center gap-0.5 xl:flex" aria-label="Main navigation">
              <Link href="/" className="rr-nav-link rr-nav-active">
                Home
              </Link>
              {menus.map((menu) => (
                <div className="group relative" key={menu.label}>
                  <button
                    type="button"
                    className="rr-nav-link inline-flex items-center gap-1"
                    aria-haspopup="true"
                  >
                    {menu.label}
                    <ChevronDown size={13} />
                  </button>
                  <div className="rr-dropdown pointer-events-none invisible absolute left-0 top-full z-50 min-w-[265px] translate-y-1 rounded-2xl border border-white/90 bg-white/95 p-2 opacity-0 shadow-xl backdrop-blur-2xl transition duration-200 group-hover:pointer-events-auto group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:visible group-focus-within:opacity-100">
                    {menu.links.map((link) => (
                      <Link
                        className="block rounded-xl px-4 py-3 text-sm text-[#243c51] hover:bg-[#e6f5f3] hover:text-[#0b747e]"
                        href={link.href}
                        key={link.href}
                      >
                        {link.label}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
              <Link href="/pages/facilities" className="rr-nav-link">
                Facilities
              </Link>
              <Link href="/#school-events" className="rr-nav-link">
                Activities
              </Link>
              <Link href="/gallery" className="rr-nav-link">
                Gallery
              </Link>
              <Link href="/circulars" className="rr-nav-link">
                Circulars
              </Link>
              <Link href="/pages/contact-us" className="rr-nav-link">
                Contact
              </Link>
            </nav>
            <div className="hidden items-center gap-2 lg:flex">
              <Link
                href="https://redroseacademy.infotute.com/login"
                target="_blank"
                rel="noreferrer"
                className="rr-erp-link"
              >
                <GraduationCap size={17} /> ERP Login <ArrowUpRight size={14} />
              </Link>
            </div>
            <button
              type="button"
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              aria-controls="rr-mobile-menu"
              onClick={() => setOpen(!open)}
              className="rounded-2xl border border-[#c8dce4] bg-white/90 p-3 text-[#154767] shadow-sm xl:hidden"
            >
              {open ? <X size={23} /> : <Menu size={23} />}
            </button>
          </div>
        </div>
      </div>
      {open && (
        <nav
          id="rr-mobile-menu"
          className="rr-mobile-nav absolute left-3 right-3 top-full z-50 max-h-[75vh] overflow-y-auto rounded-3xl border border-white/75 bg-white/98 px-4 pb-5 pt-3 shadow-2xl backdrop-blur-2xl xl:hidden"
          aria-label="Mobile navigation"
        >
          <Link
            href="/"
            onClick={() => setOpen(false)}
            className="block rounded-xl px-3 py-2.5 font-semibold"
          >
            Home
          </Link>
          {menus.map((menu) => (
            <div key={menu.label} className="my-2 border-t border-[#e6edf3] pt-2">
              <p className="px-3 py-2 text-xs font-bold uppercase tracking-[.14em] text-[#147986]">
                {menu.label}
              </p>
              {menu.links.map((link) => (
                <Link
                  key={link.href}
                  onClick={() => setOpen(false)}
                  href={link.href}
                  className="block rounded-xl px-3 py-2 text-sm text-[#294a63] hover:bg-[#eff7f8]"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          ))}
          {[
            { label: "Facilities", href: "/pages/facilities" },
            { label: "Activities", href: "/#school-events" },
            { label: "Gallery", href: "/gallery" },
            { label: "Circulars", href: "/circulars" },
            { label: "Contact", href: "/pages/contact-us" },
          ].map((link) => (
            <Link
              key={link.href}
              onClick={() => setOpen(false)}
              href={link.href}
              className="block rounded-xl px-3 py-2.5 text-sm text-[#294a63] hover:bg-[#eff7f8]"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="https://redroseacademy.infotute.com/login"
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#173e6a] px-5 py-3 text-sm font-bold text-white"
          >
            <ShieldCheck size={16} /> ERP Login
          </Link>
        </nav>
      )}
    </header>
  );
}

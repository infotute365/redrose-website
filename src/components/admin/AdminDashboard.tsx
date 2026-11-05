"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Bell,
  ChevronRight,
  FileText,
  ImagePlus,
  Images,
  PanelTop,
  PenLine,
  Sparkles,
} from "lucide-react";
import type { SchoolDocument } from "@/src/lib/documents";
import type { Circular } from "@/src/lib/circulars";
import type { EditableEvent, HomeSlide } from "@/src/lib/dynamic-sections";
import type { HomepageBackground } from "@/src/lib/background-types";
import { AdminShell, PageHeading } from "./AdminShell";

export function AdminDashboard({
  initialDocuments,
  initialCirculars,
  initialSlides,
  initialEvents,
  background,
}: {
  initialDocuments: SchoolDocument[];
  initialCirculars: Circular[];
  initialSlides: HomeSlide[];
  initialEvents: EditableEvent[];
  background: HomepageBackground | null;
}) {
  const publishedSlides = initialSlides.filter((item) => item.isPublished !== false).length;
  const publishedEvents = initialEvents.filter((item) => item.isPublished !== false).length;
  const stats = [
    {
      title: "Homepage slides",
      count: initialSlides.length,
      note: `${publishedSlides} published`,
      icon: PanelTop,
      href: "/admin/sections?tab=slides",
    },
    {
      title: "Circulars & notices",
      count: initialCirculars.length,
      note: "On your school website",
      icon: Bell,
      href: "/admin/circulars",
    },
    {
      title: "Documents & PDFs",
      count: initialDocuments.length,
      note: "Available to families",
      icon: FileText,
      href: "/admin/documents",
    },
    {
      title: "Photos & events",
      count: initialEvents.length,
      note: `${publishedEvents} published`,
      icon: Images,
      href: "/admin/sections?tab=events",
    },
  ];
  const shortcuts = [
    {
      title: "Edit Website Content",
      description: "Update page text and school photographs",
      icon: PenLine,
      href: "/admin/editor",
    },
    {
      title: "Manage Circulars",
      description: "Keep families informed with school notices",
      icon: Bell,
      href: "/admin/circulars",
    },
    {
      title: "Manage Documents",
      description: "Publish and replace PDFs and official files",
      icon: FileText,
      href: "/admin/documents",
    },
    {
      title: "Manage Photos & Events",
      description: "Share the moments that make your school",
      icon: Images,
      href: "/admin/sections?tab=events",
    },
  ];
  return (
    <AdminShell section="overview">
      <PageHeading
        eyebrow="A little care. A lasting impression."
        title="Welcome to your workspace"
        description="Everything you need to keep the Red Rose Academy website fresh, clear and up to date."
      >
        <Link href="/admin/background" className="admin-btn admin-btn-teal">
          <ImagePlus size={16} /> Change Homepage Background
        </Link>
      </PageHeading>
      <div className="admin-stats">
        {stats.map(({ title, count, note, icon: Icon, href }) => (
          <Link className="admin-card admin-stat" href={href} key={title}>
            <span className="admin-stat-icon">
              <Icon size={18} />
            </span>
            <ArrowUpRight size={15} className="admin-stat-arrow" />
            <strong>{String(count).padStart(2, "0")}</strong>
            <p>{title}</p>
            <small>{note}</small>
          </Link>
        ))}
      </div>
      <div className="admin-overview-main">
        <section className="admin-card admin-hero-card">
          <div className="admin-card-head">
            <div>
              <h2>Your school’s first impression</h2>
              <p>The first photograph visitors see on your homepage</p>
            </div>
            <span className="admin-badge admin-badge-gold">Homepage</span>
          </div>
          {background ? (
            <>
              <div className="admin-hero-card-image">
                <Image
                  loading="eager"
                  src={background.src}
                  alt="Current homepage background"
                  fill
                  sizes="(max-width: 767px) 90vw, 45vw"
                  style={{ objectPosition: background.position || "center" }}
                />
                <span className="admin-image-badge">
                  <span className="admin-live-dot" /> CURRENT HOMEPAGE BACKGROUND
                </span>
              </div>
              <div className="admin-hero-card-bottom">
                <div>
                  <h2>A new photo, in a few clicks.</h2>
                  <p>Preview, replace or restore your background.</p>
                </div>
                <Link href="/admin/background" className="admin-btn admin-btn-teal">
                  Change background <ArrowRight size={15} />
                </Link>
              </div>
            </>
          ) : (
            <div className="admin-empty">
              <ImagePlus size={30} />
              <h3>Your homepage photo belongs here</h3>
              <p>Add a published slide to get started.</p>
              <Link href="/admin/sections?tab=slides" className="admin-btn">
                Add a homepage slide
              </Link>
            </div>
          )}
        </section>
        <section className="admin-card admin-shortcuts">
          <div className="admin-card-head">
            <div>
              <h2>What would you like to update?</h2>
              <p>A shortcut to the things you use most</p>
            </div>
            <Sparkles size={17} color="#b99b62" />
          </div>
          {shortcuts.map(({ title, description, icon: Icon, href }) => (
            <Link className="admin-shortcut" href={href} key={href}>
              <span>
                <Icon size={18} />
              </span>
              <span>
                <strong>{title}</strong>
                <small>{description}</small>
              </span>
              <ChevronRight size={16} />
            </Link>
          ))}
        </section>
      </div>
      <div className="admin-overview-bottom">
        <section className="admin-card">
          <div className="admin-card-head">
            <div>
              <h2>Published documents</h2>
              <p>School information families can access</p>
            </div>
            <Link className="admin-text-link" href="/admin/documents">
              Manage <ArrowRight size={13} />
            </Link>
          </div>
          {initialDocuments.length ? (
            initialDocuments.slice(0, 3).map((document) => (
              <a
                href={document.url}
                className="admin-file-row"
                target="_blank"
                rel="noreferrer"
                key={document.id}
              >
                <span className="admin-file-icon">
                  <FileText size={20} />
                </span>
                <div className="admin-file-info">
                  <h3>{document.title}</h3>
                  <p>{document.fileName}</p>
                </div>
                <span className="admin-badge">Published</span>
                <ArrowUpRight size={15} color="#9aabba" />
              </a>
            ))
          ) : (
            <div className="admin-empty">
              <FileText size={25} />
              <h3>No documents published yet</h3>
              <p>Upload a PDF when you’re ready to share it.</p>
            </div>
          )}
        </section>
        <section className="admin-card admin-tips">
          <p className="admin-eyebrow">Made for school staff</p>
          <h2>Small updates. Simple steps.</h2>
          {[
            ["Choose what to update", "Use the menu or one of the shortcuts above."],
            ["Take a look before saving", "Preview your image or review your wording."],
            ["Save and share", "Your update will appear on the public website."],
          ].map(([title, text], index) => (
            <div className="admin-tip" key={title}>
              <span>{index + 1}</span>
              <div>
                <strong>{title}</strong>
                <p>{text}</p>
              </div>
            </div>
          ))}
        </section>
      </div>
    </AdminShell>
  );
}

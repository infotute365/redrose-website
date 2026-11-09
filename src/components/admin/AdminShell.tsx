"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowUpRight,
  Bell,
  ChevronRight,
  FileText,
  House,
  ImageIcon,
  Images,
  LayoutDashboard,
  LogOut,
  Menu,
  PanelTop,
  PenLine,
  ShieldCheck,
  X,
} from "lucide-react";

export type AdminSection =
  "overview" | "background" | "editor" | "slides" | "circulars" | "documents" | "events";
const navigation = [
  { key: "overview", title: "Dashboard Overview", href: "/admin/dashboard", icon: LayoutDashboard },
  { key: "background", title: "Homepage Background", href: "/admin/background", icon: ImageIcon },
  { key: "editor", title: "Website Content Editor", href: "/admin/editor", icon: PenLine },
  { key: "slides", title: "Homepage Slides", href: "/admin/sections?tab=slides", icon: PanelTop },
  { key: "circulars", title: "Circulars & Notices", href: "/admin/circulars", icon: Bell },
  { key: "documents", title: "Documents & PDFs", href: "/admin/documents", icon: FileText },
  {
    key: "events",
    title: "Photo Gallery / Events",
    href: "/admin/sections?tab=events",
    icon: Images,
  },
] as const;

export function AdminShell({ section, children }: { section: AdminSection; children: ReactNode }) {
  const drawer = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const current = navigation.find((item) => item.key === section)!;
  useEffect(() => {
    // Access tokens expire after 15 min; rotate HttpOnly refresh cookies periodically.
    const renew = () => {
      if (document.visibilityState === "visible") {
        void fetch("/api/admin/refresh", { method: "POST", cache: "no-store" });
      }
    };
    const interval = window.setInterval(renew, 10 * 60_000);
    document.addEventListener("visibilitychange", renew);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", renew);
    };
  }, []);
  function closeDrawer() {
    drawer.current?.close();
    setOpen(false);
  }
  async function logout() {
    setSigningOut(true);
    setError("");
    try {
      const response = await fetch("/api/admin/logout", { method: "POST" });
      if (!response.ok) throw new Error("We could not sign you out. Please try again.");
      router.replace("/admin/login");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Sign out failed. Please try again.");
      setSigningOut(false);
    }
  }
  const sidebar = (
    <>
      <Link className="admin-brand" href="/admin/dashboard" onClick={closeDrawer}>
        <span className="admin-brand-logo">
          <Image
            src="/images/RedRoseLogoBBG.png"
            alt="Red Rose Academy crest"
            width={43}
            height={45}
          />
        </span>
        <span>
          <strong>Red Rose Academy</strong>
          <small>WEBSITE WORKSPACE</small>
        </span>
      </Link>
      <div className="admin-sidebar-label">Your workspace</div>
      <nav aria-label="Admin navigation" className="admin-nav">
        {navigation.map(({ key, title, href, icon: Icon }, index) => (
          <Link
            key={key}
            href={href}
            onClick={closeDrawer}
            aria-current={section === key ? "page" : undefined}
            className={index === 3 ? "admin-nav-divider" : undefined}
          >
            <Icon size={18} aria-hidden="true" />
            <span>{title}</span>
            {section === key && <ChevronRight size={14} className="admin-nav-chevron" />}
          </Link>
        ))}
      </nav>
      <div className="admin-sidebar-bottom">
        <Link href="/" target="_blank" rel="noreferrer" className="admin-sidebar-public">
          <House size={17} /> View public website <ArrowUpRight size={14} />
        </Link>
        <div className="admin-account">
          <span className="admin-avatar">A</span>
          <div>
            <strong>Administrator</strong>
            <small>School website manager</small>
          </div>
          <ShieldCheck size={17} />
        </div>
        <button
          className="admin-logout"
          onClick={logout}
          disabled={signingOut}
          aria-label="Sign out"
        >
          <LogOut size={17} />
          {signingOut ? "Signing out…" : "Logout"}
        </button>
      </div>
    </>
  );
  return (
    <div className="rr-admin">
      <a className="admin-skip" href="#admin-main">
        Skip to main content
      </a>
      <aside className="admin-sidebar">{sidebar}</aside>
      <dialog
        ref={drawer}
        className="admin-drawer"
        aria-label="Admin menu"
        onClose={() => setOpen(false)}
        onClick={(event) => {
          if (event.target === event.currentTarget) closeDrawer();
        }}
      >
        <div className="admin-drawer-content">
          <button
            className="admin-drawer-close admin-icon-btn"
            onClick={closeDrawer}
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
          {sidebar}
        </div>
      </dialog>
      <div className="admin-body">
        <header className="admin-topbar">
          <div className="admin-breadcrumb">
            <button
              type="button"
              className="admin-mobile-menu admin-icon-btn"
              aria-label="Open admin menu"
              aria-expanded={open}
              onClick={() => {
                drawer.current?.showModal();
                setOpen(true);
              }}
            >
              <Menu size={22} />
            </button>
            <span className="admin-breadcrumb-root">Workspace</span>
            <ChevronRight size={14} />
            <strong>{current.title}</strong>
          </div>
          <div className="admin-topbar-actions">
            <Link
              href="/"
              target="_blank"
              rel="noreferrer"
              className="admin-btn admin-btn-secondary admin-view-public"
            >
              View Public Website <ArrowUpRight size={15} />
            </Link>
            <span className="admin-topbar-avatar" title="Administrator">
              A
            </span>
          </div>
        </header>
        <main id="admin-main" className="admin-main">
          {error && <StatusMessage tone="error">{error}</StatusMessage>}
          {children}
        </main>
        <footer className="admin-workspace-footer">
          <span>Red Rose Academy · School administration</span>
          <span>
            <ShieldCheck size={13} /> Secure workspace
          </span>
        </footer>
      </div>
    </div>
  );
}

export function PageHeading({
  eyebrow = "Website management",
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="admin-page-heading">
      <div>
        <p className="admin-eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="admin-description">{description}</p>
      </div>
      {children && <div className="admin-heading-actions">{children}</div>}
    </div>
  );
}
export function StatusMessage({
  tone = "success",
  children,
}: {
  tone?: "success" | "error" | "info";
  children: ReactNode;
}) {
  return (
    <p className="admin-status" data-tone={tone} role={tone === "error" ? "alert" : "status"}>
      {children}
    </p>
  );
}

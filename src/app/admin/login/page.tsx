"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LockKeyhole, ArrowLeft } from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: form.get("username"), password: form.get("password") }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to sign in.");
      router.replace("/admin/dashboard");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to sign in.");
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-screen flex-1 place-items-center bg-[#f5f8fc] px-5 py-12">
      <div className="w-full max-w-md rounded-3xl border border-sky-100 bg-white p-7 shadow-[0_20px_80px_-35px_rgba(18,70,102,0.18)] sm:p-9">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-stone-500 hover:text-sky-800"
        >
          <ArrowLeft className="size-4" />
          Back to website
        </Link>
        <div className="mt-9 grid size-12 place-items-center rounded-2xl bg-sky-100 text-sky-800">
          <LockKeyhole className="size-5" />
        </div>
        <p className="mt-6 text-xs font-semibold uppercase tracking-[0.2em] text-sky-800">
          Red Rose Academy
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-stone-900">Admin sign in</h1>
        <p className="mt-2 text-sm leading-6 text-stone-500">
          Sign in to manage website content, photos, events, circulars and school documents.
        </p>
        <form onSubmit={onSubmit} className="mt-8 space-y-5">
          <label className="block text-sm font-medium text-stone-700">
            Username
            <input
              autoComplete="username"
              required
              name="username"
              className="mt-2 h-12 w-full rounded-xl border border-stone-200 bg-white px-4 outline-none focus:border-cyan-700 focus:ring-4 focus:ring-sky-100"
            />
          </label>
          <label className="block text-sm font-medium text-stone-700">
            Password
            <input
              autoComplete="current-password"
              required
              type="password"
              name="password"
              className="mt-2 h-12 w-full rounded-xl border border-stone-200 bg-white px-4 outline-none focus:border-cyan-700 focus:ring-4 focus:ring-sky-100"
            />
          </label>
          {error && (
            <p role="alert" className="rounded-xl bg-sky-50 px-4 py-3 text-sm text-sky-800">
              {error}
            </p>
          )}
          <button
            disabled={busy}
            className="h-12 w-full rounded-xl bg-sky-800 px-4 text-sm font-semibold text-white transition hover:bg-sky-900 disabled:cursor-wait disabled:opacity-60"
          >
            {busy ? "Signing in…" : "Sign in to dashboard"}
          </button>
        </form>
      </div>
    </main>
  );
}

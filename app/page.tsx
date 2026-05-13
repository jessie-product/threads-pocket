"use client";

import { useEffect, useMemo, useState } from "react";

type ThreadPost = {
  id: string;
  url: string;
  summary: string | null;
  category: string | null;
  createdAt: string;
};

export default function Home() {
  const [url, setUrl] = useState("");
  const [posts, setPosts] = useState<ThreadPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 直接暴力回傳 true，不管網址長度，不管是不是在儲存
const canSubmit = true;

  async function load() {
    setError(null);
    setIsLoading(true);
    try {
      const res = await fetch("/api/threads", { cache: "no-store" });
      const json = (await res.json()) as { posts?: ThreadPost[]; error?: string };
      if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`);
      setPosts(Array.isArray(json.posts) ? json.posts : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setIsLoading(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = url.trim();
    if (!value || isSaving) return;

    setIsSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/threads');
      const data = await res.json();
      setItems(data); // 這一行是讓畫面跳出來的關鍵！
    }
  }

  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const res = await fetch("/api/threads", { cache: "no-store" });
        const json = (await res.json()) as { posts?: ThreadPost[]; error?: string };
        if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`);
        if (!ignore) setPosts(Array.isArray(json.posts) ? json.posts : []);
      } catch (e) {
        if (!ignore) setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        if (!ignore) setIsLoading(false);
      }
    })();
    return () => {
      ignore = true;
    };
  }, []);

  return (
    <div className="min-h-full bg-zinc-50 text-zinc-950 dark:bg-black dark:text-zinc-50">
      <main className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6">
        <header className="mb-10">
          <div className="mb-2 text-xs font-medium tracking-wide text-zinc-500 dark:text-zinc-400">
            Threads Pocket
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Save a thread URL</h1>
          <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
            Paste a URL to store it. Your saved items will appear below.
          </p>
        </header>

        <section className="rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <form onSubmit={onSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <label className="sr-only" htmlFor="thread-url">
              Thread URL
            </label>
            <input
              id="thread-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://…"
              inputMode="url"
              className="h-12 w-full rounded-xl border border-zinc-200 bg-transparent px-4 text-sm outline-none ring-0 placeholder:text-zinc-400 focus:border-zinc-400 dark:border-zinc-800 dark:placeholder:text-zinc-500 dark:focus:border-zinc-600"
            />
           <button
            type="submit"
            className="h-12 shrink-0 rounded-xl bg-zinc-900 px-5 text-sm font-medium text-white shadow-sm transition hover:bg-zinc-800"
            >
              {isSaving ? "Saving..." : "Save"}
            </button>
          </form>

          {error ? (
            <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-950/60 dark:bg-red-950/30 dark:text-red-200">
              {error}
            </div>
          ) : null}
        </section>

        <section className="mt-10">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
              Saved summaries
            </h2>
            <button
              type="button"
              onClick={() => void load()}
              className="text-xs font-medium text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
            >
              Refresh
            </button>
          </div>

          {isLoading ? (
            <div className="text-sm text-zinc-500 dark:text-zinc-400">Loading…</div>
          ) : posts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-200 bg-white px-6 py-10 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
              No items yet. Save your first URL above.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {posts.map((p) => (
                <article
                  key={p.id}
                  className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700"
                >
                  <div className="mb-3 flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                        category
                      </div>
                      <div className="mt-1 truncate text-sm font-semibold">
                        {p.category ?? "—"}
                      </div>
                    </div>
                    <a
                      href={p.url}
                      target="_blank"
                      rel="noreferrer"
                      className="shrink-0 rounded-full border border-zinc-200 px-3 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-900"
                    >
                      Open
                    </a>
                  </div>

                  <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">summary</div>
                  <div className="mt-1 text-sm leading-6 text-zinc-900 dark:text-zinc-50">
                    {p.summary ?? "—"}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

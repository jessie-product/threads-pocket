"use client";

import { useEffect, useState } from "react";

type Folder = {
  id: string;
  name: string;
  count: number;
  createdAt: string;
};

type ThreadPost = {
  id: string;
  url: string;
  title: string;
  summary: string | null;
  category: string | null;
  folder: {
    id: string;
    name: string;
  } | null;
  createdAt: string;
};

type FoldersResponse = {
  folders?: Folder[];
  noFolderCount?: number;
  totalCount?: number;
  error?: string;
};

type FolderCreateResponse = {
  folder?: Folder;
  error?: string;
};

type FolderUpdateResponse = FolderCreateResponse;

type FolderDeleteResponse = {
  deletedFolderId?: string;
  movedToNoFolder?: number;
  error?: string;
};

type ThreadsListResponse = {
  posts?: ThreadPost[];
  error?: string;
};

type ThreadCreateResponse = {
  post?: ThreadPost;
  error?: string;
};

type ThreadUpdateResponse = ThreadCreateResponse;

const ALL_FOLDERS = "all";
const NO_FOLDER = "__none";

export default function Home() {
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [folderId, setFolderId] = useState("");
  const [newFolderName, setNewFolderName] = useState("");
  const [activeFolderId, setActiveFolderId] = useState(ALL_FOLDERS);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [posts, setPosts] = useState<ThreadPost[]>([]);
  const [counts, setCounts] = useState({ noFolder: 0, total: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [folderActionId, setFolderActionId] = useState<string | null>(null);
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingFolderName, setEditingFolderName] = useState("");
  const [movingPostId, setMovingPostId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = title.trim().length > 0 && url.trim().length > 0 && !isSaving;
  const canCreateFolder = newFolderName.trim().length > 0 && !isCreatingFolder;
  const selectedFolder =
    activeFolderId === ALL_FOLDERS || activeFolderId === NO_FOLDER
      ? null
      : folders.find((folder) => folder.id === activeFolderId) ?? null;
  function threadsEndpoint(filter = activeFolderId) {
    if (filter === ALL_FOLDERS) return "/api/threads";
    return `/api/threads?folderId=${encodeURIComponent(filter)}`;
  }

  async function load(filter = activeFolderId) {
    setError(null);
    try {
      const [threadsRes, foldersRes] = await Promise.all([
        fetch(threadsEndpoint(filter), { cache: "no-store" }),
        fetch("/api/folders", { cache: "no-store" }),
      ]);
      const threadsJson = (await threadsRes.json()) as ThreadsListResponse;
      const foldersJson = (await foldersRes.json()) as FoldersResponse;

      if (!threadsRes.ok) {
        throw new Error(threadsJson.error || `Request failed (${threadsRes.status})`);
      }
      if (!foldersRes.ok) {
        throw new Error(foldersJson.error || `Request failed (${foldersRes.status})`);
      }

      setPosts(Array.isArray(threadsJson.posts) ? threadsJson.posts : []);
      setFolders(Array.isArray(foldersJson.folders) ? foldersJson.folders : []);
      setCounts({
        noFolder: typeof foldersJson.noFolderCount === "number" ? foldersJson.noFolderCount : 0,
        total: typeof foldersJson.totalCount === "number" ? foldersJson.totalCount : 0,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setIsLoading(false);
    }
  }

  async function onCreateFolder(e: React.FormEvent) {
    e.preventDefault();
    const name = newFolderName.trim();
    if (!name || isCreatingFolder) return;

    setIsCreatingFolder(true);
    setError(null);
    try {
      const res = await fetch("/api/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const json = (await res.json()) as FolderCreateResponse;
      if (!res.ok) {
        throw new Error(json.error || `Request failed (${res.status})`);
      }
      if (!json.folder) throw new Error("Failed to create folder");

      setFolders((current) => [...current, json.folder as Folder].sort((a, b) => a.name.localeCompare(b.name)));
      setFolderId(json.folder.id);
      setActiveFolderId(json.folder.id);
      setPosts([]);
      setNewFolderName("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create folder");
    } finally {
      setIsCreatingFolder(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const titleValue = title.trim();
    const urlValue = url.trim();
    if (!titleValue || !urlValue || isSaving) return;

    setIsSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/threads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderId: folderId || null, title: titleValue, url: urlValue }),
      });
      const json = (await res.json()) as ThreadCreateResponse;
      if (!res.ok) {
        throw new Error(json.error || `Request failed (${res.status})`);
      }
      if (!json.post) throw new Error("Failed to save");

      const savedPost = json.post;
      const shouldShow =
        activeFolderId === ALL_FOLDERS ||
        (activeFolderId === NO_FOLDER && !savedPost.folder) ||
        savedPost.folder?.id === activeFolderId;

      if (shouldShow) {
        setPosts((current) => [savedPost, ...current]);
      }
      setFolders((current) =>
        current.map((folder) =>
          folder.id === savedPost.folder?.id ? { ...folder, count: folder.count + 1 } : folder,
        ),
      );
      setCounts((current) => ({
        noFolder: savedPost.folder ? current.noFolder : current.noFolder + 1,
        total: current.total + 1,
      }));
      setTitle("");
      setUrl("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setIsSaving(false);
    }
  }

  function startRenameFolder(folder: Folder) {
    setEditingFolderId(folder.id);
    setEditingFolderName(folder.name);
    setError(null);
  }

  function cancelRenameFolder() {
    setEditingFolderId(null);
    setEditingFolderName("");
  }

  async function renameFolder(folder: Folder, nextNameRaw: string) {
    if (folderActionId) return;
    const nextName = nextNameRaw.trim();
    if (!nextName || nextName === folder.name) {
      cancelRenameFolder();
      return;
    }

    setFolderActionId(folder.id);
    setError(null);
    try {
      const res = await fetch(`/api/folders/${folder.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nextName }),
      });
      const json = (await res.json()) as FolderUpdateResponse;
      if (!res.ok) {
        throw new Error(json.error || `Request failed (${res.status})`);
      }
      if (!json.folder) throw new Error("Failed to rename folder");

      setFolders((current) =>
        current
          .map((item) => (item.id === folder.id ? { ...item, name: json.folder!.name } : item))
          .sort((a, b) => a.name.localeCompare(b.name)),
      );
      setPosts((current) =>
        current.map((post) =>
          post.folder?.id === folder.id ? { ...post, folder: { ...post.folder, name: json.folder!.name } } : post,
        ),
      );
      cancelRenameFolder();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to rename folder");
    } finally {
      setFolderActionId(null);
    }
  }

  async function deleteFolder(folder: Folder) {
    if (folderActionId) return;
    const confirmed = window.confirm(`確定要刪除「${folder.name}」嗎？資料會移到待分類。`);
    if (!confirmed) return;

    setFolderActionId(folder.id);
    setError(null);
    try {
      const res = await fetch(`/api/folders/${folder.id}`, {
        method: "DELETE",
      });
      const json = (await res.json()) as FolderDeleteResponse;
      if (!res.ok) {
        throw new Error(json.error || `Request failed (${res.status})`);
      }

      setFolders((current) => current.filter((item) => item.id !== folder.id));
      setCounts((current) => ({
        noFolder: current.noFolder + folder.count,
        total: current.total,
      }));
      setPosts((current) =>
        current.map((post) =>
          post.folder?.id === folder.id ? { ...post, folder: null, category: null } : post,
        ),
      );

      if (activeFolderId === folder.id) {
        setActiveFolderId(ALL_FOLDERS);
        void load(ALL_FOLDERS);
      }
      if (folderId === folder.id) {
        setFolderId("");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete folder");
    } finally {
      setFolderActionId(null);
    }
  }

  async function movePost(post: ThreadPost, nextFolderId: string) {
    const previousFolderId = post.folder?.id ?? "";
    if (previousFolderId === nextFolderId || movingPostId) return;

    setMovingPostId(post.id);
    setError(null);
    try {
      const res = await fetch(`/api/threads/${post.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderId: nextFolderId || null }),
      });
      const json = (await res.json()) as ThreadUpdateResponse;
      if (!res.ok) {
        throw new Error(json.error || `Request failed (${res.status})`);
      }
      if (!json.post) throw new Error("Failed to move thread");

      const movedPost = json.post;
      const shouldRemainVisible =
        activeFolderId === ALL_FOLDERS ||
        (activeFolderId === NO_FOLDER && !movedPost.folder) ||
        movedPost.folder?.id === activeFolderId;

      setPosts((current) =>
        shouldRemainVisible
          ? current.map((item) => (item.id === movedPost.id ? movedPost : item))
          : current.filter((item) => item.id !== movedPost.id),
      );
      setFolders((current) =>
        current.map((folder) => {
          if (folder.id === previousFolderId) return { ...folder, count: Math.max(0, folder.count - 1) };
          if (folder.id === movedPost.folder?.id) return { ...folder, count: folder.count + 1 };
          return folder;
        }),
      );
      setCounts((current) => ({
        noFolder:
          !previousFolderId && movedPost.folder
            ? Math.max(0, current.noFolder - 1)
            : previousFolderId && !movedPost.folder
              ? current.noFolder + 1
              : current.noFolder,
        total: current.total,
      }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to move thread");
    } finally {
      setMovingPostId(null);
    }
  }

  function selectFolder(nextFolderId: string) {
    setActiveFolderId(nextFolderId);
    void load(nextFolderId);
  }

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void load(ALL_FOLDERS);
    }, 0);
    return () => window.clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-full bg-zinc-50 text-zinc-950 dark:bg-black dark:text-zinc-50">
      <main className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[280px_minmax(0,1fr)] lg:py-12">
        <aside className="space-y-5 lg:sticky lg:top-8 lg:self-start">
          <header>
            <div className="mb-2 text-xs font-medium tracking-wide text-zinc-500 dark:text-zinc-400">
              Threads Pocket
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">Folders</h1>
          </header>

          <form onSubmit={onCreateFolder} className="rounded-2xl border border-zinc-200 bg-white p-2 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <label className="sr-only" htmlFor="folder-name">
              Folder name
            </label>
            <div className="flex gap-2">
              <input
                id="folder-name"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="New folder"
                maxLength={60}
                className="h-10 min-w-0 flex-1 rounded-lg border border-zinc-200 bg-transparent px-3 text-sm outline-none placeholder:text-zinc-400 focus:border-zinc-400 dark:border-zinc-800 dark:placeholder:text-zinc-500"
              />
              <button
                type="submit"
                disabled={!canCreateFolder}
                className="h-10 rounded-lg bg-zinc-900 px-3 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:text-zinc-500 dark:disabled:bg-zinc-800"
              >
                Add
              </button>
            </div>
          </form>

          <nav className="rounded-2xl border border-zinc-200 bg-white p-2 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <FolderButton
              active={activeFolderId === ALL_FOLDERS}
              count={counts.total}
              label="All threads"
              onClick={() => selectFolder(ALL_FOLDERS)}
            />
            <FolderButton
              active={activeFolderId === NO_FOLDER}
              count={counts.noFolder}
              label="No folder"
              onClick={() => selectFolder(NO_FOLDER)}
            />
            {folders.map((folder) => (
              <FolderButton
                key={folder.id}
                active={activeFolderId === folder.id}
                count={folder.count}
                label={folder.name}
                onClick={() => selectFolder(folder.id)}
              />
            ))}
          </nav>
        </aside>

        <div className="min-w-0">
          <header className="mb-8">
            <h2 className="text-2xl font-semibold tracking-tight">Save a thread</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
              Add a title, URL, and optional folder. Content analysis can come later.
            </p>
          </header>

          <section className="rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <form onSubmit={onSubmit} className="flex flex-col gap-3">
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_220px]">
                <label className="sr-only" htmlFor="thread-title">
                  Title
                </label>
                <input
                  id="thread-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Title"
                  maxLength={180}
                  className="h-12 w-full rounded-xl border border-zinc-200 bg-transparent px-4 text-sm outline-none ring-0 placeholder:text-zinc-400 focus:border-zinc-400 dark:border-zinc-800 dark:placeholder:text-zinc-500 dark:focus:border-zinc-600"
                />
                <label className="sr-only" htmlFor="thread-folder">
                  Folder
                </label>
                <select
                  id="thread-folder"
                  value={folderId}
                  onChange={(e) => setFolderId(e.target.value)}
                  className="h-12 w-full rounded-xl border border-zinc-200 bg-transparent px-4 text-sm outline-none ring-0 focus:border-zinc-400 dark:border-zinc-800 dark:focus:border-zinc-600"
                >
                  <option value="">No folder</option>
                  {folders.map((folder) => (
                    <option key={folder.id} value={folder.id}>
                      {folder.name}
                    </option>
                  ))}
                </select>
              </div>
              <label className="sr-only" htmlFor="thread-url">
                Thread URL
              </label>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <input
                  id="thread-url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://..."
                  inputMode="url"
                  className="h-12 w-full rounded-xl border border-zinc-200 bg-transparent px-4 text-sm outline-none ring-0 placeholder:text-zinc-400 focus:border-zinc-400 dark:border-zinc-800 dark:placeholder:text-zinc-500 dark:focus:border-zinc-600"
                />
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="h-12 shrink-0 rounded-xl bg-zinc-900 px-5 text-sm font-medium text-white shadow-sm transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:text-zinc-500 dark:disabled:bg-zinc-800 dark:disabled:text-zinc-500"
                >
                  {isSaving ? "Saving..." : "Save"}
                </button>
              </div>
            </form>

            {error ? (
              <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-950/60 dark:bg-red-950/30 dark:text-red-200">
                {error}
              </div>
            ) : null}
          </section>

          <section className="mt-10">
            <div className="mb-4 flex items-baseline justify-between">
              {selectedFolder && editingFolderId === selectedFolder.id ? (
                <div className="flex items-center gap-2">
                  <input
                    value={editingFolderName}
                    onChange={(event) => setEditingFolderName(event.target.value)}
                    maxLength={60}
                    className="h-8 w-56 rounded border border-zinc-300 bg-transparent px-2 text-sm font-semibold text-zinc-800 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:text-zinc-200 dark:focus:border-zinc-500"
                  />
                  <button
                    type="button"
                    onClick={() => void renameFolder(selectedFolder, editingFolderName)}
                    disabled={folderActionId === selectedFolder.id || editingFolderName.trim().length === 0}
                    className="rounded px-2 py-1 text-[11px] font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 disabled:cursor-wait disabled:opacity-50 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
                  >
                    儲存
                  </button>
                  <button
                    type="button"
                    onClick={cancelRenameFolder}
                    disabled={folderActionId === selectedFolder.id}
                    className="rounded px-2 py-1 text-[11px] font-medium text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 disabled:cursor-wait disabled:opacity-50 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-200"
                  >
                    取消
                  </button>
                </div>
              ) : (
                <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                  {activeFolderId === ALL_FOLDERS
                    ? "Saved threads"
                    : activeFolderId === NO_FOLDER
                      ? "No folder"
                      : folders.find((folder) => folder.id === activeFolderId)?.name || "Saved threads"}
                </h2>
              )}
              <div className="flex items-center gap-2">
                {selectedFolder ? (
                  <>
                    <button
                      type="button"
                      onClick={() => startRenameFolder(selectedFolder)}
                      disabled={folderActionId === selectedFolder.id}
                      className="rounded px-2 py-1 text-[11px] font-medium text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 disabled:cursor-wait disabled:opacity-50 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
                    >
                      編輯
                    </button>
                    <button
                      type="button"
                      onClick={() => void deleteFolder(selectedFolder)}
                      disabled={folderActionId === selectedFolder.id}
                      className="rounded px-2 py-1 text-[11px] font-medium text-red-500 hover:bg-red-500/10 disabled:cursor-wait disabled:opacity-50 dark:text-red-300"
                    >
                      刪除
                    </button>
                  </>
                ) : null}
                <button
                  type="button"
                  onClick={() => void load()}
                  className="text-xs font-medium text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
                >
                  Refresh
                </button>
              </div>
            </div>

            {isLoading ? (
              <div className="text-sm text-zinc-500 dark:text-zinc-400">Loading...</div>
            ) : posts.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-zinc-200 bg-white px-6 py-10 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
                No items here yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {posts.map((post) => (
                  <ThreadCard
                    key={post.id}
                    folders={folders}
                    isMoving={movingPostId === post.id}
                    onMove={(nextFolderId) => void movePost(post, nextFolderId)}
                    post={post}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

function ThreadCard({
  folders,
  isMoving,
  onMove,
  post,
}: {
  folders: Folder[];
  isMoving: boolean;
  onMove: (folderId: string) => void;
  post: ThreadPost;
}) {
  return (
    <article className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="mb-2 inline-flex max-w-full items-center gap-2 rounded-full border border-zinc-200 px-3 py-1 text-xs font-medium text-zinc-600 dark:border-zinc-800 dark:text-zinc-300">
            <span className="truncate">{post.folder?.name ?? "待分類"}</span>
          </div>
          <h3 className="truncate text-base font-semibold text-zinc-950 dark:text-zinc-50">
            {post.title}
          </h3>
          <div className="mt-1 truncate text-xs text-zinc-500 dark:text-zinc-400">{post.url}</div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <label className="sr-only" htmlFor={`folder-${post.id}`}>
            Move to folder
          </label>
          <select
            id={`folder-${post.id}`}
            value={post.folder?.id ?? ""}
            onChange={(event) => onMove(event.target.value)}
            disabled={isMoving}
            className="h-9 max-w-44 rounded-lg border border-zinc-200 bg-transparent px-2 text-xs outline-none focus:border-zinc-400 disabled:cursor-wait disabled:opacity-60 dark:border-zinc-800 dark:focus:border-zinc-600"
          >
            <option value="">待分類</option>
            {folders.map((folder) => (
              <option key={folder.id} value={folder.id}>
                {folder.name}
              </option>
            ))}
          </select>
          <a
            href={post.url}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border border-zinc-200 px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-900"
          >
            Open
          </a>
        </div>
      </div>

      <div className="border-t border-zinc-100 pt-4 dark:border-zinc-900">
        <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">summary</div>
        <div className="mt-1 text-sm leading-6 text-zinc-900 dark:text-zinc-50">
          {post.summary ?? "尚未產生摘要"}
        </div>
      </div>
    </article>
  );
}

function FolderButton({
  active,
  count,
  label,
  onClick,
}: {
  active: boolean;
  count: number;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex h-10 w-full items-center gap-2 rounded-lg px-2 text-left text-sm transition ${
        active
          ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950"
          : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-50"
      }`}
    >
      <span className="flex min-w-0 flex-1 items-center justify-between px-1">
        <span className="truncate">{label}</span>
        <span className={active ? "text-zinc-300 dark:text-zinc-600" : "text-zinc-400"}>{count}</span>
      </span>
    </button>
  );
}

import { NextResponse } from "next/server";
import { isDatabaseConfigured, prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type ThreadPostResponse = {
  id: string;
  url: string;
  title: string;
  summary: string | null;
  category: string | null;
  folder: {
    id: string;
    name: string;
  } | null;
  createdAt: Date;
};

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function normalizeUrl(value: unknown) {
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

function normalizeTitle(value: unknown) {
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  return trimmed.slice(0, 180);
}

function normalizeFolderId(value: unknown) {
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  return trimmed || null;
}

export async function GET(req: Request) {
  if (!isDatabaseConfigured) {
    return errorResponse("DATABASE_URL 尚未設定，請先連接 Neon Postgres。", 500);
  }

  try {
    const folderId = new URL(req.url).searchParams.get("folderId");
    const posts: ThreadPostResponse[] = await prisma.threadPost.findMany({
      where:
        folderId === "__none"
          ? { folderId: null }
          : folderId
            ? { folderId }
            : undefined,
      select: {
        id: true,
        url: true,
        title: true,
        summary: true,
        category: true,
        folder: {
          select: {
            id: true,
            name: true,
          },
        },
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ posts });
  } catch (error) {
    console.error("Failed to read thread posts:", error);
    return errorResponse("無法從資料庫獲取資料，請確認 DATABASE_URL 與資料表已設定。", 500);
  }
}

export async function POST(req: Request) {
  if (!isDatabaseConfigured) {
    return errorResponse("DATABASE_URL 尚未設定，請先連接 Neon Postgres。", 500);
  }

  try {
    const body = (await req.json()) as { folderId?: unknown; title?: unknown; url?: unknown };
    const title = normalizeTitle(body.title);
    const url = normalizeUrl(body.url);
    const folderId = normalizeFolderId(body.folderId);

    if (!title) {
      return errorResponse("請輸入標題。", 400);
    }

    if (!url) {
      return errorResponse("請輸入有效的 http 或 https 網址。", 400);
    }

    const folder = folderId
      ? await prisma.folder.findUnique({
          where: { id: folderId },
          select: { id: true, name: true },
        })
      : null;

    if (folderId && !folder) {
      return errorResponse("找不到這個資料夾。", 400);
    }

    const post: ThreadPostResponse = await prisma.threadPost.create({
      data: {
        url,
        title,
        content: "這是一則來自 Threads 的貼文",
        summary: null,
        category: folder?.name ?? null,
        folderId,
      },
      select: {
        id: true,
        url: true,
        title: true,
        summary: true,
        category: true,
        folder: {
          select: {
            id: true,
            name: true,
          },
        },
        createdAt: true,
      },
    });

    return NextResponse.json({ post }, { status: 201 });
  } catch (error) {
    console.error("Failed to save thread post:", error);
    return errorResponse("資料庫儲存失敗，請確認 DATABASE_URL 與資料表已設定。", 500);
  }
}

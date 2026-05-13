import { NextResponse } from "next/server";
import { isDatabaseConfigured, prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function normalizeFolderId(value: unknown) {
  if (value === null) return null;
  if (typeof value !== "string") return undefined;

  const trimmed = value.trim();
  return trimmed || null;
}

export async function PATCH(req: Request, context: RouteContext<"/api/threads/[id]">) {
  if (!isDatabaseConfigured) {
    return errorResponse("DATABASE_URL 尚未設定，請先連接 Neon Postgres。", 500);
  }

  try {
    const { id } = await context.params;
    const body = (await req.json()) as { folderId?: unknown };
    const folderId = normalizeFolderId(body.folderId);

    if (folderId === undefined) {
      return errorResponse("資料夾格式不正確。", 400);
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

    const post = await prisma.threadPost.update({
      where: { id },
      data: {
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

    return NextResponse.json({ post });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2025"
    ) {
      return errorResponse("找不到這筆收藏。", 404);
    }

    console.error("Failed to update thread post:", error);
    return errorResponse("無法更新資料夾。", 500);
  }
}

import { NextResponse } from "next/server";
import { isDatabaseConfigured, prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function normalizeName(value: unknown) {
  if (typeof value !== "string") return null;

  const trimmed = value.trim().replace(/\s+/g, " ");
  if (!trimmed) return null;

  return trimmed.slice(0, 60);
}

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  if (!isDatabaseConfigured) {
    return errorResponse("DATABASE_URL 尚未設定，請先連接 Neon Postgres。", 500);
  }

  try {
    const { id } = await context.params;
    const body = (await req.json()) as { name?: unknown };
    const name = normalizeName(body.name);

    if (!name) {
      return errorResponse("請輸入資料夾名稱。", 400);
    }

    const updated = await prisma.folder.update({
      where: { id },
      data: { name },
      select: {
        id: true,
        name: true,
        createdAt: true,
        _count: {
          select: { posts: true },
        },
      },
    });

    await prisma.threadPost.updateMany({
      where: { folderId: id },
      data: { category: name },
    });

    return NextResponse.json({
      folder: {
        id: updated.id,
        name: updated.name,
        count: updated._count.posts,
        createdAt: updated.createdAt,
      },
    });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2025"
    ) {
      return errorResponse("找不到資料夾。", 404);
    }

    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return errorResponse("這個資料夾名稱已存在。", 409);
    }

    console.error("Failed to rename folder:", error);
    return errorResponse("無法重新命名資料夾。", 500);
  }
}

export async function DELETE(_req: Request, context: { params: Promise<{ id: string }> }) {
  if (!isDatabaseConfigured) {
    return errorResponse("DATABASE_URL 尚未設定，請先連接 Neon Postgres。", 500);
  }

  try {
    const { id } = await context.params;

    const folder = await prisma.folder.findUnique({
      where: { id },
      select: { id: true, _count: { select: { posts: true } } },
    });

    if (!folder) {
      return errorResponse("找不到資料夾。", 404);
    }

    await prisma.folder.delete({ where: { id } });

    return NextResponse.json({
      deletedFolderId: folder.id,
      movedToNoFolder: folder._count.posts,
    });
  } catch (error) {
    console.error("Failed to delete folder:", error);
    return errorResponse("無法刪除資料夾。", 500);
  }
}

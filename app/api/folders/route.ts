import { NextResponse } from "next/server";
import { isDatabaseConfigured, prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type FolderRow = {
  id: string;
  name: string;
  createdAt: Date;
  _count: {
    posts: number;
  };
};

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function normalizeName(value: unknown) {
  if (typeof value !== "string") return null;

  const trimmed = value.trim().replace(/\s+/g, " ");
  if (!trimmed) return null;

  return trimmed.slice(0, 60);
}

export async function GET() {
  if (!isDatabaseConfigured) {
    return errorResponse("DATABASE_URL 尚未設定，請先連接 Neon Postgres。", 500);
  }

  try {
    const [folders, totalCount, noFolderCount] = await Promise.all([
      prisma.folder.findMany({
        select: {
          id: true,
          name: true,
          createdAt: true,
          _count: {
            select: {
              posts: true,
            },
          },
        },
        orderBy: [{ name: "asc" }],
      }),
      prisma.threadPost.count(),
      prisma.threadPost.count({ where: { folderId: null } }),
    ]);

    return NextResponse.json({
      folders: (folders as FolderRow[]).map((folder: FolderRow) => ({
        id: folder.id,
        name: folder.name,
        count: folder._count.posts,
        createdAt: folder.createdAt,
      })),
      noFolderCount,
      totalCount,
    });
  } catch (error) {
    console.error("Failed to read folders:", error);
    return errorResponse("無法讀取資料夾。", 500);
  }
}

export async function POST(req: Request) {
  if (!isDatabaseConfigured) {
    return errorResponse("DATABASE_URL 尚未設定，請先連接 Neon Postgres。", 500);
  }

  try {
    const body = (await req.json()) as { name?: unknown };
    const name = normalizeName(body.name);

    if (!name) {
      return errorResponse("請輸入資料夾名稱。", 400);
    }

    const folder = await prisma.folder.create({
      data: { name },
      select: {
        id: true,
        name: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ folder: { ...folder, count: 0 } }, { status: 201 });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return errorResponse("這個資料夾已經存在。", 409);
    }

    console.error("Failed to create folder:", error);
    return errorResponse("無法建立資料夾。", 500);
  }
}

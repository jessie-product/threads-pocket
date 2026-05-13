import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

// 初始化 Prisma，這會自動讀取你的 prisma.config.ts 設定
const prisma = new PrismaClient();

export async function GET() {
  try {
    const posts = await prisma.threadPost.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(posts);
  } catch (error) {
    console.error("讀取資料庫時發生錯誤:", error);
    return NextResponse.json({ error: "無法從資料庫獲取資料" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { url } = await req.json();

    // 嚴謹檢查：確保網址不為空
    if (!url) {
      return NextResponse.json({ error: "網址不能為空" }, { status: 400 });
    }

    // 執行儲存
    const newPost = await prisma.threadPost.create({
      data: {
        url: url,
        content: "這是一則來自 Threads 的貼文",
        summary: "AI 正在分析這則貼文的精華...", // 這裡之後可以接 AI API
        category: "待分類",
      }
    });

    return NextResponse.json(newPost, { status: 201 });
  } catch (error) {
    console.error("儲存資料時發生錯誤:", error);
    return NextResponse.json({ error: "資料庫儲存失敗，請檢查連線" }, { status: 500 });
  }
}
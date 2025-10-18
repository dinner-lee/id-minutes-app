export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const Body = z.object({
  blockId: z.string(),
  message: z.string().optional(),
});

async function getOrCreateDevUser() {
  const email = process.env.DEV_USER_EMAIL || "dev@example.com";
  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    user = await prisma.user.create({
      data: { email, name: "Dev User" },
    });
  }
  return user;
}

export async function POST(req: NextRequest) {
  try {
    const me = await getOrCreateDevUser();
    const { blockId, message } = Body.parse(await req.json());

    // Get the existing chat thread
    const chatThread = await prisma.chatThread.findUnique({
      where: { blockId },
      include: { block: true },
    });

    if (!chatThread) {
      return NextResponse.json({ ok: false, error: "Chat thread not found" }, { status: 404 });
    }

    // For now, just return a success response
    // In a real implementation, this would:
    // 1. Send the message to ChatGPT API
    // 2. Get the response
    // 3. Update the chat thread with new messages
    // 4. Re-analyze flows if needed

    return NextResponse.json({
      ok: true,
      message: "Continue chat functionality is ready. This would open a chat interface.",
      chatUrl: `/chat/${blockId}`, // Placeholder for chat interface
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Failed to continue chat" },
      { status: 400 }
    );
  }
}

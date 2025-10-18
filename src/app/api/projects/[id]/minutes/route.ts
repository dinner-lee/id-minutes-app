export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

async function getOrCreateDevUser() {
  const email = process.env.DEV_USER_EMAIL || "dev@example.com";
  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) user = await prisma.user.create({ data: { email, name: "Dev User" } });
  return user;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id;
    const minutes = await prisma.minute.findMany({
      where: { projectId },
      orderBy: { updatedAt: "desc" },
      include: { blocks: true, author: true },
    });
    return NextResponse.json({ ok: true, minutes });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Failed to list minutes" },
      { status: 400 }
    );
  }
}

const CreateMinuteSchema = z.object({
  title: z.string().min(1),
  stageId: z.string().optional().nullable(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id;
    const body = await req.json();
    const { title, stageId } = CreateMinuteSchema.parse(body);

    const me = await getOrCreateDevUser();

    const minute = await prisma.minute.create({
      data: {
        projectId,
        authorId: me.id,
        title,
        stageId: stageId ?? null,
        markdown: "",
      },
    });

    return NextResponse.json({ ok: true, minute });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Failed to create minute" },
      { status: 400 }
    );
  }
}

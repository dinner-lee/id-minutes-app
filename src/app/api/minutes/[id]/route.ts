export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

/** GET /api/minutes/:id — fetch minute with blocks (for BlocksList) */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = await params;
    const minute = await prisma.minute.findUnique({
      where: { id },
      include: {
        blocks: {
          orderBy: { updatedAt: "desc" },
          include: {
            createdBy: { select: { id: true, name: true, email: true } },
            chat: true,
            file: true,
          },
        },
      },
    });
    if (!minute) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    return NextResponse.json({ ok: true, minute });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Error" }, { status: 400 });
  }
}

/** PATCH /api/minutes/:id — save title and/or body snapshot (HTML) */
const PatchSchema = z.object({
  title: z.string().max(200).optional(),
  html: z.string().optional(),       // TipTap HTML snapshot (we persist in minute.markdown for now)
  stageId: z.string().nullable().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = PatchSchema.parse(await req.json());
    const { id } = await params;
    const data: any = {};
    if (typeof body.title === "string") data.title = body.title;
    if (typeof body.html === "string") data.markdown = body.html; // using 'markdown' column to store HTML snapshot
    if (body.stageId !== undefined) data.stageId = body.stageId;

    const updated = await prisma.minute.update({
      where: { id },
      data,
      select: { id: true, title: true, stageId: true, updatedAt: true },
    });
    return NextResponse.json({ ok: true, minute: updated });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Failed to save minute" }, { status: 400 });
  }
}

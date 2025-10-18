export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: { blockId: string } }) {
  try {
    const { blockId } = await params;
    
    const block = await prisma.block.findUnique({
      where: { id: blockId },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        chat: true,
        file: true,
      },
    });

    if (!block) {
      return NextResponse.json({ ok: false, error: "Block not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, block });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Error fetching block" }, { status: 400 });
  }
}
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** DELETE /api/projects/:id — delete a project */
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = await params;
    
    // Delete the project (cascade will handle related records)
    await prisma.project.delete({
      where: { id },
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Failed to delete project" }, { status: 400 });
  }
}


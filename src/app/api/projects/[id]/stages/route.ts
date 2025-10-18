export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

/** Replace stage list (order + plannedDate) for a project in one shot */
const SaveStagesSchema = z.object({
  stages: z.array(
    z.object({
      id: z.string().optional(), // if provided, can be ignored (we replace anyway)
      name: z.string().min(1),
      order: z.number().int().nonnegative(),
      plannedDate: z.string().datetime().nullable().optional(),
    })
  ),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id;
    const body = await req.json();
    const { stages } = SaveStagesSchema.parse(body);

    await prisma.$transaction([
      prisma.stage.deleteMany({ where: { projectId } }),
      prisma.stage.createMany({
        data: stages.map((s) => ({
          projectId,
          name: s.name,
          order: s.order,
          plannedDate: s.plannedDate ? new Date(s.plannedDate) : null,
        })),
      }),
    ]);

    const saved = await prisma.stage.findMany({
      where: { projectId },
      orderBy: { order: "asc" },
    });

    return NextResponse.json({ ok: true, stages: saved });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Failed to save stages" },
      { status: 400 }
    );
  }
}

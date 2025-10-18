export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

/** Body: set/replace instructional models for a project */
const SetModelsSchema = z.object({
  models: z.array(
    z.object({
      name: z.string().min(1), // e.g., "ADDIE" | "Dick, Carey & Carey" | "RPISD" | "Custom"
      config: z.any(),         // JSON of canonical stages, etc.
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
    const { models } = SetModelsSchema.parse(body);

    // Replace all models for this project (simple & clear)
    await prisma.$transaction([
      prisma.instructionalModel.deleteMany({ where: { projectId } }),
      prisma.instructionalModel.createMany({
        data: models.map((m) => ({ projectId, name: m.name, config: m.config })),
      }),
    ]);

    const saved = await prisma.instructionalModel.findMany({ where: { projectId } });
    return NextResponse.json({ ok: true, models: saved });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Failed to set models" },
      { status: 400 }
    );
  }
}

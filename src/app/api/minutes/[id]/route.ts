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
    
    // Enhance blocks with computed fields for ChatGPT blocks
    const enhancedBlocks = minute.blocks.map((block: any) => {
      if (block.type === "CHATGPT" && block.chat?.flows) {
        const flows = block.chat.flows as any[];
        const raw = block.chat.raw as any;
        const rawPairs = raw?.pairs || [];
        
        if (Array.isArray(flows) && flows.length > 0) {
          // Get most frequent category
          const categoryFrequency: Record<string, number> = {};
          flows.forEach((flow: any) => {
            if (flow?.category) {
              categoryFrequency[flow.category] = (categoryFrequency[flow.category] || 0) + 1;
            }
          });
          const categories = Object.entries(categoryFrequency)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 1)
            .map(([category]) => category);
          // Calculate total turns across all flows
          const turnCount = flows.reduce((sum, flow: any) => {
            return sum + ((flow?.endPair || 0) - (flow?.startPair || 0) + 1);
          }, 0);
          
          // Enhance flows with turnPairs if not already present
          const enhancedFlows = flows.map((flow: any) => {
            // If already has turnPairs, just ensure title is preserved
            if (flow.turnPairs && flow.turnPairs.length > 0) {
              return {
                ...flow,
                title: flow.title || "", // Explicitly preserve title field
              };
            }
            
            // Extract conversation pairs for this flow from raw data
            const flowPairs = rawPairs.slice(flow.startPair, flow.endPair + 1);
            
            return {
              ...flow,
              title: flow.title || "", // Preserve title if it exists
              turnPairs: flowPairs.map((pair: any, idx: number) => ({
                userText: pair.userText || "",
                assistantTexts: pair.assistantTexts || [],
                turnNumber: flow.startPair + idx + 1,
              })),
            };
          });
          
          return {
            ...block,
            flowCategories: categories,
            flowCount: flows.length,
            turnCount,
            chat: {
              ...block.chat,
              flows: enhancedFlows,
            },
          };
        }
      }
      return block;
    });

    return NextResponse.json({ ok: true, minute: { ...minute, blocks: enhancedBlocks } });
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

/** DELETE /api/minutes/:id — delete a minute */
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = await params;
    
    // Delete the minute (cascade will handle related records)
    await prisma.minute.delete({
      where: { id },
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Failed to delete minute" }, { status: 400 });
  }
}

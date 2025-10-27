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

    // Enhance block with computed fields for ChatGPT blocks
    let enhancedBlock = block;
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
        
        enhancedBlock = {
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

    return NextResponse.json({ ok: true, block: enhancedBlock });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Error fetching block" }, { status: 400 });
  }
}
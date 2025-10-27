// src/app/api/minutes/[id]/blocks/link/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ogScrape } from "@/lib/og";
import { isChatGPTShare } from "@/lib/chatgpt-ingest";

const Body = z.object({
  // common
  url: z.string().optional(),              // website link or chatgpt share; may be "manual://pasted-chat"
  notes: z.string().optional(),
  titleOverride: z.string().optional(),

  // when adding ChatGPT conversation after preview/review:
  // we expect the client to pass finalized "segments" (aka flowsOverride)
  flowsOverride: z
    .array(
      z.object({
        category: z.string(),
        startPair: z.number().int(),
        endPair: z.number().int(),
        userIndices: z.array(z.number().int()),
        assistantPreview: z.string().optional().default(""),
        title: z.string().optional(), // Flow title
        // Additional fields for storing actual conversation data
        userText: z.string().optional(),
        assistantTexts: z.array(z.string()).optional(),
        turnPairs: z.array(z.object({
          userText: z.string(),
          assistantTexts: z.array(z.string()),
          turnNumber: z.number(),
        })).optional(),
      })
    )
    .optional(),
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


export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const me = await getOrCreateDevUser();
    const { id: minuteId } = await params;
    const body = Body.parse(await req.json());

    // If client sent segments => treat as ChatGPT block
    if (body.flowsOverride && body.flowsOverride.length) {
      const title = body.titleOverride?.trim() || "ChatGPT Conversation";
      const url = body.url || "manual://pasted-chat";

      // Create the Block first
      const block = await prisma.block.create({
        data: {
          minuteId,
          createdById: me.id,
          type: "CHATGPT", // enum in your schema
          title,
          url,
          providerTag: "ChatGPT",
        },
        select: {
          id: true,
          type: true,
          title: true,
          url: true,
          providerTag: true,
          thumbnailUrl: true,
          createdAt: true,
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      // Store segments JSON in the related Chat record
      await prisma.chatThread.create({
        data: {
          blockId: block.id,
          // Store the flows (segments) and the raw conversation pairs
          flows: body.flowsOverride as any,
          raw: { 
            pairs: body.flowsOverride?.flatMap((flow: any) => {
              // Use turnPairs if available (for collapsed flows), otherwise create single pair
              if (flow.turnPairs && flow.turnPairs.length > 0) {
                return flow.turnPairs.map((turnPair: any) => ({
                  userText: turnPair.userText || "",
                  assistantTexts: turnPair.assistantTexts || [],
                  category: flow.category,
                  addedBy: me.name || me.email,
                  addedAt: new Date().toISOString(),
                  turnNumber: turnPair.turnNumber,
                }));
              } else {
                // Fallback for single turn flows
                return [{
                  userText: flow.userText || "",
                  assistantTexts: flow.assistantTexts || [flow.assistantPreview || ""],
                  category: flow.category,
                  addedBy: me.name || me.email,
                  addedAt: new Date().toISOString(),
                  turnNumber: flow.startPair + 1,
                }];
              }
            }) || []
          },
          canonicalId: null,
          notes: body.notes || null,
        },
      });

      // Extract flow categories and count for display
      const flowCategories = body.flowsOverride
        ?.map(f => f.category)
        .filter((cat, index, arr) => arr.indexOf(cat) === index) // unique categories
        .slice(0, 1) || []; // top 1 most frequent
      const flowCount = body.flowsOverride?.length || 0;
      
      // Calculate total turns across all flows
      const turnCount = body.flowsOverride?.reduce((sum, flow) => {
        return sum + ((flow?.endPair || 0) - (flow?.startPair || 0) + 1);
      }, 0) || 0;

      return NextResponse.json({
        ok: true,
        block: {
          ...block,
          isRemix: false, // you can toggle this if you implement remix detection
          flowCategories,
          flowCount,
          turnCount,
        },
      });
    }

    // Otherwise: treat as a generic website link
    if (!body.url) {
      return NextResponse.json({ ok: false, error: "Missing url." }, { status: 400 });
    }

    const targetUrl = body.url.trim();
    // (Optionally) reject ChatGPT links here unless they come with flowsOverride.
    // But we’ll allow saving a raw link too if you want:
    const isCgpt = isChatGPTShare(targetUrl);

    // Scrape Open Graph metadata (best-effort)
    let meta: { title?: string | null; siteName?: string | null; image?: string | null } = {};
    try {
      meta = await ogScrape(targetUrl);
    } catch {
      // non-fatal
    }

    const title =
      body.titleOverride?.trim() ||
      meta.title ||
      meta.siteName ||
      (isCgpt ? "ChatGPT Conversation" : "Website");

    const hostname = (() => {
      try {
        return new URL(targetUrl).hostname.replace(/^www\./, "");
      } catch {
        return null;
      }
    })();

    const block = await prisma.block.create({
      data: {
        minuteId,
        createdById: me.id,
        type: isCgpt ? "CHATGPT" : "WEBSITE",
        title,
        url: targetUrl,
        providerTag: isCgpt ? "ChatGPT" : hostname,
        thumbnailUrl: meta.image || null,
      },
      select: {
        id: true,
        type: true,
        title: true,
        url: true,
        providerTag: true,
        thumbnailUrl: true,
        createdAt: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Create ChatThread for notes if provided
    if (body.notes) {
      await prisma.chatThread.create({
        data: {
          blockId: block.id,
          raw: {},
          flows: [],
          notes: body.notes,
          canonicalId: null,
        },
      });
    }

    // No chat segments here because none were provided (this is a plain link attach)
    return NextResponse.json({
      ok: true,
      block: {
        ...block,
        isRemix: false,
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Failed to attach" },
      { status: 400 }
    );
  }
}

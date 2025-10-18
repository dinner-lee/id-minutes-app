export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { ogScrape } from "@/lib/og";

async function getOrCreateDevUser() {
  const email = process.env.DEV_USER_EMAIL || "dev@example.com";
  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) user = await prisma.user.create({ data: { email, name: "Dev User" } });
  return user;
}

const LinkSchema = z.object({
  url: z.string().url(),
  notes: z.string().optional(),
});

// Very simple detector; refine later.
function isChatGPTShare(url: string) {
  try {
    const u = new URL(url);
    return u.hostname.includes("chatgpt.com") && u.pathname.startsWith("/share");
  } catch {
    return false;
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const minuteId = params.id;
    const { url, notes } = LinkSchema.parse(await req.json());
    const me = await getOrCreateDevUser();

    if (isChatGPTShare(url)) {
      // Minimal placeholder for now (ingest pipeline can be added later)
      const block = await prisma.block.create({
        data: {
          minuteId,
          type: "CHATGPT",
          providerTag: "ChatGPT",
          title: "ChatGPT Conversation",
          url,
          createdById: me.id,
          chat: {
            create: {
              raw: { messages: [] }, // TODO: fetch & parse share
              flows: [],
              notes: notes || null,
              canonicalId: null, // TODO
            },
          },
        },
        include: { 
          chat: true,
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });
      return NextResponse.json({ ok: true, block });
    }

    // WEBSITE path: scrape OG
    const meta = await ogScrape(url).catch(() => ({
      title: url,
      ogImage: undefined,
      description: undefined,
      siteName: undefined,
    }));

    const block = await prisma.block.create({
      data: {
        minuteId,
        type: "WEBSITE",
        providerTag: "URL",
        title: meta.title || url,
        url,
        thumbnailUrl: meta.ogImage,
        createdById: me.id,
        // For WEBSITE, notes live in ChatThread? No. Keep simple: use Block.title/… and ignore notes,
        // or add a small ChatThread with notes only. We'll store notes in chatThread to align UI:
        chat: notes
          ? { create: { raw: {}, flows: [], notes, canonicalId: null } }
          : undefined,
      },
      include: { 
        chat: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({ ok: true, block });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Failed to attach link" },
      { status: 400 }
    );
  }
}

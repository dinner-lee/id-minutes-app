export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

async function getOrCreateDevUser() {
  const email = process.env.DEV_USER_EMAIL || "dev@example.com";
  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) user = await prisma.user.create({ data: { email, name: "Dev User" } });
  return user;
}

/**
 * Multipart form-data:
 *  - file: File
 *  - notes: string (optional)
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const minuteId = params.id;
    const me = await getOrCreateDevUser();

    const form = await req.formData();
    const file = form.get("file") as File | null;
    const notes = (form.get("notes") as string) || "";

    if (!file) {
      return NextResponse.json({ ok: false, error: "file is required" }, { status: 400 });
    }

    // In a real app, stream to S3 (R2/Supabase/etc.) and set key to the uploaded path.
    // Here we store metadata only for a working prototype.
    const arrayBuf = await file.arrayBuffer();
    const size = arrayBuf.byteLength;

    const block = await prisma.block.create({
      data: {
        minuteId,
        type: "FILE",
        providerTag: "UPLOAD",
        title: file.name,
        createdById: me.id,
        file: {
          create: {
            key: file.name, // TODO: replace with actual S3 key
            filename: file.name,
            mimeType: file.type || "application/octet-stream",
            size,
            textPreview: null, // TODO: run extract pipeline for pdf/txt/docx
          },
        },
        chat: notes ? { create: { raw: {}, flows: [], notes, canonicalId: null } } : undefined,
      },
      include: { 
        file: true, 
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
      { ok: false, error: err?.message ?? "Failed to upload file" },
      { status: 400 }
    );
  }
}

export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

/** Dev-only helper. Replace with real session-based user lookup (Auth.js). */
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

const CreateProjectSchema = z.object({
  title: z.string().min(1),
  purpose: z.string().min(1),
  startDate: z.string().datetime().or(z.string().min(1)), // allow raw string; convert later
  endDate: z.string().datetime().or(z.string().min(1)),
  members: z.array(z.string().email()).default([]), // collaborator emails
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, purpose, startDate, endDate, members } =
      CreateProjectSchema.parse(body);

    const me = await getOrCreateDevUser();

    // Create project
    const project = await prisma.project.create({
      data: {
        ownerId: me.id,
        title,
        purpose,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        memberships: {
          create: [
            {
              userId: me.id,
              role: "owner",
            },
            // Add each member as editor (skip self if present)
            ...(
              await Promise.all(
                members
                  .filter((e) => e.toLowerCase() !== me.email?.toLowerCase())
                  .map(async (email) => {
                    let u = await prisma.user.findUnique({ where: { email } });
                    if (!u) {
                      u = await prisma.user.create({ data: { email } });
                    }
                    return { userId: u.id, role: "editor" as const };
                  })
              )
            ),
          ],
        },
      },
      include: { memberships: { include: { user: true } } },
    });

    return NextResponse.json({ ok: true, project });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Failed to create project" },
      { status: 400 }
    );
  }
}

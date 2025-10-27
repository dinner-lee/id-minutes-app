export const runtime = "nodejs";

import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ProjectCard } from "@/app/components/ProjectCard";

/** Dev-only helper. Replace with real session lookup (NextAuth) later. */
async function getOrCreateDevUser() {
  const email = process.env.DEV_USER_EMAIL || "dev@example.com";
  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    user = await prisma.user.create({ data: { email, name: "Dev User" } });
  }
  return user;
}

export default async function HomePage() {
  const me = await getOrCreateDevUser();

  // Fetch projects where I'm owner or a member
  const projects = await prisma.project.findMany({
    where: {
      OR: [
        { ownerId: me.id },
        { memberships: { some: { userId: me.id } } },
      ],
    },
    orderBy: { updatedAt: "desc" },
    include: {
      _count: { select: { minutes: true, memberships: true } },
    },
  });

  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-white to-slate-50">
      <header className="border-b bg-white/70 backdrop-blur">
        <div className="mx-auto max-w-5xl px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold">ID Minutes — Dashboard</h1>
          <div className="flex items-center gap-3">
            <Link
              href="/projects/new/step1"
              className="inline-flex items-center rounded-md bg-black text-white px-3 py-2 text-sm hover:bg-black/90"
            >
              + New project
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        {projects.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <h2 className="text-lg font-medium mb-3">Your projects</h2>
            <ul className="grid gap-4 md:grid-cols-2">
              {projects.map((p) => (
                <ProjectCard key={p.id} project={p} />
              ))}
            </ul>
          </>
        )}
      </main>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="mx-auto max-w-2xl text-center py-24">
      <h2 className="text-2xl font-semibold">Welcome 👋</h2>
      <p className="text-sm text-muted-foreground mt-2">
        Create your first project to start managing collaborative instructional design minutes.
      </p>
      <div className="mt-6">
        <Link
          href="/projects/new/step1"
          className="inline-flex items-center rounded-md bg-black text-white px-4 py-2 text-sm hover:bg-black/90"
        >
          Create a project
        </Link>
      </div>
    </div>
  );
}

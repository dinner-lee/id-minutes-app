export const runtime = "nodejs";

import Link from "next/link";
import { prisma } from "@/lib/prisma";

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
                <li key={p.id} className="rounded-xl border bg-white p-4 hover:shadow-sm transition">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h3 className="font-semibold truncate">{p.title}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2">{p.purpose}</p>
                    </div>
                    <span className="shrink-0 text-[11px] text-muted-foreground">
                      Updated {new Date(p.updatedAt).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                    <span>
                      {p._count.minutes} minute{p._count.minutes === 1 ? "" : "s"}
                    </span>
                    <span>
                      {p._count.memberships + 1} member
                      {p._count.memberships + 1 === 1 ? "" : "s"}
                    </span>
                    <span>
                      {new Date(p.startDate).toLocaleDateString()} →{" "}
                      {new Date(p.endDate).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="mt-4 flex items-center gap-2">
                    <Link
                      href={`/projects/${p.id}`}
                      className="inline-flex items-center rounded-md border px-3 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                    >
                      Open workspace
                    </Link>
                    <Link
                      href={`/projects/new/step3?projectId=${p.id}`}
                      className="inline-flex items-center rounded-md border px-3 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                      title="Adjust model timeline"
                    >
                      Edit timeline
                    </Link>
                  </div>
                </li>
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

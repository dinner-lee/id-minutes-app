export const runtime = "nodejs";

import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import Editor from "./components/Editor";
import { StickyHeader } from "./components/StickyHeader";
import CreateMinuteButton from "./components/CreateMinuteButton";
import RightDetailPanel from "./components/RightDetailPanel";

type PageProps = {
  params: { projectId: string };
  searchParams: { minuteId?: string };
};

async function getProjectAndMinutes(projectId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      stages: { orderBy: { order: "asc" } },
      minutes: {
        orderBy: { updatedAt: "desc" },
        include: { author: true },
      },
    },
  });
  return project;
}

function pickSelectedMinute(
  minutes: Awaited<ReturnType<typeof prisma.minute.findMany>>,
  requestedId?: string
) {
  if (requestedId) {
    const found = minutes.find((m: any) => m.id === requestedId);
    if (found) return found;
  }
  return minutes[0] ?? null;
}

export default async function ProjectWorkspacePage({ params, searchParams }: PageProps) {
  const { projectId } = await params;
  const project = await getProjectAndMinutes(projectId);
  if (!project) notFound();

  const resolvedSearchParams = await searchParams;
  const selectedMinute = pickSelectedMinute(project.minutes, resolvedSearchParams.minuteId);

  return (
    <div className="flex h-[100dvh]">
      {/* Sidebar */}
      <aside className="w-72 shrink-0 border-r bg-white/70 backdrop-blur">
        <div className="p-4 border-b">
          <h2 className="font-semibold text-lg truncate">{project.title}</h2>
          <p className="text-xs text-muted-foreground line-clamp-2">{project.purpose}</p>
        </div>
        <div className="p-4">
          <CreateMinuteButton projectId={projectId} />
        </div>
        <MinutesList
          projectId={projectId}
          minutes={project.minutes}
          activeId={selectedMinute?.id}
        />
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0">
        {selectedMinute ? (
          <MinuteView
            key={selectedMinute.id} // remount per minute to isolate editor state
            minuteId={selectedMinute.id}
            title={selectedMinute.title}
            stageName={
              project.stages.find((s: any) => s.id === selectedMinute.stageId)?.name ?? undefined
            }
            createdAt={selectedMinute.createdAt}
            updatedAt={selectedMinute.updatedAt}
            initialHTML={selectedMinute.markdown ?? ""} // per-minute saved HTML
          />
        ) : (
          <EmptyState projectId={projectId} />
        )}
      </main>

      {/* Right detail panel */}
      <aside className="block w-[360px] border-l bg-white/60 backdrop-blur z-10">
        <RightDetailPanel />
      </aside>
    </div>
  );
}

/* ------------------------- Sidebar list ------------------------- */

function MinutesList({
  projectId,
  minutes,
  activeId,
}: {
  projectId: string;
  minutes: { id: string; title: string; updatedAt: Date }[];
  activeId?: string | null;
}) {
  if (!minutes.length) {
    return (
      <div className="px-4 text-sm text-muted-foreground">
        No minutes yet. Create one to get started.
      </div>
    );
  }

  return (
    <ul className="px-2 space-y-1 overflow-y-auto h:[calc(100dvh-160px)] md:h-[calc(100dvh-160px)]">
      {minutes.map((m) => {
        const href = `/projects/${projectId}?minuteId=${m.id}`;
        const active = m.id === activeId;
        return (
          <li key={m.id}>
            <Link
              href={href}
              className={`block rounded-md px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground ${
                active ? "bg-accent text-accent-foreground" : ""
              }`}
            >
              <div className="truncate">{m.title || "Untitled minute"}</div>
              <div className="text-[10px] text-muted-foreground">
                Updated {new Date(m.updatedAt).toLocaleString()}
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function EmptyState({ projectId }: { projectId: string }) {
  return (
    <div className="h-full grid place-items-center">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">No minutes yet</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Create your first meeting minute to start collaborating.
        </p>
        <CreateMinuteButton projectId={projectId} big />
      </div>
    </div>
  );
}

/* ------------------------- Main minute view ------------------------- */

function MinuteView({
  minuteId,
  title,
  stageName,
  createdAt,
  updatedAt,
  initialHTML,
}: {
  minuteId: string;
  title: string;
  stageName?: string;
  createdAt: Date;
  updatedAt: Date;
  initialHTML?: string;
}) {
  const user = { name: "You" }; // replace with real session user later

  return (
    <div key={minuteId} className="h-full flex flex-col">
      <StickyHeader
        key={`hdr-${minuteId}`}
        minuteId={minuteId}
        initialTitle={title || "Untitled minute"}
        stageName={stageName}
        createdAt={createdAt}
        updatedAt={updatedAt}
      />

      {/* Notion-like editor body (inline + inside Editor inserts cards) */}
      <div className="mx-auto w-full max-w-4xl px-4 py-6">
        <Suspense fallback={<div className="text-sm text-muted-foreground">Loading editor…</div>}>
          <Editor key={`ed-${minuteId}`} minuteId={minuteId} initialHTML={initialHTML || ""} user={user} />
        </Suspense>
      </div>
    </div>
  );
}

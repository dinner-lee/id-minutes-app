export const runtime = "nodejs";

import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";
import Editor from "./components/Editor";
import { StickyHeader } from "./components/StickyHeader";
import CreateMinuteButton from "./components/CreateMinuteButton";
import RightDetailPanel from "./components/RightDetailPanel";
import { FloatingAddButton } from "./components/FloatingAddButton";
import { MinutesList } from "./components/MinutesList";

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
        select: {
          id: true,
          title: true,
          updatedAt: true,
          createdAt: true,
          stageId: true,
          markdown: true,
        },
      },
    },
  });
  return project;
}

function pickSelectedMinute(
  minutes: Array<{ id: string; title: string; updatedAt: Date; createdAt: Date; stageId: string | null; markdown?: string | null }>,
  requestedId?: string
) {
  if (requestedId) {
    const found = minutes.find((m) => m.id === requestedId);
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
    <div className="flex h-[100dvh] overflow-hidden">
      {/* Sidebar */}
      <aside className="w-72 shrink-0 border-r bg-white/70 backdrop-blur flex flex-col">
        <div className="p-4 border-b shrink-0">
          {/* Back button */}
          <Link 
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to projects
          </Link>
          
          <h2 className="font-semibold text-lg truncate">{project.title}</h2>
          <p className="text-xs text-muted-foreground line-clamp-2">{project.purpose}</p>
        </div>
        <div className="p-4 shrink-0">
          <CreateMinuteButton projectId={projectId} />
        </div>
        <div className="flex-1 overflow-y-auto">
          <MinutesList
            projectId={projectId}
            minutes={project.minutes}
            activeId={selectedMinute?.id}
          />
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0 overflow-y-auto">
        {selectedMinute ? (
          <MinuteView
            key={selectedMinute.id} // remount per minute to isolate editor state
            minuteId={selectedMinute.id}
            title={selectedMinute.title}
            stageName={
              project.stages.find((s: any) => s.id === selectedMinute.stageId)?.name ?? undefined
            }
            currentStageId={selectedMinute.stageId}
            stages={project.stages}
            createdAt={selectedMinute.createdAt}
            updatedAt={selectedMinute.updatedAt}
            initialHTML={selectedMinute.markdown ?? ""} // per-minute saved HTML
          />
        ) : (
          <EmptyState projectId={projectId} />
        )}
      </main>

      {/* Right detail panel */}
      <aside className="block w-[476px] shrink-0 border-l bg-white/60 backdrop-blur z-10 overflow-y-auto">
        <RightDetailPanel />
      </aside>
    </div>
  );
}

/* ------------------------- Empty state ------------------------- */

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
  currentStageId,
  stages,
  createdAt,
  updatedAt,
  initialHTML,
}: {
  minuteId: string;
  title: string;
  stageName?: string;
  currentStageId?: string | null;
  stages?: Array<{ id: string; name: string; order: number; plannedDate?: Date | null }>;
  createdAt: Date;
  updatedAt: Date;
  initialHTML?: string;
}) {
  const user = { name: "You" }; // replace with real session user later

  return (
    <div key={minuteId} className="min-h-full flex flex-col relative">
      <StickyHeader
        key={`hdr-${minuteId}`}
        minuteId={minuteId}
        initialTitle={title || "Untitled minute"}
        stageName={stageName}
        currentStageId={currentStageId}
        stages={stages}
        createdAt={createdAt}
        updatedAt={updatedAt}
      />

      {/* Notion-like editor body (inline + inside Editor inserts cards) */}
      <div className="mx-auto w-full max-w-[986px] px-2 py-6">
        <Suspense fallback={<div className="text-sm text-muted-foreground">Loading editor…</div>}>
          <Editor key={`ed-${minuteId}`} minuteId={minuteId} initialHTML={initialHTML || ""} user={user} />
        </Suspense>
      </div>

      {/* Floating Add Button */}
      <FloatingAddButton minuteId={minuteId} />
    </div>
  );
}

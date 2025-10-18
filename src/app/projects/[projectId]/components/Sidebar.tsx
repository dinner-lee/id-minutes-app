"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function Sidebar({
  projectId,
  title,
  purpose,
  minutes,
  activeMinuteId,
}: {
  projectId: string;
  title: string;
  purpose?: string | null;
  minutes: { id: string; title: string; updatedAt: string | Date }[];
  activeMinuteId?: string | null;
}) {
  return (
    <aside className="w-72 shrink-0 border-r bg-white/70 backdrop-blur h-[100dvh] flex flex-col">
      <div className="p-4 border-b">
        <h2 className="font-semibold text-lg truncate">{title}</h2>
        {purpose ? (
          <p className="text-xs text-muted-foreground line-clamp-2">{purpose}</p>
        ) : null}
      </div>
      <div className="p-4">
        <CreateMinuteButton projectId={projectId} />
      </div>
      <MinutesList projectId={projectId} minutes={minutes} activeId={activeMinuteId} />
    </aside>
  );
}

function MinutesList({
  projectId,
  minutes,
  activeId,
}: {
  projectId: string;
  minutes: { id: string; title: string; updatedAt: string | Date }[];
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
    <ul className="px-2 space-y-1 overflow-y-auto flex-1">
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

function CreateMinuteButton({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [creating, setCreating] = useState(false);

  async function onCreate() {
    try {
      setCreating(true);
      const res = await fetch(`/api/projects/${projectId}/minutes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Untitled minute", stageId: null }),
      });
      const data = await res.json();
      if (!res.ok || !data?.minute?.id) throw new Error(data?.error || "Create failed");
      const newId = data.minute.id as string;
      startTransition(() => {
        router.replace(`/projects/${projectId}?minuteId=${newId}`);
        router.refresh();
      });
    } catch (e) {
      console.error(e);
      alert("Failed to create minute. See console.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <button
      onClick={onCreate}
      disabled={creating || pending}
      className="w-full inline-flex items-center justify-center rounded-md border px-3 py-2 text-sm font-medium bg-background text-foreground hover:bg-accent hover:text-accent-foreground"
    >
      {creating || pending ? "Creating…" : "Create new minute"}
    </button>
  );
}

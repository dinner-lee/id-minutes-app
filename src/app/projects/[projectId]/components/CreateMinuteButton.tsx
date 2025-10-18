"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export default function CreateMinuteButton({ projectId, big = false }: { projectId: string; big?: boolean }) {
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

  const base =
    "inline-flex items-center justify-center rounded-md border px-3 py-2 text-sm font-medium";
  const primary =
    "bg-primary text-primary-foreground hover:bg-primary/90 border-transparent";
  const secondary =
    "bg-background text-foreground hover:bg-accent hover:text-accent-foreground";

  return (
    <button
      onClick={onCreate}
      disabled={creating || pending}
      className={`${base} ${big ? primary : secondary} w-full`}
    >
      {creating || pending ? "Creating…" : "Create new minute"}
    </button>
  );
}

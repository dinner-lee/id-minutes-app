"use client";

import { useEffect, useMemo, useState } from "react";

type Props = {
  minuteId: string;
  initialTitle: string;
  stageName?: string;
  createdAt: Date;
  updatedAt: Date;
};

export function StickyHeader({ minuteId, initialTitle, stageName, createdAt, updatedAt }: Props) {
  const [title, setTitle] = useState(initialTitle || "Untitled minute");
  const [saving, setSaving] = useState<"idle" | "dirty" | "saving">("idle");

  // Debounced autosave for title
  useEffect(() => {
    if (saving === "saving") return;
    const id = setTimeout(async () => {
      if (saving !== "dirty") return;
      setSaving("saving");
      try {
        await fetch(`/api/minutes/${minuteId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title }),
        });
      } finally {
        setSaving("idle");
      }
    }, 600);
    return () => clearTimeout(id);
  }, [title, saving, minuteId]);

  function onInput(e: React.ChangeEvent<HTMLInputElement>) {
    setTitle(e.target.value);
    setSaving("dirty");
  }

  const createdText = useMemo(() => new Date(createdAt).toLocaleString(), [createdAt]);
  const updatedText = useMemo(() => new Date(updatedAt).toLocaleString(), [updatedAt]);

  return (
    <div className="sticky top-0 z-20 border-b bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="mx-auto w-full max-w-[794px] px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {/* Editable H1-style title */}
            <input
              value={title}
              onChange={onInput}
              placeholder="Untitled minute"
              className="w-full bg-transparent outline-none text-2xl md:text-3xl font-semibold tracking-tight"
            />

            {/* Dates */}
            <div className="mt-1 text-xs text-muted-foreground flex items-center gap-2">
              <span>Created {createdText}</span>
              <span>•</span>
              <span>Updated {updatedText}</span>
              {saving === "saving" ? <span>• saving…</span> : null}
            </div>
          </div>

          {/* Stage tag (if provided) */}
          {stageName ? (
            <span className="shrink-0 mt-1 inline-flex items-center rounded-full border px-3 py-1 text-xs bg-white">
              {stageName}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

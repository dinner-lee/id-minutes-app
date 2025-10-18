"use client";

import useSWR from "swr";
import BlockCard from "./BlockCard";
import { usePanelStore } from "./panelStore";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function BlocksList({ minuteId }: { minuteId: string }) {
  const { data, error, isLoading, mutate } = useSWR<{ ok: boolean; minute: any }>(
    `/api/minutes/${minuteId}`,
    fetcher
  );
  const clear = usePanelStore((s) => s.clear);

  if (error) return <div className="text-sm text-red-600">Failed to load blocks</div>;
  if (isLoading || !data) return <div className="text-sm text-muted-foreground">Loading blocks…</div>;
  const blocks = data.minute.blocks || [];

  return (
    <div className="mx-auto w-full max-w-4xl px-4 pb-10">
      <h4 className="text-sm font-medium mb-2">Attachments</h4>
      <div className="grid gap-3 md:grid-cols-2">
        {blocks.map((b: any) => (
          <BlockCard
            key={b.id}
            block={{
              id: b.id,
              type: b.type,
              title: b.title,
              url: b.url,
              providerTag: b.providerTag,
              thumbnailUrl: b.thumbnailUrl,
              purpose: b.purpose,
              isRemix: b.isRemix,
              createdAt: b.createdAt,
              updatedAt: b.updatedAt,
              createdBy: b.createdBy,
              chat: b.chat,
              file: b.file,
            }}
            onDeleted={() => {
              clear();
              mutate(); // refresh after delete
            }}
          />
        ))}
      </div>
    </div>
  );
}

/** Hook for children to force refresh (e.g., after Add) */
export function useBlocksMutate(minuteId: string) {
  const key = `/api/minutes/${minuteId}`;
  return () => (window as any).swr_mutate?.(key);
}

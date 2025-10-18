"use client";

import { useState } from "react";
import { usePanelStore, type BlockRec } from "./panelStore";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, Info, Link as LinkIcon, MessageSquare, FileText } from "lucide-react";

function blockIcon(type: BlockRec["type"]) {
  switch (type) {
    case "CHATGPT":
      return <MessageSquare className="h-4 w-4" />;
    case "WEBSITE":
      return <LinkIcon className="h-4 w-4" />;
    case "FILE":
      return <FileText className="h-4 w-4" />;
    default:
      return null;
  }
}

export default function BlockCard({
  block,
  onDeleted,
}: {
  block: BlockRec;
  onDeleted?: (id: string) => void;
}) {
  const open = usePanelStore((s) => s.openWith);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm("Delete this attachment?")) return;
    try {
      setDeleting(true);
      const res = await fetch(`/api/blocks/${block.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Delete failed");
      onDeleted?.(block.id);
    } catch (e) {
      console.error(e);
      alert("Failed to delete. See console.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Card className="relative group">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          {blockIcon(block.type)}
          <CardTitle className="text-base truncate">
            {block.title || (block.type === "WEBSITE" ? block.url : "Untitled")}
          </CardTitle>
        </div>
        <div className="mt-2 flex items-center gap-2 flex-wrap">
          <Badge variant="secondary">{block.type}</Badge>
          {block.providerTag ? <Badge variant="outline">{block.providerTag}</Badge> : null}
          {block.purpose ? <Badge>{block.purpose}</Badge> : null}
          {block.isRemix ? <Badge variant="destructive">Remixed</Badge> : null}
          {/* User attribution badge */}
          {block.createdBy && (
            <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
              Added by {block.createdBy.name || block.createdBy.email?.split('@')[0] || 'Unknown'}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {block.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={block.thumbnailUrl}
            alt={block.title || "thumbnail"}
            className="rounded-md border max-h-40 object-cover w-full"
          />
        ) : null}

        {block.url ? (
          <a
            href={block.url}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-blue-600 hover:underline inline-flex items-center gap-1 mt-2"
          >
            <LinkIcon className="h-3 w-3" /> Open link
          </a>
        ) : null}

        {block.chat?.notes ? (
          <p className="text-sm text-muted-foreground mt-2 line-clamp-3">
            {block.chat.notes}
          </p>
        ) : null}

        <div className="flex justify-end gap-2 mt-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => open(block)}
            className="inline-flex items-center gap-1"
          >
            <Info className="h-4 w-4" /> Details
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={deleting}
            className="inline-flex items-center gap-1"
          >
            <Trash2 className="h-4 w-4" />
            {deleting ? "Deleting…" : "Delete"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

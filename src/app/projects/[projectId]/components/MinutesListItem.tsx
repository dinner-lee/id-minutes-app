"use client";

import Link from "next/link";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

type Props = {
  projectId: string;
  minute: { id: string; title: string; updatedAt: Date; markdown?: string | null };
  href: string;
  active: boolean;
};

export function MinutesListItem({ projectId, minute, href, active }: Props) {
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    if (!confirm("Are you sure you want to delete this minute? This action cannot be undone.")) {
      return;
    }

    try {
      setIsDeleting(true);
      const res = await fetch(`/api/minutes/${minute.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        // Redirect to project page without the deleted minute
        router.push(`/projects/${projectId}`);
        router.refresh();
      } else {
        alert("Failed to delete minute");
      }
    } catch (err) {
      console.error("Error deleting minute:", err);
      alert("Failed to delete minute");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <li className="group relative">
      <Link
        href={href}
        className={`block rounded-md px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground ${
          active ? "bg-accent text-accent-foreground" : ""
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="truncate">{minute.title || "Untitled minute"}</div>
            <div className="text-[10px] text-muted-foreground">
              Updated {new Date(minute.updatedAt).toLocaleString()}
            </div>
          </div>
          
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="shrink-0 p-1 rounded hover:bg-destructive/10 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label="Delete minute"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </Link>
    </li>
  );
}


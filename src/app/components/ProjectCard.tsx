"use client";

import Link from "next/link";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type ProjectCardProps = {
  project: {
    id: string;
    title: string;
    purpose: string;
    updatedAt: Date;
    startDate: Date;
    endDate: Date;
    _count: {
      minutes: number;
      memberships: number;
    };
  };
};

export function ProjectCard({ project }: ProjectCardProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    if (!confirm("Are you sure you want to delete this project? This action cannot be undone. All minutes and data will be permanently deleted.")) {
      return;
    }

    try {
      setIsDeleting(true);
      const res = await fetch(`/api/projects/${project.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        router.refresh();
      } else {
        alert("Failed to delete project");
      }
    } catch (err) {
      console.error("Error deleting project:", err);
      alert("Failed to delete project");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <li className="rounded-xl border bg-white p-4 hover:shadow-sm transition">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold truncate">{project.title}</h3>
          <p className="text-sm text-muted-foreground line-clamp-2">{project.purpose}</p>
        </div>
        <div className="flex items-start gap-2">
          <span className="shrink-0 text-[11px] text-muted-foreground">
            Updated {new Date(project.updatedAt).toLocaleDateString()}
          </span>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="shrink-0 p-1 rounded hover:bg-destructive/10 text-destructive transition-colors disabled:opacity-50"
            aria-label="Delete project"
            title="Delete project"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
        <span>
          {project._count.minutes} minute{project._count.minutes === 1 ? "" : "s"}
        </span>
        <span>
          {project._count.memberships + 1} member
          {project._count.memberships + 1 === 1 ? "" : "s"}
        </span>
        <span>
          {new Date(project.startDate).toLocaleDateString()} →{" "}
          {new Date(project.endDate).toLocaleDateString()}
        </span>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <Link
          href={`/projects/${project.id}`}
          className="inline-flex items-center rounded-md border px-3 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
        >
          Open workspace
        </Link>
        <Link
          href={`/projects/new/step3?projectId=${project.id}`}
          className="inline-flex items-center rounded-md border px-3 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
          title="Adjust model timeline"
        >
          Edit timeline
        </Link>
      </div>
    </li>
  );
}


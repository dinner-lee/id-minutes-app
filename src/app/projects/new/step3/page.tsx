import Step3Client from "./step3-client";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export default async function Step3Page({
  searchParams,
}: { searchParams: { projectId?: string } }) {
  const projectId = searchParams.projectId;
  if (!projectId) return <div className="p-6">Missing projectId</div>;

  const models = await prisma.instructionalModel.findMany({ where: { projectId } });
  const savedStages = await prisma.stage.findMany({
    where: { projectId },
    orderBy: { order: "asc" },
  });

  // If no saved stages yet, derive a unique flattened list from models
  let initialStages: { name: string; order: number; plannedDate?: string | null }[] = [];

  if (savedStages.length) {
    initialStages = savedStages.map((s) => ({
      name: s.name,
      order: s.order,
      plannedDate: s.plannedDate ? new Date(s.plannedDate).toISOString().slice(0, 10) : null,
    }));
  } else {
    const names = new Set<string>();
    models.forEach((m) => {
      const arr: string[] = (m.config as any)?.stages ?? [];
      arr.forEach((n) => names.add(n));
    });
    initialStages = Array.from(names).map((n, i) => ({ name: n, order: i }));
  }

  return (
    <Step3Client projectId={projectId} initial={initialStages} />
  );
}

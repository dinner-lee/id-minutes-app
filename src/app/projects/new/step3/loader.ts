import { prisma } from "@/lib/prisma";

export async function loadStep3Data(projectId: string) {
  const models = await prisma.instructionalModel.findMany({ where: { projectId } });
  const stages = await prisma.stage.findMany({
    where: { projectId },
    orderBy: { order: "asc" },
  });
  return { models, stages };
}

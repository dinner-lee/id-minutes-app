/*
  Warnings:

  - A unique constraint covering the columns `[userId,projectId]` on the table `Membership` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "public"."Block" DROP CONSTRAINT "Block_createdById_fkey";

-- DropForeignKey
ALTER TABLE "public"."Block" DROP CONSTRAINT "Block_minuteId_fkey";

-- DropForeignKey
ALTER TABLE "public"."ChatThread" DROP CONSTRAINT "ChatThread_blockId_fkey";

-- DropForeignKey
ALTER TABLE "public"."FileAsset" DROP CONSTRAINT "FileAsset_blockId_fkey";

-- DropForeignKey
ALTER TABLE "public"."InstructionalModel" DROP CONSTRAINT "InstructionalModel_projectId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Membership" DROP CONSTRAINT "Membership_projectId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Membership" DROP CONSTRAINT "Membership_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Minute" DROP CONSTRAINT "Minute_authorId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Minute" DROP CONSTRAINT "Minute_projectId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Project" DROP CONSTRAINT "Project_ownerId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Stage" DROP CONSTRAINT "Stage_projectId_fkey";

-- CreateIndex
CREATE INDEX "Block_minuteId_updatedAt_idx" ON "Block"("minuteId", "updatedAt");

-- CreateIndex
CREATE INDEX "Block_type_idx" ON "Block"("type");

-- CreateIndex
CREATE INDEX "Block_createdById_idx" ON "Block"("createdById");

-- CreateIndex
CREATE INDEX "Block_isRemix_idx" ON "Block"("isRemix");

-- CreateIndex
CREATE INDEX "ChatThread_canonicalId_idx" ON "ChatThread"("canonicalId");

-- CreateIndex
CREATE INDEX "FileAsset_key_idx" ON "FileAsset"("key");

-- CreateIndex
CREATE INDEX "InstructionalModel_projectId_idx" ON "InstructionalModel"("projectId");

-- CreateIndex
CREATE INDEX "InstructionalModel_name_idx" ON "InstructionalModel"("name");

-- CreateIndex
CREATE INDEX "Membership_projectId_idx" ON "Membership"("projectId");

-- CreateIndex
CREATE INDEX "Membership_userId_idx" ON "Membership"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Membership_userId_projectId_key" ON "Membership"("userId", "projectId");

-- CreateIndex
CREATE INDEX "Minute_projectId_updatedAt_idx" ON "Minute"("projectId", "updatedAt");

-- CreateIndex
CREATE INDEX "Minute_authorId_idx" ON "Minute"("authorId");

-- CreateIndex
CREATE INDEX "Minute_stageId_idx" ON "Minute"("stageId");

-- CreateIndex
CREATE INDEX "Project_ownerId_idx" ON "Project"("ownerId");

-- CreateIndex
CREATE INDEX "Project_updatedAt_idx" ON "Project"("updatedAt");

-- CreateIndex
CREATE INDEX "Stage_projectId_order_idx" ON "Stage"("projectId", "order");

-- CreateIndex
CREATE INDEX "Stage_plannedDate_idx" ON "Stage"("plannedDate");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstructionalModel" ADD CONSTRAINT "InstructionalModel_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stage" ADD CONSTRAINT "Stage_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Minute" ADD CONSTRAINT "Minute_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Minute" ADD CONSTRAINT "Minute_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Block" ADD CONSTRAINT "Block_minuteId_fkey" FOREIGN KEY ("minuteId") REFERENCES "Minute"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Block" ADD CONSTRAINT "Block_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatThread" ADD CONSTRAINT "ChatThread_blockId_fkey" FOREIGN KEY ("blockId") REFERENCES "Block"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FileAsset" ADD CONSTRAINT "FileAsset_blockId_fkey" FOREIGN KEY ("blockId") REFERENCES "Block"("id") ON DELETE CASCADE ON UPDATE CASCADE;

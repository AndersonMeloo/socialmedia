/*
  Warnings:

  - You are about to drop the column `nichedId` on the `Post` table. All the data in the column will be lost.
  - Added the required column `nicheId` to the `Post` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Post" DROP CONSTRAINT "Post_nichedId_fkey";

-- AlterTable
ALTER TABLE "Post" DROP COLUMN "nichedId",
ADD COLUMN     "nicheId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_nicheId_fkey" FOREIGN KEY ("nicheId") REFERENCES "Niche"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

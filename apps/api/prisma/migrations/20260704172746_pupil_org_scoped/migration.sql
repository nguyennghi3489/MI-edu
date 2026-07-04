-- DropForeignKey
ALTER TABLE "pupils" DROP CONSTRAINT "pupils_class_id_fkey";

-- DropIndex
DROP INDEX "pupils_class_id_student_number_key";

-- AlterTable
ALTER TABLE "pupils" DROP COLUMN "class_id",
ADD COLUMN     "org_id" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "enrollments" (
    "id" TEXT NOT NULL,
    "class_id" TEXT NOT NULL,
    "pupil_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "enrollments_class_id_pupil_id_key" ON "enrollments"("class_id", "pupil_id");

-- CreateIndex
CREATE UNIQUE INDEX "pupils_org_id_student_number_key" ON "pupils"("org_id", "student_number");

-- AddForeignKey
ALTER TABLE "pupils" ADD CONSTRAINT "pupils_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_pupil_id_fkey" FOREIGN KEY ("pupil_id") REFERENCES "pupils"("id") ON DELETE CASCADE ON UPDATE CASCADE;

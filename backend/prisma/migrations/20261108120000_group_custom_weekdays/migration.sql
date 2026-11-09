-- Custom weekdays (1 = Monday ... 7 = Sunday) for groups that are not on the toq/juft rhythm.
ALTER TABLE "teacher_groups" ADD COLUMN     "weekdays" INTEGER[] DEFAULT ARRAY[]::INTEGER[];

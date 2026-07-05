import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// ponytail: only one teacher per org today, so teacher.plan is the whole plan source.
// #20 will resolve org.plan here instead — this is the one place that needs to change.
const FREE_LIMITS = {
  lessons: 10,
  classes: 1,
  pupils: 10,
  questionsPerLesson: 10,
} as const;

type Resource = keyof typeof FREE_LIMITS;

@Injectable()
export class PlanLimitsService {
  constructor(private readonly prisma: PrismaService) {}

  async assert(teacherId: string, resource: Resource, currentCount: number) {
    const teacher = await this.prisma.teacher.findUniqueOrThrow({ where: { id: teacherId } });
    if (teacher.plan !== 'free') return;
    const limit = FREE_LIMITS[resource];
    if (currentCount >= limit) throw new ForbiddenException({ code: 'PLAN_LIMIT', limit });
  }
}

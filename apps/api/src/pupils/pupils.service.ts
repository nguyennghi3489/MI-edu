import { ConflictException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PlanLimitsService } from '../plan-limits/plan-limits.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePupilDto } from './dto';

@Injectable()
export class PupilsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly planLimits: PlanLimitsService,
  ) {}

  // ponytail: every teacher has exactly one org today (default-org-per-teacher, #2) —
  // findFirst is safe until #20 lands multi-org membership, which needs an org switcher instead.
  private async orgId(teacherId: string) {
    const membership = await this.prisma.orgMembership.findFirstOrThrow({
      where: { teacherId },
      select: { orgId: true },
    });
    return membership.orgId;
  }

  async list(teacherId: string) {
    const orgId = await this.orgId(teacherId);
    const pupils = await this.prisma.pupil.findMany({
      where: { orgId },
      orderBy: { name: 'asc' },
      include: { enrollments: { include: { class: { select: { id: true, name: true } } } } },
    });
    return pupils.map(({ enrollments, ...p }) => ({ ...p, classes: enrollments.map((e) => e.class) }));
  }

  async create(teacherId: string, dto: CreatePupilDto) {
    const orgId = await this.orgId(teacherId);
    const count = await this.prisma.pupil.count({ where: { orgId } });
    await this.planLimits.assert(teacherId, 'pupils', count);
    try {
      return await this.prisma.pupil.create({ data: { ...dto, orgId } });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('Số thứ tự đã tồn tại trong trường');
      }
      throw e;
    }
  }
}

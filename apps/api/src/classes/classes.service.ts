import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PlanLimitsService } from '../plan-limits/plan-limits.service';
import { PrismaService } from '../prisma/prisma.service';
import { PupilsService } from '../pupils/pupils.service';
import { BulkAddPupilsDto, CreateClassDto, CreatePupilDto } from './dto';

@Injectable()
export class ClassesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pupils: PupilsService,
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
    const classes = await this.prisma.class.findMany({
      where: { teacherId },
      orderBy: { createdAt: 'asc' },
      include: {
        _count: { select: { enrollments: true } },
        assignments: { orderBy: { createdAt: 'desc' }, take: 1, select: { createdAt: true } },
      },
    });
    return classes.map(({ assignments, _count, ...c }) => ({
      ...c,
      pupilCount: _count.enrollments,
      lastActivity: assignments[0]?.createdAt ?? null,
    }));
  }

  async create(teacherId: string, dto: CreateClassDto) {
    const count = await this.prisma.class.count({ where: { teacherId, isDefault: false } });
    await this.planLimits.assert(teacherId, 'classes', count);
    return this.prisma.class.create({ data: { ...dto, teacherId } });
  }

  async detail(teacherId: string, id: string) {
    const klass = await this.prisma.class.findUnique({
      where: { id },
      include: { enrollments: { include: { pupil: true }, orderBy: { pupil: { name: 'asc' } } } },
    });
    if (!klass || klass.teacherId !== teacherId) {
      throw new NotFoundException('Không tìm thấy lớp học');
    }
    const { enrollments, ...rest } = klass;
    return { ...rest, pupils: enrollments.map((e) => e.pupil) };
  }

  // "Tạo mới" flow in the class roster: create a brand-new org pupil and enroll them here in one step.
  async addPupil(teacherId: string, classId: string, dto: CreatePupilDto) {
    await this.assertOwnClass(teacherId, classId);
    const pupil = await this.pupils.create(teacherId, dto);
    await this.prisma.enrollment.create({ data: { classId, pupilId: pupil.id } });
    return pupil;
  }

  // "Chọn có sẵn" flow: enroll a pupil that already exists in the org's roster.
  async enrollPupil(teacherId: string, classId: string, pupilId: string) {
    await this.assertOwnClass(teacherId, classId);
    const orgId = await this.orgId(teacherId);
    const pupil = await this.prisma.pupil.findUnique({ where: { id: pupilId } });
    if (!pupil || pupil.orgId !== orgId) {
      throw new NotFoundException('Không tìm thấy học sinh');
    }
    try {
      return await this.prisma.enrollment.create({ data: { classId, pupilId } });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('Học sinh đã có trong lớp này');
      }
      throw e;
    }
  }

  // ponytail: sequential per-row upsert+enroll, O(rows) queries — fine for classroom-sized CSVs
  // (dozens of rows); batch it only if teachers start importing hundreds at once.
  async bulkAddPupils(teacherId: string, classId: string, dto: BulkAddPupilsDto) {
    await this.assertOwnClass(teacherId, classId);
    const orgId = await this.orgId(teacherId);
    // ponytail: checked once up front, not per-row — a CSV that starts under the cap can still push
    // the org over it; tighten to per-row accounting if free teachers start gaming this.
    const count = await this.prisma.pupil.count({ where: { orgId } });
    await this.planLimits.assert(teacherId, 'pupils', count);
    let enrolled = 0;
    let skipped = 0;
    for (const p of dto.pupils) {
      const pupil = await this.prisma.pupil.upsert({
        where: { orgId_studentNumber: { orgId, studentNumber: p.studentNumber } },
        update: {},
        create: { orgId, name: p.name, studentNumber: p.studentNumber },
      });
      try {
        await this.prisma.enrollment.create({ data: { classId, pupilId: pupil.id } });
        enrolled++;
      } catch (e) {
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
          skipped++;
        } else {
          throw e;
        }
      }
    }
    return { enrolled, skipped };
  }

  private async assertOwnClass(teacherId: string, id: string) {
    const klass = await this.prisma.class.findUnique({ where: { id } });
    if (!klass || klass.teacherId !== teacherId) {
      throw new NotFoundException('Không tìm thấy lớp học');
    }
    return klass;
  }
}

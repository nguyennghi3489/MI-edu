import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAssignmentDto } from './dto';

@Injectable()
export class AssignmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(teacherId: string, dto: CreateAssignmentDto) {
    await this.assertOwnLesson(teacherId, dto.lessonId);
    await this.assertOwnClass(teacherId, dto.classId);
    const id = randomUUID();
    const [, assignment] = await this.prisma.$transaction([
      this.prisma.lesson.update({ where: { id: dto.lessonId }, data: { isLocked: true } }),
      this.prisma.assignment.create({
        data: {
          id,
          lessonId: dto.lessonId,
          classId: dto.classId,
          teacherId,
          shareLink: `/play?a=${id}`,
          dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        },
      }),
    ]);
    return assignment;
  }

  async updateDueDate(teacherId: string, id: string, dueDate: string | null) {
    const assignment = await this.assertOwn(teacherId, id);
    return this.prisma.assignment.update({
      where: { id: assignment.id },
      data: { dueDate: dueDate ? new Date(dueDate) : null },
    });
  }

  private async assertOwn(teacherId: string, id: string) {
    const assignment = await this.prisma.assignment.findUnique({ where: { id } });
    if (!assignment || assignment.teacherId !== teacherId) {
      throw new NotFoundException('Không tìm thấy bài giao');
    }
    return assignment;
  }

  private async assertOwnLesson(teacherId: string, id: string) {
    const lesson = await this.prisma.lesson.findUnique({ where: { id } });
    if (!lesson || lesson.teacherId !== teacherId) {
      throw new NotFoundException('Không tìm thấy bài học');
    }
    return lesson;
  }

  private async assertOwnClass(teacherId: string, id: string) {
    const cls = await this.prisma.class.findUnique({ where: { id } });
    if (!cls || cls.teacherId !== teacherId) {
      throw new NotFoundException('Không tìm thấy lớp học');
    }
    return cls;
  }
}

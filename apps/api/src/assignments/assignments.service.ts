import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAssignmentDto, EnterAssignmentDto } from './dto';

@Injectable()
export class AssignmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

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

  async getPublic(id: string) {
    const assignment = await this.prisma.assignment.findUnique({
      where: { id },
      include: { lesson: { include: { _count: { select: { questions: true } } } } },
    });
    if (!assignment) throw new NotFoundException('Không tìm thấy bài giao');
    // class-average past score — games use it to pace the ghost/opponent
    const avg = await this.prisma.gameResult.aggregate({
      where: { assignmentId: id },
      _avg: { totalScore: true },
    });
    return {
      title: assignment.lesson.title,
      subject: assignment.lesson.subject,
      questionCount: assignment.lesson._count.questions,
      gameFormat: assignment.lesson.gameFormat,
      gameTimeSec: assignment.lesson.gameTimeSec,
      avgScore: avg._avg.totalScore,
    };
  }

  async enter(id: string, dto: EnterAssignmentDto) {
    const assignment = await this.prisma.assignment.findUnique({
      where: { id },
      include: { class: { include: { enrollments: { include: { pupil: true } } } } },
    });
    if (!assignment) throw new NotFoundException('Không tìm thấy bài giao');
    if (assignment.dueDate && assignment.dueDate < new Date()) {
      throw new ForbiddenException('Bài tập đã hết hạn');
    }

    let pupilId: string | undefined;
    const roster = assignment.class.enrollments.map((e) => e.pupil);
    if (roster.length > 0) {
      const pupil = roster.find((p) => p.studentNumber === dto.studentNumber);
      if (!pupil) throw new BadRequestException('Không tìm thấy số thứ tự trong lớp');
      pupilId = pupil.id;
    }

    return {
      accessToken: this.jwt.sign({ assignmentId: id, pupilId }, { expiresIn: '2h' }),
    };
  }

  async getQuestions(id: string, token: string) {
    let payload: { assignmentId: string };
    try {
      payload = this.jwt.verify(token);
    } catch {
      throw new UnauthorizedException();
    }
    if (payload.assignmentId !== id) throw new UnauthorizedException();

    const assignment = await this.prisma.assignment.findUnique({
      where: { id },
      include: { lesson: { include: { questions: { orderBy: { order: 'asc' } } } } },
    });
    if (!assignment) throw new NotFoundException('Không tìm thấy bài giao');
    return assignment.lesson.questions;
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

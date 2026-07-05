import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PlanLimitsService } from '../plan-limits/plan-limits.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLessonDto, CreateQuestionDto, UpdateLessonDto } from './dto';

// MCQ/True-False shape isn't enforced by the `config jsonb` column — check it here at the trust boundary.
function validateQuestionConfig(type: string, config: Record<string, unknown>) {
  if (type === 'mcq') {
    const options = config.options;
    if (
      !Array.isArray(options) ||
      options.length !== 4 ||
      !options.every((o) => typeof o === 'string' && o.length > 0)
    ) {
      throw new BadRequestException('Câu hỏi trắc nghiệm cần đúng 4 lựa chọn');
    }
    if (typeof config.correct !== 'number' || config.correct < 0 || config.correct > 3) {
      throw new BadRequestException('Cần chỉ số đáp án đúng (0-3)');
    }
  } else if (type === 'true-false') {
    if (typeof config.correct !== 'boolean') {
      throw new BadRequestException('Câu hỏi đúng-sai cần đáp án đúng dạng boolean');
    }
  }
}

@Injectable()
export class LessonsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly planLimits: PlanLimitsService,
  ) {}

  list(teacherId: string) {
    return this.prisma.lesson.findMany({
      where: { teacherId },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { questions: true } } },
    });
  }

  async detail(teacherId: string, id: string) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id },
      include: {
        questions: { orderBy: { order: 'asc' } },
        assignments: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!lesson || lesson.teacherId !== teacherId) {
      throw new NotFoundException('Không tìm thấy bài học');
    }
    return lesson;
  }

  async duplicate(teacherId: string, id: string) {
    const lesson = await this.assertOwnLesson(teacherId, id);
    const count = await this.prisma.lesson.count({ where: { teacherId } });
    await this.planLimits.assert(teacherId, 'lessons', count);
    const questions = await this.prisma.question.findMany({ where: { lessonId: id }, orderBy: { order: 'asc' } });
    return this.prisma.lesson.create({
      data: {
        teacherId,
        title: `${lesson.title} (bản sao)`,
        subject: lesson.subject,
        grade: lesson.grade,
        gameFormat: lesson.gameFormat,
        questions: {
          create: questions.map((q) => ({
            order: q.order,
            type: q.type,
            text: q.text,
            imageUrl: q.imageUrl,
            timeLimitSec: q.timeLimitSec,
            config: q.config as Prisma.InputJsonValue,
          })),
        },
      },
      include: { questions: true },
    });
  }

  async create(teacherId: string, dto: CreateLessonDto) {
    const count = await this.prisma.lesson.count({ where: { teacherId } });
    await this.planLimits.assert(teacherId, 'lessons', count);
    return this.prisma.lesson.create({ data: { ...dto, teacherId } });
  }

  async update(teacherId: string, id: string, dto: UpdateLessonDto) {
    await this.assertOwnLesson(teacherId, id);
    return this.prisma.lesson.update({ where: { id }, data: dto });
  }

  async remove(teacherId: string, id: string) {
    await this.assertOwnLesson(teacherId, id);
    await this.prisma.lesson.delete({ where: { id } });
  }

  async addQuestion(teacherId: string, lessonId: string, dto: CreateQuestionDto) {
    const lesson = await this.assertOwnLesson(teacherId, lessonId);
    if (lesson.isLocked) {
      throw new ForbiddenException('Bài học đã được giao, không thể chỉnh sửa câu hỏi');
    }
    validateQuestionConfig(dto.type, dto.config);
    const questionCount = await this.prisma.question.count({ where: { lessonId } });
    await this.planLimits.assert(teacherId, 'questionsPerLesson', questionCount);
    const last = await this.prisma.question.findFirst({
      where: { lessonId },
      orderBy: { order: 'desc' },
    });
    return this.prisma.question.create({
      data: {
        ...dto,
        config: dto.config as Prisma.InputJsonValue,
        lessonId,
        order: (last?.order ?? -1) + 1,
      },
    });
  }

  async updateQuestion(teacherId: string, questionId: string, dto: CreateQuestionDto) {
    const question = await this.findOwnedQuestion(teacherId, questionId);
    if (question.lesson.isLocked) {
      throw new ForbiddenException('Bài học đã được giao, không thể chỉnh sửa câu hỏi');
    }
    validateQuestionConfig(dto.type, dto.config);
    return this.prisma.question.update({
      where: { id: questionId },
      data: { ...dto, config: dto.config as Prisma.InputJsonValue },
    });
  }

  async removeQuestion(teacherId: string, questionId: string) {
    const question = await this.findOwnedQuestion(teacherId, questionId);
    if (question.lesson.isLocked) {
      throw new ForbiddenException('Bài học đã được giao, không thể chỉnh sửa câu hỏi');
    }
    await this.prisma.question.delete({ where: { id: question.id } });
  }

  async reorderQuestion(teacherId: string, questionId: string, newOrder: number) {
    const question = await this.findOwnedQuestion(teacherId, questionId);
    if (question.lesson.isLocked) {
      throw new ForbiddenException('Bài học đã được giao, không thể chỉnh sửa câu hỏi');
    }
    const siblings = await this.prisma.question.findMany({
      where: { lessonId: question.lessonId },
      orderBy: { order: 'asc' },
    });
    const without = siblings.filter((q) => q.id !== questionId);
    const clamped = Math.max(0, Math.min(newOrder, without.length));
    without.splice(clamped, 0, question);
    await this.prisma.$transaction(
      without.map((q, i) => this.prisma.question.update({ where: { id: q.id }, data: { order: i } })),
    );
  }

  private async assertOwnLesson(teacherId: string, id: string) {
    const lesson = await this.prisma.lesson.findUnique({ where: { id } });
    if (!lesson || lesson.teacherId !== teacherId) {
      throw new NotFoundException('Không tìm thấy bài học');
    }
    return lesson;
  }

  private async findOwnedQuestion(teacherId: string, questionId: string) {
    const question = await this.prisma.question.findUnique({
      where: { id: questionId },
      include: { lesson: true },
    });
    if (!question || question.lesson.teacherId !== teacherId) {
      throw new NotFoundException('Không tìm thấy câu hỏi');
    }
    return question;
  }
}

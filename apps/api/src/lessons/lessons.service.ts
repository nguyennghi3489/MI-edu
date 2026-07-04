import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
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
  constructor(private readonly prisma: PrismaService) {}

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
      include: { questions: { orderBy: { order: 'asc' } } },
    });
    if (!lesson || lesson.teacherId !== teacherId) {
      throw new NotFoundException('Không tìm thấy bài học');
    }
    return lesson;
  }

  create(teacherId: string, dto: CreateLessonDto) {
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
    await this.assertOwnLesson(teacherId, lessonId);
    validateQuestionConfig(dto.type, dto.config);
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

  async removeQuestion(teacherId: string, questionId: string) {
    const question = await this.findOwnedQuestion(teacherId, questionId);
    await this.prisma.question.delete({ where: { id: question.id } });
  }

  async reorderQuestion(teacherId: string, questionId: string, newOrder: number) {
    const question = await this.findOwnedQuestion(teacherId, questionId);
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

import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SubmitResultDto } from './dto';

export interface AccuracyRow {
  questionId: string;
  text: string;
  order: number;
  totalAttempts: number;
  accuracyPct: number;
}

@Injectable()
export class ResultsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async submit(token: string, dto: SubmitResultDto) {
    let payload: { assignmentId: string; pupilId?: string };
    try {
      payload = this.jwt.verify(token);
    } catch {
      throw new UnauthorizedException();
    }
    if (payload.assignmentId !== dto.assignmentId) throw new UnauthorizedException();

    const data = {
      assignmentId: dto.assignmentId,
      pupilId: payload.pupilId,
      studentName: dto.studentName,
      studentNumber: dto.studentNumber,
      totalScore: dto.totalScore,
      totalCorrect: dto.totalCorrect,
      totalQuestions: dto.totalQuestions,
      answers: {
        create: dto.answers.map((a) => ({
          questionId: a.questionId,
          answer: a.answer as Prisma.InputJsonValue,
          correct: a.correct,
          timeMs: a.timeMs,
        })),
      },
    };

    // personal best: a rostered pupil keeps only their highest-scoring run;
    // free-text (no pupilId) submissions are never deduped
    if (payload.pupilId) {
      const existing = await this.prisma.gameResult.findUnique({
        where: { assignmentId_pupilId: { assignmentId: dto.assignmentId, pupilId: payload.pupilId } },
      });
      if (existing) {
        if (dto.totalScore <= existing.totalScore) return existing;
        // ponytail: delete+create replaces the run atomically; ResultAnswer cascade wipes old answers
        const [, created] = await this.prisma.$transaction([
          this.prisma.gameResult.delete({ where: { id: existing.id } }),
          this.prisma.gameResult.create({ data }),
        ]);
        return created;
      }
    }
    return this.prisma.gameResult.create({ data });
  }

  async findByAssignment(teacherId: string, assignmentId: string) {
    await this.assertOwn(teacherId, assignmentId);
    const students = await this.prisma.gameResult.findMany({
      where: { assignmentId },
      orderBy: { completedAt: 'desc' },
    });
    const submissions = students.length;
    const avgScore = submissions ? students.reduce((s, r) => s + r.totalScore, 0) / submissions : 0;
    const avgAccuracy = submissions
      ? students.reduce((s, r) => s + r.totalCorrect / r.totalQuestions, 0) / submissions
      : 0;
    return { submissions, avgScore, avgAccuracy, students };
  }

  async accuracy(teacherId: string, assignmentId: string) {
    await this.assertOwn(teacherId, assignmentId);
    return this.prisma.$queryRaw<AccuracyRow[]>`
      SELECT q.id as "questionId", q.text, q."order" as "order",
             COALESCE(qa.total_attempts, 0)::int as "totalAttempts",
             COALESCE(qa.accuracy_pct, 0)::float as "accuracyPct"
      FROM questions q
      JOIN lessons l ON q.lesson_id = l.id
      JOIN assignments a ON a.lesson_id = l.id
      LEFT JOIN question_accuracy qa ON qa.question_id = q.id AND qa.assignment_id = a.id
      WHERE a.id = ${assignmentId}
      ORDER BY q."order" ASC
    `;
  }

  private async assertOwn(teacherId: string, assignmentId: string) {
    const assignment = await this.prisma.assignment.findUnique({ where: { id: assignmentId } });
    if (!assignment || assignment.teacherId !== teacherId) {
      throw new NotFoundException('Không tìm thấy bài giao');
    }
    return assignment;
  }
}

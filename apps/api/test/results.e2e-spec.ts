import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

// Runs against the local dev DB (docker compose up -d in apps/api)
describe('Results (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const email = `e2e-results-${Date.now()}@test.local`;
  const password = 'secret123';
  let token: string;
  let classId: string;
  let lessonId: string;
  let questionId: string;
  let assignmentId: string;
  let gameToken: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();
    prisma = app.get(PrismaService);

    const signup = await request(app.getHttpServer())
      .post('/api/auth/signup')
      .send({ email, password, name: 'Cô Hoa' });
    token = signup.body.accessToken;

    const classes = await request(app.getHttpServer())
      .get('/api/classes')
      .set('Authorization', `Bearer ${token}`);
    classId = classes.body[0].id;

    const lesson = await request(app.getHttpServer())
      .post('/api/lessons')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Phép cộng', subject: 'Toán', grade: '2', gameFormat: 'quiz' });
    lessonId = lesson.body.id;

    const question = await request(app.getHttpServer())
      .post(`/api/lessons/${lessonId}/questions`)
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'true-false', text: '1 + 1 = 2', config: { correct: true } });
    questionId = question.body.id;

    const assignment = await request(app.getHttpServer())
      .post('/api/assignments')
      .set('Authorization', `Bearer ${token}`)
      .send({ lessonId, classId });
    assignmentId = assignment.body.id;

    // rostered pupil, not free-text — free-text (null pupilId) submissions aren't deduped by design
    const cls = await prisma.class.findUniqueOrThrow({ where: { id: classId } });
    const membership = await prisma.orgMembership.findFirstOrThrow({ where: { teacherId: cls.teacherId } });
    const pupil = await prisma.pupil.create({ data: { orgId: membership.orgId, name: 'Bé An', studentNumber: '1' } });
    await prisma.enrollment.create({ data: { classId: cls.id, pupilId: pupil.id } });

    const enter = await request(app.getHttpServer())
      .post(`/api/assignments/${assignmentId}/enter`)
      .send({ name: 'Bé An', studentNumber: '1' });
    gameToken = enter.body.accessToken;
  });

  afterAll(async () => {
    const teacher = await prisma.teacher.findUnique({ where: { email } });
    if (teacher) await prisma.assignment.deleteMany({ where: { teacherId: teacher.id } });
    await prisma.teacher.deleteMany({ where: { email } });
    await prisma.organization.deleteMany({ where: { members: { none: {} } } });
    await app.close();
  });

  const submitBody = () => ({
    assignmentId,
    studentName: 'Bé An',
    studentNumber: '1',
    totalScore: 100,
    totalCorrect: 1,
    totalQuestions: 1,
    answers: [{ questionId, answer: true, correct: true, timeMs: 3200 }],
  });

  it('POST /results without a valid token returns 401', () =>
    request(app.getHttpServer()).post('/api/results').send(submitBody()).expect(401));

  it('POST /results writes one game_results row and N result_answers rows', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/results')
      .set('Authorization', `Bearer ${gameToken}`)
      .send(submitBody())
      .expect(201);
    expect(res.body.totalScore).toBe(100);

    const answers = await prisma.resultAnswer.findMany({ where: { gameResultId: res.body.id } });
    expect(answers).toHaveLength(1);
  });

  it('a second POST /results with the same pupil + assignment returns 409', () =>
    request(app.getHttpServer())
      .post('/api/results')
      .set('Authorization', `Bearer ${gameToken}`)
      .send(submitBody())
      .expect(409));

  it('GET /results?assignmentId= returns per-student scores (teacher auth required)', async () => {
    await request(app.getHttpServer()).get(`/api/results?assignmentId=${assignmentId}`).expect(401);

    const res = await request(app.getHttpServer())
      .get(`/api/results?assignmentId=${assignmentId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body.submissions).toBe(1);
    expect(res.body.avgScore).toBe(100);
    expect(res.body.students).toHaveLength(1);
  });

  it('GET /results/accuracy?assignmentId= queries the question_accuracy VIEW', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/results/accuracy?assignmentId=${assignmentId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].questionId).toBe(questionId);
    expect(res.body[0].accuracyPct).toBe(1);
  });
});

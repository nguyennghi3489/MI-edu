import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

// Runs against the local dev DB (docker compose up -d in apps/api)
describe('Assignments (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const email = `e2e-assign-${Date.now()}@test.local`;
  const password = 'secret123';
  let token: string;
  let classId: string;
  let lessonId: string;
  let assignmentId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();
    prisma = app.get(PrismaService);

    const signup = await request(app.getHttpServer())
      .post('/api/auth/signup')
      .send({ email, password, name: 'Cô Lan' });
    token = signup.body.accessToken;

    const classes = await request(app.getHttpServer())
      .get('/api/classes')
      .set('Authorization', `Bearer ${token}`);
    classId = classes.body[0].id;

    const lesson = await request(app.getHttpServer())
      .post('/api/lessons')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Phép trừ', subject: 'Toán', grade: '3', gameFormat: 'quiz' });
    lessonId = lesson.body.id;

    await request(app.getHttpServer())
      .post(`/api/lessons/${lessonId}/questions`)
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'true-false', text: '2 + 2 = 4', config: { correct: true } });
  });

  afterAll(async () => {
    const teacher = await prisma.teacher.findUnique({ where: { email } });
    if (teacher) await prisma.assignment.deleteMany({ where: { teacherId: teacher.id } });
    await prisma.teacher.deleteMany({ where: { email } });
    await prisma.organization.deleteMany({ where: { members: { none: {} } } });
    await app.close();
  });

  it('POST /assignments returns shareLink and locks the lesson', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/assignments')
      .set('Authorization', `Bearer ${token}`)
      .send({ lessonId, classId })
      .expect(201);
    expect(res.body.shareLink).toBe(`/play?a=${res.body.id}`);
    assignmentId = res.body.id;

    const lesson = await request(app.getHttpServer())
      .get(`/api/lessons/${lessonId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(lesson.body.isLocked).toBe(true);
  });

  it('editing questions on a locked lesson returns 403', () =>
    request(app.getHttpServer())
      .post(`/api/lessons/${lessonId}/questions`)
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'true-false', text: 'Blocked', config: { correct: true } })
      .expect(403));

  it('POST /lessons/:id/duplicate creates an unlocked copy', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/lessons/${lessonId}/duplicate`)
      .set('Authorization', `Bearer ${token}`)
      .expect(201);
    expect(res.body.isLocked).toBe(false);
    expect(res.body.title).toContain('Phép trừ');
  });

  it('PATCH /assignments/:id updates dueDate', async () => {
    const dueDate = '2026-08-01T00:00:00.000Z';
    const res = await request(app.getHttpServer())
      .patch(`/api/assignments/${assignmentId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ dueDate })
      .expect(200);
    expect(res.body.dueDate).toBe(dueDate);
  });

  it('GET /assignments/:id/public returns lesson title/subject/questionCount, no answers', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/assignments/${assignmentId}/public`)
      .expect(200);
    expect(res.body).toEqual({ title: 'Phép trừ', subject: 'Toán', questionCount: 1 });
  });

  it('GET /assignments/:id/questions returns the lesson questions for a valid game token', async () => {
    const enter = await request(app.getHttpServer())
      .post(`/api/assignments/${assignmentId}/enter`)
      .send({ name: 'Bé An', studentNumber: '1' })
      .expect(201);

    const res = await request(app.getHttpServer())
      .get(`/api/assignments/${assignmentId}/questions`)
      .set('Authorization', `Bearer ${enter.body.accessToken}`)
      .expect(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].config).toEqual({ correct: true });
  });

  it('GET /assignments/:id/questions returns 401 without a valid token', () =>
    request(app.getHttpServer()).get(`/api/assignments/${assignmentId}/questions`).expect(401));

  it('POST /assignments/:id/enter returns 403 once the due date has passed', async () => {
    await request(app.getHttpServer())
      .patch(`/api/assignments/${assignmentId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ dueDate: '2020-01-01T00:00:00.000Z' })
      .expect(200);

    await request(app.getHttpServer())
      .post(`/api/assignments/${assignmentId}/enter`)
      .send({ name: 'Bé An', studentNumber: '5' })
      .expect(403);
  });

  it('POST /assignments/:id/enter accepts free-text name+number when the roster is empty', async () => {
    // reset dueDate to the future so entry isn't blocked by the expiry set above
    await request(app.getHttpServer())
      .patch(`/api/assignments/${assignmentId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ dueDate: '2099-01-01T00:00:00.000Z' })
      .expect(200);

    const res = await request(app.getHttpServer())
      .post(`/api/assignments/${assignmentId}/enter`)
      .send({ name: 'Bé An', studentNumber: '5' })
      .expect(201);
    expect(res.body.accessToken).toBeTruthy();
  });

  describe('with a non-empty roster', () => {
    let rosterAssignmentId: string;
    let pupilStudentNumber: string;

    beforeAll(async () => {
      const cls = await prisma.class.findUniqueOrThrow({ where: { id: classId } });
      const pupil = await prisma.pupil.create({
        data: { classId: cls.id, name: 'Bé Minh', studentNumber: '12' },
      });
      pupilStudentNumber = pupil.studentNumber;

      const assignment = await request(app.getHttpServer())
        .post('/api/assignments')
        .set('Authorization', `Bearer ${token}`)
        .send({ lessonId, classId })
        .expect(201);
      rosterAssignmentId = assignment.body.id;
    });

    it('returns 400 when the student number is not on the roster', () =>
      request(app.getHttpServer())
        .post(`/api/assignments/${rosterAssignmentId}/enter`)
        .send({ name: 'Ai đó', studentNumber: '999' })
        .expect(400));

    it('returns a JWT for a valid student number', () =>
      request(app.getHttpServer())
        .post(`/api/assignments/${rosterAssignmentId}/enter`)
        .send({ name: 'Bé Minh', studentNumber: pupilStudentNumber })
        .expect(201)
        .expect((res) => expect(res.body.accessToken).toBeTruthy()));

    it('returns 409 on a second submission attempt after the game is complete', async () => {
      const pupil = await prisma.pupil.findFirstOrThrow({ where: { studentNumber: pupilStudentNumber } });
      await prisma.gameResult.create({
        data: {
          assignmentId: rosterAssignmentId,
          pupilId: pupil.id,
          studentName: 'Bé Minh',
          studentNumber: pupilStudentNumber,
          totalScore: 100,
          totalCorrect: 1,
          totalQuestions: 1,
        },
      });
      await request(app.getHttpServer())
        .post(`/api/assignments/${rosterAssignmentId}/enter`)
        .send({ name: 'Bé Minh', studentNumber: pupilStudentNumber })
        .expect(409);
    });
  });
});

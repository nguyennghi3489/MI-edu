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
      .send({ title: 'Phép trừ', subject: 'Toán', grade: '3', gameFormat: 'space-race' });
    lessonId = lesson.body.id;
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
});

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

// Runs against the local dev DB (docker compose up -d in apps/api)
describe('Lessons (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const email = `e2e-lessons-${Date.now()}@test.local`;
  const otherEmail = `e2e-lessons-other-${Date.now()}@test.local`;
  const password = 'secret123';
  let token: string;
  let otherToken: string;
  let lessonId: string;
  let mcqId: string;
  let tfId: string;

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

    const otherSignup = await request(app.getHttpServer())
      .post('/api/auth/signup')
      .send({ email: otherEmail, password, name: 'Cô Mai' });
    otherToken = otherSignup.body.accessToken;
  });

  afterAll(async () => {
    await prisma.teacher.deleteMany({ where: { email: { in: [email, otherEmail] } } });
    await prisma.organization.deleteMany({ where: { members: { none: {} } } });
    await app.close();
  });

  it('POST /lessons creates a lesson with correct fields', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/lessons')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Phép cộng', subject: 'Toán', grade: '3', gameFormat: 'space-race' })
      .expect(201);
    expect(res.body).toMatchObject({
      title: 'Phép cộng',
      subject: 'Toán',
      grade: '3',
      gameFormat: 'space-race',
    });
    lessonId = res.body.id;
  });

  it('POST /lessons/:id/questions adds an MCQ question', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/lessons/${lessonId}/questions`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        type: 'mcq',
        text: '2 + 2 = ?',
        config: { options: ['3', '4', '5', '6'], correct: 1 },
      })
      .expect(201);
    expect(res.body.type).toBe('mcq');
    expect(res.body.order).toBe(0);
    mcqId = res.body.id;
  });

  it('rejects an MCQ question without 4 options', () =>
    request(app.getHttpServer())
      .post(`/api/lessons/${lessonId}/questions`)
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'mcq', text: 'Bad', config: { options: ['1', '2'], correct: 0 } })
      .expect(400));

  it('POST /lessons/:id/questions adds a True/False question', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/lessons/${lessonId}/questions`)
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'true-false', text: 'Trái đất hình tròn', config: { correct: true } })
      .expect(201);
    expect(res.body.type).toBe('true-false');
    expect(res.body.order).toBe(1);
    tfId = res.body.id;
  });

  it('GET /lessons/:id returns questions ordered', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/lessons/${lessonId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body.questions.map((q: { id: string }) => q.id)).toEqual([mcqId, tfId]);
  });

  it('PATCH /questions/:id/order reorders questions', async () => {
    await request(app.getHttpServer())
      .patch(`/api/questions/${tfId}/order`)
      .set('Authorization', `Bearer ${token}`)
      .send({ order: 0 })
      .expect(200);

    const res = await request(app.getHttpServer())
      .get(`/api/lessons/${lessonId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body.questions.map((q: { id: string }) => q.id)).toEqual([tfId, mcqId]);
  });

  it('PATCH /questions/:id updates a question and re-validates config', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/questions/${mcqId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'mcq', text: '2 + 2 = ? (updated)', config: { options: ['3', '4', '5', '6'], correct: 2 } })
      .expect(200);
    expect(res.body).toMatchObject({ text: '2 + 2 = ? (updated)', config: { correct: 2 } });

    await request(app.getHttpServer())
      .patch(`/api/questions/${mcqId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'mcq', text: 'Bad', config: { options: ['1', '2'], correct: 0 } })
      .expect(400);
  });

  it('another teacher cannot access this lesson (404, not leaked)', () =>
    request(app.getHttpServer())
      .get(`/api/lessons/${lessonId}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(404));

  it('DELETE /lessons/:id deletes lesson and cascades to questions', async () => {
    await request(app.getHttpServer())
      .delete(`/api/lessons/${lessonId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const remaining = await prisma.question.findMany({ where: { lessonId } });
    expect(remaining).toEqual([]);
  });
});

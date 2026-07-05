import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

// Runs against the local dev DB (docker compose up -d in apps/api)
describe('Plan limits (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const email = `e2e-plan-${Date.now()}@test.local`;
  const password = 'secret123';
  let teacherId: string;
  let token: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();
    prisma = app.get(PrismaService);

    const signup = await request(app.getHttpServer())
      .post('/api/auth/signup')
      .send({ email, password, name: 'Cô Free' });
    token = signup.body.accessToken;
    const teacher = await prisma.teacher.findUniqueOrThrow({ where: { email } });
    teacherId = teacher.id;
  });

  afterAll(async () => {
    await prisma.teacher.deleteMany({ where: { id: teacherId } });
    await prisma.organization.deleteMany({ where: { members: { none: {} } } });
    await app.close();
  });

  it('free teacher: 10 questions on a lesson, 11th returns 403 PLAN_LIMIT at 10', async () => {
    const lesson = await request(app.getHttpServer())
      .post('/api/lessons')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Câu hỏi', subject: 'Toán', grade: '3', gameFormat: 'quiz' })
      .expect(201);
    const lessonId = lesson.body.id;

    for (let i = 0; i < 10; i++) {
      await request(app.getHttpServer())
        .post(`/api/lessons/${lessonId}/questions`)
        .set('Authorization', `Bearer ${token}`)
        .send({ type: 'true-false', text: `${i}`, config: { correct: true } })
        .expect(201);
    }
    const res = await request(app.getHttpServer())
      .post(`/api/lessons/${lessonId}/questions`)
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'true-false', text: 'thứ 11', config: { correct: true } })
      .expect(403);
    expect(res.body).toEqual(expect.objectContaining({ code: 'PLAN_LIMIT', limit: 10 }));
  });

  it('free teacher: 11th lesson returns 403 PLAN_LIMIT at 10', async () => {
    // 1 lesson already created above — 9 more reaches the cap
    for (let i = 0; i < 9; i++) {
      await request(app.getHttpServer())
        .post('/api/lessons')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: `Bài ${i}`, subject: 'Toán', grade: '3', gameFormat: 'quiz' })
        .expect(201);
    }
    const res = await request(app.getHttpServer())
      .post('/api/lessons')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Bài 11', subject: 'Toán', grade: '3', gameFormat: 'quiz' })
      .expect(403);
    expect(res.body).toEqual(expect.objectContaining({ code: 'PLAN_LIMIT', limit: 10 }));
  });

  it('free teacher: default class excluded, 1 extra class allowed, 2nd extra returns 403 PLAN_LIMIT at 1', async () => {
    await request(app.getHttpServer())
      .post('/api/classes')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Lớp 4A' })
      .expect(201);
    const res = await request(app.getHttpServer())
      .post('/api/classes')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Lớp 4B' })
      .expect(403);
    expect(res.body).toEqual(expect.objectContaining({ code: 'PLAN_LIMIT', limit: 1 }));
  });

  it('free teacher: 11th pupil returns 403 PLAN_LIMIT at 10', async () => {
    for (let i = 0; i < 10; i++) {
      await request(app.getHttpServer())
        .post('/api/pupils')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: `Bé ${i}`, studentNumber: `p${i}` })
        .expect(201);
    }
    const res = await request(app.getHttpServer())
      .post('/api/pupils')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Bé 11', studentNumber: 'p10' })
      .expect(403);
    expect(res.body).toEqual(expect.objectContaining({ code: 'PLAN_LIMIT', limit: 10 }));
  });

  it('pro teacher: no lesson cap', async () => {
    await prisma.teacher.update({ where: { id: teacherId }, data: { plan: 'pro' } });
    await request(app.getHttpServer())
      .post('/api/lessons')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Bài không giới hạn', subject: 'Toán', grade: '3', gameFormat: 'quiz' })
      .expect(201);
  });
});

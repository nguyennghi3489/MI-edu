import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

// Runs against the local dev DB (docker compose up -d in apps/api)
describe('Auth (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const email = `e2e-${Date.now()}@test.local`;
  const password = 'secret123';
  let token: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await prisma.teacher.deleteMany({ where: { email } });
    await prisma.organization.deleteMany({ where: { members: { none: {} } } });
    await app.close();
  });

  it('signup creates teacher + default class + default org (admin) in one transaction', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/signup')
      .send({ email, password, name: 'Cô Lan', school: 'THCS Nguyễn Du' })
      .expect(201);
    expect(res.body.accessToken).toBeDefined();
    token = res.body.accessToken;

    const teacher = await prisma.teacher.findUniqueOrThrow({
      where: { email },
      include: { classes: true, memberships: { include: { org: true } } },
    });
    expect(teacher.classes).toEqual([
      expect.objectContaining({ name: 'Lớp của tôi', isDefault: true }),
    ]);
    expect(teacher.memberships).toEqual([expect.objectContaining({ role: 'admin' })]);
    expect(teacher.memberships[0].org.name).toBe('THCS Nguyễn Du');
  });

  it('duplicate email returns 409', () =>
    request(app.getHttpServer())
      .post('/api/auth/signup')
      .send({ email, password, name: 'Ai đó' })
      .expect(409));

  it('login returns JWT for valid credentials', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password })
      .expect(200);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.teacher.email).toBe(email);
  });

  it('login rejects wrong password with 401', () =>
    request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password: 'wrong-pass' })
      .expect(401));

  it('JWT guard rejects missing token with 401', () =>
    request(app.getHttpServer()).get('/api/auth/me').expect(401));

  it('JWT guard accepts valid token', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body.email).toBe(email);
  });

  it('google oauth route returns 501 while unconfigured', () =>
    request(app.getHttpServer()).get('/api/auth/google').expect(501));
});

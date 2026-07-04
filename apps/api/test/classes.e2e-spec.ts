import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

// Runs against the local dev DB (docker compose up -d in apps/api)
describe('Classes + Pupils (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const email = `e2e-classes-${Date.now()}@test.local`;
  const otherEmail = `e2e-classes-other-${Date.now()}@test.local`;
  const password = 'secret123';
  let token: string;
  let otherToken: string;
  let classAId: string;
  let classBId: string;
  let pupilId: string;

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

  it('POST /classes creates a class with name, grade, schoolYear', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/classes')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Lớp 3A', grade: '3', schoolYear: '2025-2026' })
      .expect(201);
    expect(res.body).toMatchObject({ name: 'Lớp 3A', grade: '3', schoolYear: '2025-2026' });
    classAId = res.body.id;

    const classB = await request(app.getHttpServer())
      .post('/api/classes')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Lớp 3B' })
      .expect(201);
    classBId = classB.body.id;
  });

  it('GET /classes lists classes with pupilCount and lastActivity', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/classes')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    const created = res.body.find((c: { id: string }) => c.id === classAId);
    expect(created).toMatchObject({ pupilCount: 0, lastActivity: null });
  });

  it('POST /classes/:id/pupils creates a pupil and enrolls them (org-scoped)', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/classes/${classAId}/pupils`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Bé An', studentNumber: '1' })
      .expect(201);
    expect(res.body).toMatchObject({ name: 'Bé An', studentNumber: '1' });
    pupilId = res.body.id;
  });

  it('rejects a duplicate student number within the same org', () =>
    request(app.getHttpServer())
      .post(`/api/classes/${classAId}/pupils`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Bé An 2', studentNumber: '1' })
      .expect(409));

  it('the same pupil can be enrolled in a second class (POST /classes/:id/enrollments)', () =>
    request(app.getHttpServer())
      .post(`/api/classes/${classBId}/enrollments`)
      .set('Authorization', `Bearer ${token}`)
      .send({ pupilId })
      .expect(201));

  it('rejects enrolling the same pupil twice in the same class', () =>
    request(app.getHttpServer())
      .post(`/api/classes/${classBId}/enrollments`)
      .set('Authorization', `Bearer ${token}`)
      .send({ pupilId })
      .expect(409));

  it('POST /classes/:id/pupils/bulk imports pupils, skipping already-enrolled duplicates', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/classes/${classAId}/pupils/bulk`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        pupils: [
          { name: 'Bé Bình', studentNumber: '2' },
          { name: 'Bé An', studentNumber: '1' }, // already enrolled in classA, skipped
        ],
      })
      .expect(201);
    expect(res.body).toEqual({ enrolled: 1, skipped: 1 });
  });

  it('GET /classes/:id returns the pupil roster for that class only', async () => {
    const classA = await request(app.getHttpServer())
      .get(`/api/classes/${classAId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(classA.body.pupils.map((p: { studentNumber: string }) => p.studentNumber).sort()).toEqual(['1', '2']);

    const classB = await request(app.getHttpServer())
      .get(`/api/classes/${classBId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(classB.body.pupils.map((p: { studentNumber: string }) => p.studentNumber)).toEqual(['1']);
  });

  it('GET /pupils lists the org-wide roster with each pupil\'s classes', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/pupils')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    const an = res.body.find((p: { id: string }) => p.id === pupilId);
    expect(an.classes.map((c: { id: string }) => c.id).sort()).toEqual([classAId, classBId].sort());
  });

  it('POST /pupils creates a standalone pupil not enrolled anywhere', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/pupils')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Bé Chi', studentNumber: '3' })
      .expect(201);
    expect(res.body).toMatchObject({ name: 'Bé Chi', studentNumber: '3' });
  });

  it('another teacher cannot access this class (404, not leaked)', () =>
    request(app.getHttpServer())
      .get(`/api/classes/${classAId}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(404));

  it('another teacher cannot enroll a pupil from a different org into their own class', async () => {
    const otherClasses = await request(app.getHttpServer())
      .get('/api/classes')
      .set('Authorization', `Bearer ${otherToken}`);
    const otherClassId = otherClasses.body[0].id;

    await request(app.getHttpServer())
      .post(`/api/classes/${otherClassId}/enrollments`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ pupilId })
      .expect(404);
  });
});

import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma, Teacher } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { SignupDto } from './dto';

export interface GoogleProfile {
  googleId: string;
  email: string;
  name: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async signup(dto: SignupDto) {
    const passwordHash = await bcrypt.hash(dto.password, 10);
    try {
      const teacher = await this.createTeacherWithDefaults({
        email: dto.email,
        passwordHash,
        name: dto.name,
        school: dto.school,
      });
      return this.issueToken(teacher);
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('Email đã được sử dụng');
      }
      throw e;
    }
  }

  async validateTeacher(email: string, password: string): Promise<Teacher> {
    const teacher = await this.prisma.teacher.findUnique({ where: { email } });
    if (!teacher?.passwordHash || !(await bcrypt.compare(password, teacher.passwordHash))) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }
    return teacher;
  }

  async googleLogin(profile: GoogleProfile) {
    let teacher = await this.prisma.teacher.findUnique({ where: { googleId: profile.googleId } });
    if (!teacher) {
      const byEmail = await this.prisma.teacher.findUnique({ where: { email: profile.email } });
      teacher = byEmail
        ? await this.prisma.teacher.update({
            where: { id: byEmail.id },
            data: { googleId: profile.googleId },
          })
        : await this.createTeacherWithDefaults({
            email: profile.email,
            googleId: profile.googleId,
            name: profile.name,
          });
    }
    return this.issueToken(teacher);
  }

  issueToken(teacher: Teacher) {
    return {
      accessToken: this.jwt.sign({ sub: teacher.id, email: teacher.email }),
      teacher: {
        id: teacher.id,
        email: teacher.email,
        name: teacher.name,
        school: teacher.school,
        plan: teacher.plan,
      },
    };
  }

  // Teacher + default Class + default Organization (teacher as root admin) — one transaction
  private createTeacherWithDefaults(data: Prisma.TeacherCreateInput) {
    return this.prisma.$transaction(async (tx) => {
      const teacher = await tx.teacher.create({ data });
      await tx.class.create({
        data: { teacherId: teacher.id, name: 'Lớp của tôi', isDefault: true },
      });
      const org = await tx.organization.create({
        data: { name: data.school || 'Trường của tôi' },
      });
      await tx.orgMembership.create({
        data: { orgId: org.id, teacherId: teacher.id, role: 'admin' },
      });
      return teacher;
    });
  }
}

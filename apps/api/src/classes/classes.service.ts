import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ClassesService {
  constructor(private readonly prisma: PrismaService) {}

  list(teacherId: string) {
    return this.prisma.class.findMany({
      where: { teacherId },
      orderBy: { createdAt: 'asc' },
      select: { id: true, name: true, isDefault: true },
    });
  }
}

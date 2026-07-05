import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AssignmentsModule } from './assignments/assignments.module';
import { AuthModule } from './auth/auth.module';
import { ClassesModule } from './classes/classes.module';
import { LessonsModule } from './lessons/lessons.module';
import { PrismaModule } from './prisma/prisma.module';
import { PupilsModule } from './pupils/pupils.module';
import { ResultsModule } from './results/results.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    LessonsModule,
    ClassesModule,
    AssignmentsModule,
    PupilsModule,
    ResultsModule,
  ],
  controllers: [AppController],
})
export class AppModule {}

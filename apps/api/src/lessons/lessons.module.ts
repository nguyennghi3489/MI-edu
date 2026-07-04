import { Module } from '@nestjs/common';
import { LessonsController } from './lessons.controller';
import { LessonsService } from './lessons.service';
import { QuestionsController } from './questions.controller';

@Module({
  controllers: [LessonsController, QuestionsController],
  providers: [LessonsService],
})
export class LessonsModule {}

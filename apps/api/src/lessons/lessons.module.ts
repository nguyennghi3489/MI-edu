import { Module } from '@nestjs/common';
import { PlanLimitsModule } from '../plan-limits/plan-limits.module';
import { LessonsController } from './lessons.controller';
import { LessonsService } from './lessons.service';
import { QuestionsController } from './questions.controller';

@Module({
  imports: [PlanLimitsModule],
  controllers: [LessonsController, QuestionsController],
  providers: [LessonsService],
})
export class LessonsModule {}

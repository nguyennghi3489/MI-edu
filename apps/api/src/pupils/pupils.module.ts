import { Module } from '@nestjs/common';
import { PlanLimitsModule } from '../plan-limits/plan-limits.module';
import { PupilsController } from './pupils.controller';
import { PupilsService } from './pupils.service';

@Module({
  imports: [PlanLimitsModule],
  controllers: [PupilsController],
  providers: [PupilsService],
  exports: [PupilsService],
})
export class PupilsModule {}

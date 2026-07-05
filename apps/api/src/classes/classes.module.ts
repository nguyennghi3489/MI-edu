import { Module } from '@nestjs/common';
import { PlanLimitsModule } from '../plan-limits/plan-limits.module';
import { PupilsModule } from '../pupils/pupils.module';
import { ClassesController } from './classes.controller';
import { ClassesService } from './classes.service';

@Module({
  imports: [PupilsModule, PlanLimitsModule],
  controllers: [ClassesController],
  providers: [ClassesService],
})
export class ClassesModule {}

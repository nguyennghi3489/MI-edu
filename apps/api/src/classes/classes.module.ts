import { Module } from '@nestjs/common';
import { PupilsModule } from '../pupils/pupils.module';
import { ClassesController } from './classes.controller';
import { ClassesService } from './classes.service';

@Module({
  imports: [PupilsModule],
  controllers: [ClassesController],
  providers: [ClassesService],
})
export class ClassesModule {}

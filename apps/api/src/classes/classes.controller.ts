import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards';
import { ClassesService } from './classes.service';
import { BulkAddPupilsDto, CreateClassDto, CreatePupilDto, EnrollPupilDto } from './dto';

@UseGuards(JwtAuthGuard)
@Controller('classes')
export class ClassesController {
  constructor(private readonly classes: ClassesService) {}

  private teacherId(req: Request) {
    return (req.user as { id: string }).id;
  }

  @Get()
  list(@Req() req: Request) {
    return this.classes.list(this.teacherId(req));
  }

  @Post()
  create(@Req() req: Request, @Body() dto: CreateClassDto) {
    return this.classes.create(this.teacherId(req), dto);
  }

  @Get(':id')
  detail(@Req() req: Request, @Param('id') id: string) {
    return this.classes.detail(this.teacherId(req), id);
  }

  @Post(':id/pupils')
  addPupil(@Req() req: Request, @Param('id') id: string, @Body() dto: CreatePupilDto) {
    return this.classes.addPupil(this.teacherId(req), id, dto);
  }

  @Post(':id/enrollments')
  enrollPupil(@Req() req: Request, @Param('id') id: string, @Body() dto: EnrollPupilDto) {
    return this.classes.enrollPupil(this.teacherId(req), id, dto.pupilId);
  }

  @Post(':id/pupils/bulk')
  bulkAddPupils(@Req() req: Request, @Param('id') id: string, @Body() dto: BulkAddPupilsDto) {
    return this.classes.bulkAddPupils(this.teacherId(req), id, dto);
  }
}

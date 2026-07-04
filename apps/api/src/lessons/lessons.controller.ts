import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards';
import { CreateLessonDto, CreateQuestionDto, UpdateLessonDto } from './dto';
import { LessonsService } from './lessons.service';

@UseGuards(JwtAuthGuard)
@Controller('lessons')
export class LessonsController {
  constructor(private readonly lessons: LessonsService) {}

  private teacherId(req: Request) {
    return (req.user as { id: string }).id;
  }

  @Get()
  list(@Req() req: Request) {
    return this.lessons.list(this.teacherId(req));
  }

  @Get(':id')
  detail(@Req() req: Request, @Param('id') id: string) {
    return this.lessons.detail(this.teacherId(req), id);
  }

  @Post()
  create(@Req() req: Request, @Body() dto: CreateLessonDto) {
    return this.lessons.create(this.teacherId(req), dto);
  }

  @Patch(':id')
  update(@Req() req: Request, @Param('id') id: string, @Body() dto: UpdateLessonDto) {
    return this.lessons.update(this.teacherId(req), id, dto);
  }

  @Delete(':id')
  remove(@Req() req: Request, @Param('id') id: string) {
    return this.lessons.remove(this.teacherId(req), id);
  }

  @Post(':id/questions')
  addQuestion(@Req() req: Request, @Param('id') id: string, @Body() dto: CreateQuestionDto) {
    return this.lessons.addQuestion(this.teacherId(req), id, dto);
  }
}

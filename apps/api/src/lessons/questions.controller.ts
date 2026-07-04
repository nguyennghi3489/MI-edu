import { Body, Controller, Delete, Param, Patch, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards';
import { CreateQuestionDto, ReorderQuestionDto } from './dto';
import { LessonsService } from './lessons.service';

@UseGuards(JwtAuthGuard)
@Controller('questions')
export class QuestionsController {
  constructor(private readonly lessons: LessonsService) {}

  private teacherId(req: Request) {
    return (req.user as { id: string }).id;
  }

  @Patch(':id')
  update(@Req() req: Request, @Param('id') id: string, @Body() dto: CreateQuestionDto) {
    return this.lessons.updateQuestion(this.teacherId(req), id, dto);
  }

  @Patch(':id/order')
  reorder(@Req() req: Request, @Param('id') id: string, @Body() dto: ReorderQuestionDto) {
    return this.lessons.reorderQuestion(this.teacherId(req), id, dto.order);
  }

  @Delete(':id')
  remove(@Req() req: Request, @Param('id') id: string) {
    return this.lessons.removeQuestion(this.teacherId(req), id);
  }
}

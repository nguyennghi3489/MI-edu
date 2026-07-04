import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards';
import { AssignmentsService } from './assignments.service';
import { CreateAssignmentDto, EnterAssignmentDto, UpdateAssignmentDto } from './dto';

@Controller('assignments')
export class AssignmentsController {
  constructor(private readonly assignments: AssignmentsService) {}

  private teacherId(req: Request) {
    return (req.user as { id: string }).id;
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Req() req: Request, @Body() dto: CreateAssignmentDto) {
    return this.assignments.create(this.teacherId(req), dto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(@Req() req: Request, @Param('id') id: string, @Body() dto: UpdateAssignmentDto) {
    return this.assignments.updateDueDate(this.teacherId(req), id, dto.dueDate ?? null);
  }

  @Get(':id/public')
  getPublic(@Param('id') id: string) {
    return this.assignments.getPublic(id);
  }

  @Post(':id/enter')
  enter(@Param('id') id: string, @Body() dto: EnterAssignmentDto) {
    return this.assignments.enter(id, dto);
  }
}

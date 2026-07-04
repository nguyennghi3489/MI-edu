import { Body, Controller, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards';
import { AssignmentsService } from './assignments.service';
import { CreateAssignmentDto, UpdateAssignmentDto } from './dto';

@UseGuards(JwtAuthGuard)
@Controller('assignments')
export class AssignmentsController {
  constructor(private readonly assignments: AssignmentsService) {}

  private teacherId(req: Request) {
    return (req.user as { id: string }).id;
  }

  @Post()
  create(@Req() req: Request, @Body() dto: CreateAssignmentDto) {
    return this.assignments.create(this.teacherId(req), dto);
  }

  @Patch(':id')
  update(@Req() req: Request, @Param('id') id: string, @Body() dto: UpdateAssignmentDto) {
    return this.assignments.updateDueDate(this.teacherId(req), id, dto.dueDate ?? null);
  }
}

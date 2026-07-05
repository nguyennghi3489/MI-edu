import { Body, Controller, Get, Headers, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards';
import { SubmitResultDto } from './dto';
import { ResultsService } from './results.service';

@Controller('results')
export class ResultsController {
  constructor(private readonly results: ResultsService) {}

  private teacherId(req: Request) {
    return (req.user as { id: string }).id;
  }

  @Post()
  submit(@Headers('authorization') auth: string | undefined, @Body() dto: SubmitResultDto) {
    const token = auth?.replace('Bearer ', '') ?? '';
    return this.results.submit(token, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  findByAssignment(@Req() req: Request, @Query('assignmentId') assignmentId: string) {
    return this.results.findByAssignment(this.teacherId(req), assignmentId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('accuracy')
  accuracy(@Req() req: Request, @Query('assignmentId') assignmentId: string) {
    return this.results.accuracy(this.teacherId(req), assignmentId);
  }
}

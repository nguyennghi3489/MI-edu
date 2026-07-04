import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards';
import { CreatePupilDto } from './dto';
import { PupilsService } from './pupils.service';

@UseGuards(JwtAuthGuard)
@Controller('pupils')
export class PupilsController {
  constructor(private readonly pupils: PupilsService) {}

  private teacherId(req: Request) {
    return (req.user as { id: string }).id;
  }

  @Get()
  list(@Req() req: Request) {
    return this.pupils.list(this.teacherId(req));
  }

  @Post()
  create(@Req() req: Request, @Body() dto: CreatePupilDto) {
    return this.pupils.create(this.teacherId(req), dto);
  }
}

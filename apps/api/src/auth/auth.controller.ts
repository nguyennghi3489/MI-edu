import { Body, Controller, Get, HttpCode, Post, Req, Res, UseGuards } from '@nestjs/common';
import { Teacher } from '@prisma/client';
import type { Request, Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService, GoogleProfile } from './auth.service';
import { SignupDto } from './dto';
import { GoogleOauthGuard, JwtAuthGuard, LocalAuthGuard } from './guards';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('signup')
  signup(@Body() dto: SignupDto) {
    return this.authService.signup(dto);
  }

  @UseGuards(LocalAuthGuard)
  @HttpCode(200)
  @Post('login')
  login(@Req() req: Request) {
    return this.authService.issueToken(req.user as Teacher);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Req() req: Request) {
    const { id } = req.user as { id: string };
    return this.prisma.teacher.findUniqueOrThrow({
      where: { id },
      select: { id: true, email: true, name: true, school: true, plan: true },
    });
  }

  @UseGuards(GoogleOauthGuard)
  @Get('google')
  google() {
    // passport redirects to Google
  }

  @UseGuards(GoogleOauthGuard)
  @Get('google/callback')
  async googleCallback(@Req() req: Request, @Res() res: Response) {
    const { accessToken } = await this.authService.googleLogin(req.user as GoogleProfile);
    const webUrl = process.env.WEB_URL ?? 'http://localhost:3000';
    res.redirect(`${webUrl}/auth/callback?token=${accessToken}`);
  }
}

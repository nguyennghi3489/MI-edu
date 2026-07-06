import { IsIn, IsInt, IsNotEmpty, IsObject, IsOptional, IsString, Min } from 'class-validator';

export class CreateLessonDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  subject: string;

  @IsString()
  @IsNotEmpty()
  grade: string;

  @IsString()
  @IsNotEmpty()
  gameFormat: string;

  @IsOptional()
  @IsIn([10, 20, 30])
  gameTimeSec?: number;
}

export class UpdateLessonDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  title?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  subject?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  grade?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  gameFormat?: string;

  @IsOptional()
  @IsIn([10, 20, 30])
  gameTimeSec?: number;
}

export class CreateQuestionDto {
  @IsIn(['mcq', 'true-false'])
  type: 'mcq' | 'true-false';

  @IsString()
  @IsNotEmpty()
  text: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsInt()
  @Min(5)
  timeLimitSec?: number;

  @IsObject()
  config: Record<string, unknown>;
}

export class ReorderQuestionDto {
  @IsInt()
  @Min(0)
  order: number;
}

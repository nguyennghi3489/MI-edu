import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsDefined, IsInt, IsNotEmpty, IsString, IsUUID, Min, ValidateNested } from 'class-validator';

export class ResultAnswerDto {
  @IsUUID()
  questionId: string;

  @IsDefined()
  answer: unknown;

  @IsBoolean()
  correct: boolean;

  @IsInt()
  @Min(0)
  timeMs: number;
}

export class SubmitResultDto {
  @IsUUID()
  assignmentId: string;

  @IsString()
  @IsNotEmpty()
  studentName: string;

  @IsString()
  @IsNotEmpty()
  studentNumber: string;

  @IsInt()
  @Min(0)
  totalScore: number;

  @IsInt()
  @Min(0)
  totalCorrect: number;

  @IsInt()
  @Min(0)
  totalQuestions: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ResultAnswerDto)
  answers: ResultAnswerDto[];
}

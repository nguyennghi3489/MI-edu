import { IsISO8601, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateAssignmentDto {
  @IsUUID()
  lessonId: string;

  @IsUUID()
  classId: string;

  @IsOptional()
  @IsISO8601()
  dueDate?: string;
}

export class UpdateAssignmentDto {
  @IsOptional()
  @IsISO8601()
  dueDate?: string;
}

export class EnterAssignmentDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  studentNumber: string;
}

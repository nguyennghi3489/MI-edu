import { IsISO8601, IsOptional, IsUUID } from 'class-validator';

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

import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export { BulkAddPupilsDto, CreatePupilDto } from '../pupils/dto';

export class CreateClassDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  grade?: string;

  @IsOptional()
  @IsString()
  schoolYear?: string;
}

export class EnrollPupilDto {
  @IsString()
  @IsNotEmpty()
  pupilId: string;
}

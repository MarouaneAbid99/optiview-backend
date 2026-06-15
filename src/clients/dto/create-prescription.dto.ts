import { IsString, IsNumber, IsOptional, IsDateString } from 'class-validator';

export class CreatePrescriptionDto {
  @IsString()
  clientId: string;

  @IsDateString()
  dateIssued: string;

  @IsNumber()
  @IsOptional()
  sphereOD?: number;

  @IsNumber()
  @IsOptional()
  sphereOS?: number;

  @IsNumber()
  @IsOptional()
  cylinderOD?: number;

  @IsNumber()
  @IsOptional()
  cylinderOS?: number;

  @IsNumber()
  @IsOptional()
  axisOD?: number;

  @IsNumber()
  @IsOptional()
  axisOS?: number;

  @IsNumber()
  @IsOptional()
  additionOD?: number;

  @IsNumber()
  @IsOptional()
  additionOS?: number;

  @IsString()
  @IsOptional()
  notes?: string;
}

import { IsString, IsDateString, IsIn, IsOptional } from 'class-validator';

export class CreateAppointmentDto {
  @IsString()
  clientId: string;

  @IsDateString()
  dateTime: string;

  @IsIn(['pending', 'confirmed', 'completed', 'cancelled'])
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

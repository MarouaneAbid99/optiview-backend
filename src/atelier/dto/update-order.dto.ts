import { IsString, IsOptional, IsDateString, IsIn } from 'class-validator';

export class UpdateOrderDto {
  @IsString()
  @IsOptional()
  notes?: string;

  @IsDateString()
  @IsOptional()
  deliveryDate?: string;

  @IsIn(['pending', 'in-progress', 'ready', 'delivered', 'cancelled'])
  @IsOptional()
  status?: string;
}

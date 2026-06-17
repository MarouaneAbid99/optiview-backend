import {
  IsString,
  IsNumber,
  IsArray,
  IsOptional,
  IsIn,
  IsDateString,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

class OrderItemDto {
  @IsString()
  lensId: string;

  @IsNumber()
  @Min(1)
  quantity: number;
}

export class CreateOrderDto {
  @IsIn(['sale', 'montage', 'sale_montage'])
  orderType: string;

  @IsString()
  @IsOptional()
  clientId?: string;

  @IsString()
  @IsOptional()
  frameId?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  @IsOptional()
  items?: OrderItemDto[];

  @IsNumber()
  @Min(0)
  @IsOptional()
  laborPrice?: number;

  @IsIn(['pending', 'in-progress', 'ready', 'delivered', 'cancelled'])
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsDateString()
  @IsOptional()
  deliveryDate?: string;
}

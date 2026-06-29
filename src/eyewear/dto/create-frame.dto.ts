import { IsString, IsNumber, IsInt, IsOptional, Min } from 'class-validator';

export class CreateFrameDto {
  @IsString()
  brand: string;

  @IsString()
  model: string;

  @IsString()
  category: string;

  @IsString()
  @IsOptional()
  color?: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  stock?: number;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  barcode?: string;
}

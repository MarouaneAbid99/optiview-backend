import { IsString, IsNumber, IsInt, IsOptional, IsIn, Min } from 'class-validator';

export class CreateLensDto {
  @IsIn(['Single Vision', 'Progressive', 'Bifocal', 'Reading'])
  type: string;

  @IsIn(['CR-39', 'Polycarbonate', 'High Index 1.67', 'High Index 1.74', 'Trivex'])
  material: string;

  @IsString()
  @IsOptional()
  coating?: string;

  @IsString()
  @IsOptional()
  treatment?: string;

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

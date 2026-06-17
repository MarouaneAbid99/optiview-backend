import { IsString, IsOptional } from 'class-validator';

export class UpdateShopDto {
  @IsString() @IsOptional() name?: string;
  @IsString() @IsOptional() address?: string;
  @IsString() @IsOptional() phone?: string;
  @IsString() @IsOptional() ice?: string;
  @IsString() @IsOptional() city?: string;
}

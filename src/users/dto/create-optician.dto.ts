import { IsEmail, IsString, MinLength } from 'class-validator';

export class CreateOpticianDto {
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  shopName: string;
}

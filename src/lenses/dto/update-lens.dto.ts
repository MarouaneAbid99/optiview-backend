import { PartialType } from '@nestjs/mapped-types';
import { CreateLensDto } from './create-lens.dto';

export class UpdateLensDto extends PartialType(CreateLensDto) {}

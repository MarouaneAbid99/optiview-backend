import { PartialType } from '@nestjs/mapped-types';
import { CreateFrameDto } from './create-frame.dto';

export class UpdateFrameDto extends PartialType(CreateFrameDto) {}

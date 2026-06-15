import { Module } from '@nestjs/common';
import { EyewearService } from './eyewear.service';
import { EyewearController } from './eyewear.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [EyewearService],
  controllers: [EyewearController],
  exports: [EyewearService],
})
export class EyewearModule {}

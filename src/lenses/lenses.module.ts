import { Module } from '@nestjs/common';
import { LensesService } from './lenses.service';
import { LensesController } from './lenses.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [LensesService],
  controllers: [LensesController],
  exports: [LensesService],
})
export class LensesModule {}

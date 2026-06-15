import { Module } from '@nestjs/common';
import { AtelierService } from './atelier.service';
import { AtelierController } from './atelier.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [AtelierService],
  controllers: [AtelierController],
  exports: [AtelierService],
})
export class AtelierModule {}

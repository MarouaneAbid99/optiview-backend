import { Module } from '@nestjs/common';
import { PanoramaService } from './panorama.service';
import { PanoramaController } from './panorama.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [PanoramaService],
  controllers: [PanoramaController],
})
export class PanoramaModule {}
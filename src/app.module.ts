import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { PanoramaModule } from './panorama/panorama.module';
import { ClientsModule } from './clients/clients.module';
import { EyewearModule } from './eyewear/eyewear.module';
import { LensesModule } from './lenses/lenses.module';
import { AtelierModule } from './atelier/atelier.module';

@Module({
  imports: [PrismaModule, PanoramaModule, ClientsModule, EyewearModule, LensesModule, AtelierModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

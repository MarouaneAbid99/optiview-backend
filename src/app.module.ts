import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { PanoramaModule } from './panorama/panorama.module';
import { ClientsModule } from './clients/clients.module';
import { EyewearModule } from './eyewear/eyewear.module';
import { LensesModule } from './lenses/lenses.module';
import { AtelierModule } from './atelier/atelier.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';

@Module({
  imports: [
    PrismaModule,
    PanoramaModule,
    ClientsModule,
    EyewearModule,
    LensesModule,
    AtelierModule,
    AuthModule,
    UsersModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}

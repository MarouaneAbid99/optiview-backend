import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit() {
    try {
      await this.$connect();
    } catch (e) {
      console.warn('[Prisma] Could not connect to database:', e.message);
      console.warn('[Prisma] Server will start but DB operations will fail until DB is available.');
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { sendExpoPush } from './push.util';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async registerToken(userId: string, shopId: string | null, token: string) {
    return this.prisma.deviceToken.upsert({
      where: { token },
      update: { userId, shopId },
      create: { token, userId, shopId },
    });
  }

  async removeToken(token: string) {
    await this.prisma.deviceToken.deleteMany({ where: { token } });
  }

  async notifyShop(shopId: string, title: string, body: string, data?: any) {
    if (!shopId) return;
    const tokens = await this.prisma.deviceToken.findMany({ where: { shopId } });
    const messages = tokens.map((t) => ({ to: t.token, title, body, data }));
    await sendExpoPush(messages);
  }
}

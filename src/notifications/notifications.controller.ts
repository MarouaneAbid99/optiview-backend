import { Body, Controller, Delete, Post } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../common/tenant.util';

@Controller('api/notifications')
export class NotificationsController {
  constructor(private service: NotificationsService) {}

  @Post('register')
  register(@Body('token') token: string, @CurrentUser() user: AuthUser) {
    return this.service.registerToken(user.id, user.shopId ?? null, token);
  }

  @Delete('register')
  remove(@Body('token') token: string) {
    return this.service.removeToken(token);
  }
}

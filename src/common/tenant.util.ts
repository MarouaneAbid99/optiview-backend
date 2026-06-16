import { ForbiddenException } from '@nestjs/common';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: 'DEVELOPER' | 'OPTICIAN' | 'EMPLOYEE';
  shopId: string | null;
}

export function resolveShopId(
  user: AuthUser,
  requestedShopId?: string,
): string | undefined {
  if (user.role === 'DEVELOPER') {
    return requestedShopId;
  }

  if (!user.shopId) {
    throw new ForbiddenException('User has no shop assigned');
  }

  return user.shopId;
}

export function resolveShopIdForWrite(
  user: AuthUser,
  requestedShopId?: string,
): string {
  if (user.role === 'DEVELOPER') {
    if (!requestedShopId) {
      throw new ForbiddenException(
        'Developer must specify a shopId when creating records',
      );
    }
    return requestedShopId;
  }

  if (!user.shopId) {
    throw new ForbiddenException('User has no shop assigned');
  }

  return user.shopId;
}

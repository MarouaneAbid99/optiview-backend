import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { CreateOpticianDto } from './dto/create-optician.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  private sanitize(user: any) {
    if (!user) return user;
    const { passwordHash, ...rest } = user;
    return rest;
  }

  // ===== OPTICIAN: manage employees in their own shop =====

  async createEmployee(dto: CreateEmployeeDto, shopId: string) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already registered');

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        passwordHash,
        role: 'EMPLOYEE',
        shopId,
      },
    });
    return this.sanitize(user);
  }

  async listEmployees(shopId: string) {
    const users = await this.prisma.user.findMany({
      where: { shopId, role: 'EMPLOYEE' },
      orderBy: { createdAt: 'desc' },
    });
    return users.map((u) => this.sanitize(u));
  }

  async setEmployeeActive(id: string, active: boolean, shopId: string) {
    const employee = await this.prisma.user.findUnique({ where: { id } });
    if (!employee || employee.shopId !== shopId || employee.role !== 'EMPLOYEE') {
      throw new NotFoundException('Employee not found');
    }
    const updated = await this.prisma.user.update({
      where: { id },
      data: { active },
    });
    return this.sanitize(updated);
  }

  async deleteEmployee(id: string, shopId: string) {
    const employee = await this.prisma.user.findUnique({ where: { id } });
    if (!employee || employee.shopId !== shopId || employee.role !== 'EMPLOYEE') {
      throw new NotFoundException('Employee not found');
    }
    await this.prisma.user.delete({ where: { id } });
    return { deleted: true };
  }

  // ===== DEVELOPER: manage opticians + shops =====

  async createOptician(dto: CreateOpticianDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already registered');

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const result = await this.prisma.$transaction(async (tx) => {
      const shop = await tx.shop.create({ data: { name: dto.shopName } });
      const user = await tx.user.create({
        data: {
          name: dto.name,
          email: dto.email,
          passwordHash,
          role: 'OPTICIAN',
          shopId: shop.id,
        },
      });
      await tx.store.create({
        data: { name: dto.shopName, shopId: shop.id },
      });
      return { user, shop };
    });

    return { shop: result.shop, optician: this.sanitize(result.user) };
  }

  async listShops() {
    return this.prisma.shop.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        users: {
          where: { role: 'OPTICIAN' },
          select: { id: true, name: true, email: true, active: true },
        },
        _count: {
          select: { users: true, clients: true, frames: true, lenses: true, orders: true },
        },
      },
    });
  }

  async listOpticians() {
    const opticians = await this.prisma.user.findMany({
      where: { role: 'OPTICIAN' },
      orderBy: { createdAt: 'desc' },
      include: { shop: true },
    });
    return opticians.map((u) => this.sanitize(u));
  }

  async getMyShop(shopId: string) {
    const shop = await this.prisma.shop.findUnique({ where: { id: shopId } });
    if (!shop) throw new NotFoundException('Shop not found');
    return shop;
  }

  async updateMyShop(shopId: string, dto: any) {
    return this.prisma.shop.update({ where: { id: shopId }, data: dto });
  }

  async setShopActive(shopId: string, active: boolean) {
    const shop = await this.prisma.shop.findUnique({ where: { id: shopId } });
    if (!shop) throw new NotFoundException('Shop not found');
    await this.prisma.$transaction([
      this.prisma.shop.update({ where: { id: shopId }, data: { active } }),
      this.prisma.user.updateMany({ where: { shopId }, data: { active } }),
    ]);
    return { shopId, active };
  }
}

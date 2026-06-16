import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFrameDto } from './dto/create-frame.dto';
import { UpdateFrameDto } from './dto/update-frame.dto';
import { UpdateStockDto } from './dto/update-stock.dto';

@Injectable()
export class EyewearService {
  constructor(private prisma: PrismaService) {}

  async createFrame(dto: CreateFrameDto, shopId: string) {
    return this.prisma.frame.create({ data: { stock: 0, ...dto, shopId } });
  }

  async findAllFrames(filter?: { brand?: string; category?: string }, shopId?: string) {
    const where: any = {};
    if (shopId) where.shopId = shopId;
    if (filter?.brand) where.brand = { contains: filter.brand, mode: 'insensitive' };
    if (filter?.category) where.category = { contains: filter.category, mode: 'insensitive' };
    return this.prisma.frame.findMany({ where, orderBy: { createdAt: 'desc' } });
  }

  async findFrameById(id: string, shopId?: string) {
    const frame = await this.prisma.frame.findUnique({
      where: { id },
      include: { purchases: { orderBy: { purchaseDate: 'desc' }, take: 5 } },
    });
    if (!frame || (shopId && frame.shopId !== shopId)) {
      throw new NotFoundException(`Frame ${id} not found`);
    }
    return frame;
  }

  async updateFrame(id: string, dto: UpdateFrameDto, shopId?: string) {
    await this.findFrameById(id, shopId);
    return this.prisma.frame.update({ where: { id }, data: dto });
  }

  async updateFrameStock(id: string, dto: UpdateStockDto, shopId?: string) {
    await this.findFrameById(id, shopId);
    return this.prisma.frame.update({ where: { id }, data: { stock: dto.stock } });
  }

  async deleteFrame(id: string, shopId?: string) {
    await this.findFrameById(id, shopId);
    return this.prisma.frame.delete({ where: { id } });
  }

  async getBrands(shopId?: string) {
    const rows = await this.prisma.frame.findMany({
      where: shopId ? { shopId } : {},
      select: { brand: true },
      distinct: ['brand'],
      orderBy: { brand: 'asc' },
    });
    return rows.map((r) => r.brand);
  }

  async getCategories(shopId?: string) {
    const rows = await this.prisma.frame.findMany({
      where: shopId ? { shopId } : {},
      select: { category: true },
      distinct: ['category'],
      orderBy: { category: 'asc' },
    });
    return rows.map((r) => r.category);
  }

  async getInventoryStats(shopId?: string) {
    const frames = await this.prisma.frame.findMany({
      where: shopId ? { shopId } : {},
    });
    const totalFrames = frames.length;
    const totalStock = frames.reduce((s, f) => s + f.stock, 0);
    const totalValue = frames.reduce((s, f) => s + f.price * f.stock, 0);
    return {
      totalFrames,
      totalStock,
      totalValue: parseFloat(totalValue.toFixed(2)),
      lowStockFrames: frames.filter((f) => f.stock > 0 && f.stock < 5).length,
      outOfStockFrames: frames.filter((f) => f.stock === 0).length,
      averagePrice:
        totalFrames > 0
          ? parseFloat((frames.reduce((s, f) => s + f.price, 0) / totalFrames).toFixed(2))
          : 0,
    };
  }

  async getLowStockFrames(threshold = 5, shopId?: string) {
    return this.prisma.frame.findMany({
      where: { stock: { lte: threshold }, ...(shopId && { shopId }) },
      orderBy: { stock: 'asc' },
    });
  }
}

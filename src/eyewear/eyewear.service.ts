import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFrameDto } from './dto/create-frame.dto';
import { UpdateFrameDto } from './dto/update-frame.dto';
import { UpdateStockDto } from './dto/update-stock.dto';

@Injectable()
export class EyewearService {
  constructor(private prisma: PrismaService) {}

  async createFrame(dto: CreateFrameDto) {
    return this.prisma.frame.create({ data: { stock: 0, ...dto } });
  }

  async findAllFrames(filter?: { brand?: string; category?: string }) {
    const where: any = {};
    if (filter?.brand) where.brand = { contains: filter.brand };
    if (filter?.category) where.category = { contains: filter.category };

    return this.prisma.frame.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findFrameById(id: string) {
    const frame = await this.prisma.frame.findUnique({
      where: { id },
      include: { purchases: { orderBy: { purchaseDate: 'desc' }, take: 5 } },
    });
    if (!frame) throw new NotFoundException(`Frame ${id} not found`);
    return frame;
  }

  async updateFrame(id: string, dto: UpdateFrameDto) {
    return this.prisma.frame.update({ where: { id }, data: dto });
  }

  async updateFrameStock(id: string, dto: UpdateStockDto) {
    return this.prisma.frame.update({ where: { id }, data: { stock: dto.stock } });
  }

  async deleteFrame(id: string) {
    return this.prisma.frame.delete({ where: { id } });
  }

  async getBrands() {
    const rows = await this.prisma.frame.findMany({
      select: { brand: true },
      distinct: ['brand'],
      orderBy: { brand: 'asc' },
    });
    return rows.map((r) => r.brand);
  }

  async getCategories() {
    const rows = await this.prisma.frame.findMany({
      select: { category: true },
      distinct: ['category'],
      orderBy: { category: 'asc' },
    });
    return rows.map((r) => r.category);
  }

  async getInventoryStats() {
    const frames = await this.prisma.frame.findMany();
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
          ? parseFloat(
              (frames.reduce((s, f) => s + f.price, 0) / totalFrames).toFixed(2),
            )
          : 0,
    };
  }

  async getLowStockFrames(threshold = 5) {
    return this.prisma.frame.findMany({
      where: { stock: { lte: threshold } },
      orderBy: { stock: 'asc' },
    });
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLensDto } from './dto/create-lens.dto';
import { UpdateLensDto } from './dto/update-lens.dto';
import { UpdateStockDto } from './dto/update-stock.dto';

@Injectable()
export class LensesService {
  constructor(private prisma: PrismaService) {}

  async createLens(dto: CreateLensDto) {
    return this.prisma.lens.create({ data: dto });
  }

  async findAllLenses(filter?: { type?: string; material?: string }) {
    const where: any = {};
    if (filter?.type) where.type = filter.type;
    if (filter?.material) where.material = filter.material;
    return this.prisma.lens.findMany({ where, orderBy: { createdAt: 'desc' } });
  }

  async findLensById(id: string) {
    const lens = await this.prisma.lens.findUnique({
      where: { id },
      include: {
        orderItems: {
          include: { order: true },
          orderBy: { order: { createdAt: 'desc' } },
          take: 5,
        },
      },
    });
    if (!lens) throw new NotFoundException(`Lens with ID ${id} not found`);
    return lens;
  }

  async updateLens(id: string, dto: UpdateLensDto) {
    return this.prisma.lens.update({ where: { id }, data: dto });
  }

  async updateLensStock(id: string, dto: UpdateStockDto) {
    return this.prisma.lens.update({ where: { id }, data: { stock: dto.stock } });
  }

  async deleteLens(id: string) {
    return this.prisma.lens.delete({ where: { id } });
  }

  async getTypes() {
    const rows = await this.prisma.lens.findMany({
      select: { type: true },
      distinct: ['type'],
      orderBy: { type: 'asc' },
    });
    return rows.map((r) => r.type);
  }

  async getMaterials() {
    const rows = await this.prisma.lens.findMany({
      select: { material: true },
      distinct: ['material'],
      orderBy: { material: 'asc' },
    });
    return rows.map((r) => r.material);
  }

  async getInventoryStats() {
    const lenses = await this.prisma.lens.findMany();
    const totalLenses = lenses.length;
    const totalStock = lenses.reduce((sum, l) => sum + l.stock, 0);
    const totalValue = lenses.reduce((sum, l) => sum + l.price * l.stock, 0);
    const lowStockLenses = lenses.filter((l) => l.stock > 0 && l.stock < 10).length;
    const outOfStockLenses = lenses.filter((l) => l.stock === 0).length;
    const byType = lenses.reduce((acc, l) => {
      acc[l.type] = (acc[l.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalLenses,
      totalStock,
      totalValue: parseFloat(totalValue.toFixed(2)),
      lowStockLenses,
      outOfStockLenses,
      averagePrice:
        totalLenses > 0
          ? parseFloat((lenses.reduce((sum, l) => sum + l.price, 0) / totalLenses).toFixed(2))
          : 0,
      byType,
    };
  }

  async getLowStockLenses(threshold = 10) {
    return this.prisma.lens.findMany({
      where: { stock: { lte: threshold } },
      orderBy: { stock: 'asc' },
    });
  }
}

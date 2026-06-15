import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { UpdateOrderDto } from './dto/update-order.dto';

const ORDER_INCLUDE = {
  client: true,
  frame: true,
  items: { include: { lens: true } },
};

@Injectable()
export class AtelierService {
  constructor(private prisma: PrismaService) {}

  private async generateOrderNumber(): Promise<string> {
    const count = await this.prisma.order.count();
    const year = new Date().getFullYear();
    return `ORD-${year}-${String(count + 1).padStart(4, '0')}`;
  }

  async createOrder(dto: CreateOrderDto) {
    const frame = await this.prisma.frame.findUnique({ where: { id: dto.frameId } });
    if (!frame) throw new NotFoundException('Frame not found');
    if (frame.stock < 1) throw new BadRequestException(`Frame ${frame.brand} ${frame.model} is out of stock`);

    let lensTotal = 0;
    const lensData: Array<{ lens: any; quantity: number }> = [];

    for (const item of dto.items) {
      const lens = await this.prisma.lens.findUnique({ where: { id: item.lensId } });
      if (!lens) throw new NotFoundException(`Lens ${item.lensId} not found`);
      if (lens.stock < item.quantity) {
        throw new BadRequestException(
          `Insufficient stock for ${lens.type} ${lens.material}. Available: ${lens.stock}, Requested: ${item.quantity}`,
        );
      }
      lensData.push({ lens, quantity: item.quantity });
      lensTotal += lens.price * item.quantity;
    }

    const totalPrice = frame.price + lensTotal;
    const orderNumber = await this.generateOrderNumber();

    return this.prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          clientId: dto.clientId || null,
          frameId: dto.frameId,
          status: dto.status || 'pending',
          totalPrice,
          notes: dto.notes,
          deliveryDate: dto.deliveryDate ? new Date(dto.deliveryDate) : null,
          items: {
            create: dto.items.map((item) => {
              const info = lensData.find((l) => l.lens.id === item.lensId);
              return { lensId: item.lensId, quantity: item.quantity, pricePerUnit: info?.lens.price ?? 0 };
            }),
          },
        },
        include: ORDER_INCLUDE,
      });

      await tx.frame.update({ where: { id: dto.frameId }, data: { stock: { decrement: 1 } } });

      for (const item of dto.items) {
        await tx.lens.update({ where: { id: item.lensId }, data: { stock: { decrement: item.quantity } } });
      }

      return newOrder;
    });
  }

  async findAllOrders(status?: string) {
    return this.prisma.order.findMany({
      where: status ? { status } : {},
      include: ORDER_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  async getOrdersByStatus() {
    const orders = await this.prisma.order.findMany({
      include: ORDER_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });

    const grouped: Record<string, any[]> = {
      pending: [],
      'in-progress': [],
      ready: [],
      delivered: [],
      cancelled: [],
    };

    orders.forEach((order) => {
      if (grouped[order.status]) grouped[order.status].push(order);
    });

    return grouped;
  }

  async findOrderById(id: string) {
    const order = await this.prisma.order.findUnique({ where: { id }, include: ORDER_INCLUDE });
    if (!order) throw new NotFoundException(`Order ${id} not found`);
    return order;
  }

  async updateOrderStatus(id: string, dto: UpdateOrderStatusDto) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('Order not found');

    if (dto.status === 'cancelled' && order.status !== 'cancelled') {
      await this.restoreStock(id);
    }

    return this.prisma.order.update({
      where: { id },
      data: { status: dto.status },
      include: ORDER_INCLUDE,
    });
  }

  async updateOrder(id: string, dto: UpdateOrderDto) {
    return this.prisma.order.update({
      where: { id },
      data: {
        ...(dto.notes !== undefined && { notes: dto.notes }),
        ...(dto.deliveryDate && { deliveryDate: new Date(dto.deliveryDate) }),
        ...(dto.status && { status: dto.status }),
      },
      include: ORDER_INCLUDE,
    });
  }

  private async restoreStock(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order) return;

    await this.prisma.$transaction(async (tx) => {
      await tx.frame.update({ where: { id: order.frameId }, data: { stock: { increment: 1 } } });
      for (const item of order.items) {
        await tx.lens.update({ where: { id: item.lensId }, data: { stock: { increment: item.quantity } } });
      }
    });
  }

  async deleteOrder(id: string) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.status !== 'cancelled') await this.restoreStock(id);
    return this.prisma.order.delete({ where: { id } });
  }

  async getOrderStats() {
    const orders = await this.prisma.order.findMany();
    const totalOrders = orders.length;
    const pending = orders.filter((o) => o.status === 'pending').length;
    const inProgress = orders.filter((o) => o.status === 'in-progress').length;
    const ready = orders.filter((o) => o.status === 'ready').length;
    const delivered = orders.filter((o) => o.status === 'delivered').length;
    const totalRevenue = orders
      .filter((o) => o.status === 'delivered')
      .reduce((sum, o) => sum + o.totalPrice, 0);
    const pendingRevenue = orders
      .filter((o) => ['pending', 'in-progress', 'ready'].includes(o.status))
      .reduce((sum, o) => sum + o.totalPrice, 0);

    return {
      totalOrders,
      pending,
      inProgress,
      ready,
      delivered,
      totalRevenue: parseFloat(totalRevenue.toFixed(2)),
      pendingRevenue: parseFloat(pendingRevenue.toFixed(2)),
    };
  }
}

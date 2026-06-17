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

  async createOrder(dto: CreateOrderDto, shopId: string) {
    const type = dto.orderType;
    const involvesStock = type === 'sale' || type === 'sale_montage';
    const involvesMontage = type === 'montage' || type === 'sale_montage';

    let frame: any = null;
    let lensTotal = 0;
    const lensData: Array<{ lens: any; quantity: number }> = [];

    if (involvesStock) {
      if (!dto.frameId) throw new BadRequestException('A frame is required for a sale');
      frame = await this.prisma.frame.findUnique({ where: { id: dto.frameId } });
      if (!frame || frame.shopId !== shopId) throw new NotFoundException('Frame not found in your shop');
      if (frame.stock < 1) throw new BadRequestException(`Frame ${frame.brand} ${frame.model} is out of stock`);

      if (!dto.items || dto.items.length === 0) throw new BadRequestException('At least one lens is required for a sale');

      for (const item of dto.items) {
        const lens = await this.prisma.lens.findUnique({ where: { id: item.lensId } });
        if (!lens || lens.shopId !== shopId) throw new NotFoundException(`Lens ${item.lensId} not found in your shop`);
        if (lens.stock < item.quantity) {
          throw new BadRequestException(
            `Insufficient stock for ${lens.type} ${lens.material}. Available: ${lens.stock}, Requested: ${item.quantity}`,
          );
        }
        lensData.push({ lens, quantity: item.quantity });
        lensTotal += lens.price * item.quantity;
      }
    }

    if (dto.clientId) {
      const client = await this.prisma.client.findUnique({ where: { id: dto.clientId } });
      if (!client || client.shopId !== shopId) throw new NotFoundException('Client not found in your shop');
    }

    const labor = involvesMontage ? (dto.laborPrice ?? 0) : 0;
    const framePrice = frame ? frame.price : 0;
    const totalPrice = framePrice + lensTotal + labor;
    const orderNumber = await this.generateOrderNumber();

    return this.prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          orderType: type,
          shopId,
          clientId: dto.clientId || null,
          frameId: involvesStock ? dto.frameId : null,
          status: dto.status || 'pending',
          totalPrice,
          laborPrice: involvesMontage ? labor : null,
          notes: dto.notes,
          deliveryDate: dto.deliveryDate ? new Date(dto.deliveryDate) : null,
          ...(involvesStock && dto.items && {
            items: {
              create: dto.items.map((item) => {
                const info = lensData.find((l) => l.lens.id === item.lensId);
                return { lensId: item.lensId, quantity: item.quantity, pricePerUnit: info?.lens.price ?? 0 };
              }),
            },
          }),
        },
        include: ORDER_INCLUDE,
      });

      if (involvesStock && dto.frameId) {
        await tx.frame.update({ where: { id: dto.frameId }, data: { stock: { decrement: 1 } } });
        for (const item of dto.items!) {
          await tx.lens.update({ where: { id: item.lensId }, data: { stock: { decrement: item.quantity } } });
        }
      }

      return newOrder;
    });
  }

  async findAllOrders(status?: string, shopId?: string, orderType?: string) {
    const where: any = {};
    if (status) where.status = status;
    if (shopId) where.shopId = shopId;
    if (orderType) where.orderType = orderType;
    return this.prisma.order.findMany({
      where,
      include: ORDER_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  // Atelier kanban: only montage orders (need workshop work)
  async getOrdersByStatus(shopId?: string) {
    const orders = await this.prisma.order.findMany({
      where: {
        ...(shopId ? { shopId } : {}),
        orderType: { in: ['montage', 'sale_montage'] },
      },
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

  async findOrderById(id: string, shopId?: string) {
    const order = await this.prisma.order.findUnique({ where: { id }, include: ORDER_INCLUDE });
    if (!order || (shopId && order.shopId !== shopId)) {
      throw new NotFoundException(`Order ${id} not found`);
    }
    return order;
  }

  async updateOrderStatus(id: string, dto: UpdateOrderStatusDto, shopId?: string) {
    const order = await this.findOrderById(id, shopId);

    if (dto.status === 'cancelled' && order.status !== 'cancelled') {
      await this.restoreStock(id);
    }

    return this.prisma.order.update({
      where: { id },
      data: { status: dto.status },
      include: ORDER_INCLUDE,
    });
  }

  async updateOrder(id: string, dto: UpdateOrderDto, shopId?: string) {
    await this.findOrderById(id, shopId);
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

    // Only restore stock for orders that deducted it
    const involvesStock = order.orderType === 'sale' || order.orderType === 'sale_montage';
    if (!involvesStock) return;

    await this.prisma.$transaction(async (tx) => {
      if (order.frameId) {
        await tx.frame.update({ where: { id: order.frameId }, data: { stock: { increment: 1 } } });
      }
      for (const item of order.items) {
        await tx.lens.update({ where: { id: item.lensId }, data: { stock: { increment: item.quantity } } });
      }
    });
  }

  async deleteOrder(id: string, shopId?: string) {
    const order = await this.findOrderById(id, shopId);
    if (order.status !== 'cancelled') await this.restoreStock(id);
    return this.prisma.order.delete({ where: { id } });
  }

  async getOrderStats(shopId?: string) {
    const orders = await this.prisma.order.findMany({
      where: shopId ? { shopId } : {},
    });

    const montageOrders = orders.filter((o) => o.orderType === 'montage' || o.orderType === 'sale_montage');
    const totalOrders = orders.length;
    const pending = montageOrders.filter((o) => o.status === 'pending').length;
    const inProgress = montageOrders.filter((o) => o.status === 'in-progress').length;
    const ready = montageOrders.filter((o) => o.status === 'ready').length;
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
      salesCount: orders.filter((o) => o.orderType === 'sale' || o.orderType === 'sale_montage').length,
      montageCount: montageOrders.length,
    };
  }
}

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';

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

  async findAllOrders(status?: string, shopId?: string, orderType?: string, search?: string) {
    const where: any = {};
    if (shopId) where.shopId = shopId;
    if (status) where.status = status;
    if (orderType) where.orderType = orderType;
    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { client: { firstName: { contains: search, mode: 'insensitive' } } },
        { client: { lastName: { contains: search, mode: 'insensitive' } } },
      ];
    }
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

  async updateOrder(id: string, dto: CreateOrderDto, shopId?: string) {
    const existing = await this.prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!existing || (shopId && existing.shopId !== shopId)) {
      throw new NotFoundException('Order not found');
    }

    const scopeShopId = existing.shopId;
    const status = existing.status;
    const newType = dto.orderType;
    const oldHoldsStock =
      status !== 'cancelled' &&
      (existing.orderType === 'sale' || existing.orderType === 'sale_montage');
    const newInvolvesStock = newType === 'sale' || newType === 'sale_montage';
    const newHoldsStock = status !== 'cancelled' && newInvolvesStock;
    const newInvolvesMontage = newType === 'montage' || newType === 'sale_montage';

    // Validate new frame / lenses
    let frame: any = null;
    const lensData: Array<{ lens: any; quantity: number }> = [];
    let lensTotal = 0;

    if (newInvolvesStock) {
      if (!dto.frameId) throw new BadRequestException('A frame is required for a sale');
      frame = await this.prisma.frame.findUnique({ where: { id: dto.frameId } });
      if (!frame || (scopeShopId && frame.shopId !== scopeShopId)) throw new NotFoundException('Frame not found in this shop');
      if (!dto.items || dto.items.length === 0) throw new BadRequestException('At least one lens is required');
      for (const item of dto.items) {
        const lens = await this.prisma.lens.findUnique({ where: { id: item.lensId } });
        if (!lens || (scopeShopId && lens.shopId !== scopeShopId)) throw new NotFoundException(`Lens ${item.lensId} not found in this shop`);
        lensData.push({ lens, quantity: item.quantity });
        lensTotal += lens.price * item.quantity;
      }
    }

    if (dto.clientId) {
      const client = await this.prisma.client.findUnique({ where: { id: dto.clientId } });
      if (!client || (scopeShopId && client.shopId !== scopeShopId)) throw new NotFoundException('Client not found in this shop');
    }

    const labor = newInvolvesMontage ? (dto.laborPrice || 0) : 0;
    const framePrice = frame ? frame.price : 0;
    const totalPrice = framePrice + lensTotal + labor;

    return this.prisma.$transaction(async (tx) => {
      // 1. Restore old stock
      if (oldHoldsStock) {
        if (existing.frameId) {
          await tx.frame.update({ where: { id: existing.frameId }, data: { stock: { increment: 1 } } });
        }
        for (const it of existing.items) {
          await tx.lens.update({ where: { id: it.lensId }, data: { stock: { increment: it.quantity } } });
        }
      }

      // 2. Deduct new stock
      if (newHoldsStock) {
        const freshFrame = await tx.frame.findUnique({ where: { id: dto.frameId } });
        if (!freshFrame || freshFrame.stock < 1) throw new BadRequestException('Selected frame is out of stock');
        await tx.frame.update({ where: { id: dto.frameId }, data: { stock: { decrement: 1 } } });
        for (const item of dto.items!) {
          const freshLens = await tx.lens.findUnique({ where: { id: item.lensId } });
          if (!freshLens || freshLens.stock < item.quantity) throw new BadRequestException('Insufficient lens stock');
          await tx.lens.update({ where: { id: item.lensId }, data: { stock: { decrement: item.quantity } } });
        }
      }

      // 3. Replace items
      await tx.orderItem.deleteMany({ where: { orderId: id } });

      // 4. Update order (status not changed)
      return tx.order.update({
        where: { id },
        data: {
          orderType: newType,
          clientId: dto.clientId || null,
          frameId: newInvolvesStock ? dto.frameId : null,
          totalPrice,
          laborPrice: newInvolvesMontage ? labor : null,
          notes: dto.notes ?? null,
          deliveryDate: dto.deliveryDate ? new Date(dto.deliveryDate) : null,
          ...(newInvolvesStock && dto.items && {
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

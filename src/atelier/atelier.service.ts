import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import PDFDocument from 'pdfkit';

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
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!order || (shopId && order.shopId !== shopId)) {
      throw new NotFoundException(`Order ${id} not found`);
    }

    const wasCancelled = order.status === 'cancelled';
    const willCancel   = dto.status === 'cancelled';
    const involvesStock = order.orderType === 'sale' || order.orderType === 'sale_montage';

    return this.prisma.$transaction(async (tx) => {
      // Restore stock when moving INTO cancelled
      if (!wasCancelled && willCancel && involvesStock) {
        if (order.frameId) {
          await tx.frame.update({ where: { id: order.frameId }, data: { stock: { increment: 1 } } });
        }
        for (const it of order.items) {
          await tx.lens.update({ where: { id: it.lensId }, data: { stock: { increment: it.quantity } } });
        }
      }
      // Re-deduct stock when moving OUT of cancelled
      if (wasCancelled && !willCancel && involvesStock) {
        if (order.frameId) {
          await tx.frame.update({ where: { id: order.frameId }, data: { stock: { decrement: 1 } } });
        }
        for (const it of order.items) {
          await tx.lens.update({ where: { id: it.lensId }, data: { stock: { decrement: it.quantity } } });
        }
      }
      return tx.order.update({
        where: { id },
        data: { status: dto.status },
        include: ORDER_INCLUDE,
      });
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

  async generateInvoice(id: string, shopId?: string): Promise<{ buffer: Buffer; filename: string }> {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        client: true,
        frame: true,
        items: { include: { lens: true } },
        shop: true,
      },
    });
    if (!order || (shopId && order.shopId !== shopId)) {
      throw new NotFoundException('Order not found');
    }

    const shop = order.shop;
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    const done = new Promise<Buffer>((resolve) => doc.on('end', () => resolve(Buffer.concat(chunks))));

    const blue = '#1e40af';
    const gray = '#555555';

    // Shop info (left)
    doc.fillColor(blue).fontSize(22).text(shop?.name || 'OPTIVIEW', 50, 50);
    doc.fillColor(gray).fontSize(9);
    let hy = 78;
    if (shop?.address) { doc.text(shop.address, 50, hy); hy += 12; }
    if (shop?.city)    { doc.text(shop.city,    50, hy); hy += 12; }
    if (shop?.phone)   { doc.text('Tél: ' + shop.phone, 50, hy); hy += 12; }
    if (shop?.ice)     { doc.text('ICE: ' + shop.ice,   50, hy); hy += 12; }

    // Invoice meta (right)
    doc.fillColor('#000').fontSize(18).text('FACTURE', 350, 50, { align: 'right', width: 195 });
    doc.fontSize(10).fillColor(gray)
      .text('N°: ' + order.orderNumber,    350, 80, { align: 'right', width: 195 })
      .text('Date: ' + new Date(order.createdAt).toLocaleDateString('fr-FR'), 350, 94, { align: 'right', width: 195 });

    // Client block
    doc.fillColor('#000').fontSize(11).text('Facturé à:', 50, 150);
    doc.fontSize(10).fillColor('#333');
    if (order.client) {
      doc.text(`${order.client.firstName} ${order.client.lastName}`, 50, 166);
      if (order.client.phone) doc.text(order.client.phone, 50, 180);
    } else {
      doc.text('Client de passage', 50, 166);
    }

    // Table header
    const tableTop = 220;
    doc.fillColor('#fff').rect(50, tableTop, 495, 22).fill(blue);
    doc.fillColor('#fff').fontSize(10);
    doc.text('Désignation', 56, tableTop + 6);
    doc.text('Qté',   350, tableTop + 6, { width: 40, align: 'center' });
    doc.text('P.U.',  395, tableTop + 6, { width: 70, align: 'right' });
    doc.text('Total', 470, tableTop + 6, { width: 70, align: 'right' });

    // Rows
    const rows: { label: string; qty: number; price: number }[] = [];
    if (order.frame) rows.push({ label: `Monture: ${order.frame.brand} ${order.frame.model}`, qty: 1, price: order.frame.price });
    for (const it of order.items) {
      rows.push({ label: `Verre: ${it.lens?.type ?? ''} ${it.lens?.material ?? ''}`, qty: it.quantity, price: it.pricePerUnit });
    }
    if (order.laborPrice) rows.push({ label: "Montage (main d'oeuvre)", qty: 1, price: order.laborPrice });

    let y = tableTop + 30;
    doc.fillColor('#000').fontSize(10);
    rows.forEach((r, i) => {
      if (i % 2 === 1) { doc.fillColor('#f3f4f6').rect(50, y - 4, 495, 20).fill(); }
      doc.fillColor('#000');
      doc.text(r.label, 56, y, { width: 290 });
      doc.text(String(r.qty),                  350, y, { width: 40, align: 'center' });
      doc.text(`${r.price.toFixed(2)}`,         395, y, { width: 70, align: 'right' });
      doc.text(`${(r.qty * r.price).toFixed(2)}`, 470, y, { width: 70, align: 'right' });
      y += 20;
    });

    // Totals (prices stored as TTC, back-compute HT + TVA 20%)
    const totalTTC = order.totalPrice;
    const ht  = totalTTC / 1.2;
    const tva = totalTTC - ht;
    y += 14;
    doc.fontSize(10).fillColor(gray);
    doc.text('Total HT:',  350, y,      { width: 110, align: 'right' });
    doc.text(`${ht.toFixed(2)} MAD`,  470, y, { width: 75, align: 'right' });
    y += 16;
    doc.text('TVA 20%:', 350, y,       { width: 110, align: 'right' });
    doc.text(`${tva.toFixed(2)} MAD`, 470, y, { width: 75, align: 'right' });
    y += 18;
    doc.fillColor(blue).fontSize(13);
    doc.text('Total TTC:', 350, y,            { width: 110, align: 'right' });
    doc.text(`${totalTTC.toFixed(2)} MAD`, 470, y, { width: 75, align: 'right' });

    // Footer
    doc.fillColor(gray).fontSize(8).text('Merci de votre confiance.', 50, 760, { align: 'center', width: 495 });

    doc.end();
    const buffer = await done;
    return { buffer, filename: `Facture-${order.orderNumber}.pdf` };
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

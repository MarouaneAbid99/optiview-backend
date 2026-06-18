import { Controller, Get, Post, Body, Param, Put, Delete, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { AtelierService } from './atelier.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../common/tenant.util';
import { resolveShopId, resolveShopIdForWrite } from '../common/tenant.util';

@Controller('api/atelier')
export class AtelierController {
  constructor(private readonly atelierService: AtelierService) {}

  @Post('orders')
  createOrder(
    @Body() dto: CreateOrderDto,
    @CurrentUser() user: AuthUser,
    @Query('shopId') shopIdParam?: string,
  ) {
    const shopId = resolveShopIdForWrite(user, shopIdParam);
    return this.atelierService.createOrder(dto, shopId);
  }

  @Get('orders/kanban')
  getOrdersByStatus(@CurrentUser() user: AuthUser, @Query('shopId') shopIdParam?: string) {
    const shopId = resolveShopId(user, shopIdParam);
    return this.atelierService.getOrdersByStatus(shopId);
  }

  @Get('orders/stats')
  getStats(@CurrentUser() user: AuthUser, @Query('shopId') shopIdParam?: string) {
    const shopId = resolveShopId(user, shopIdParam);
    return this.atelierService.getOrderStats(shopId);
  }

  @Get('orders')
  findAllOrders(
    @CurrentUser() user: AuthUser,
    @Query('status') status?: string,
    @Query('shopId') shopIdParam?: string,
    @Query('orderType') orderType?: string,
    @Query('search') search?: string,
  ) {
    const shopId = resolveShopId(user, shopIdParam);
    return this.atelierService.findAllOrders(status, shopId, orderType, search);
  }

  @Get('orders/:id/invoice')
  async invoice(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Res() res: Response,
    @Query('shopId') shopIdParam?: string,
  ) {
    const shopId = resolveShopId(user, shopIdParam);
    const { buffer, filename } = await this.atelierService.generateInvoice(id, shopId);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  @Get('orders/:id')
  findOrderById(@Param('id') id: string, @CurrentUser() user: AuthUser, @Query('shopId') shopIdParam?: string) {
    const shopId = resolveShopId(user, shopIdParam);
    return this.atelierService.findOrderById(id, shopId);
  }

  @Put('orders/:id/status')
  updateOrderStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
    @CurrentUser() user: AuthUser,
    @Query('shopId') shopIdParam?: string,
  ) {
    const shopId = resolveShopId(user, shopIdParam);
    return this.atelierService.updateOrderStatus(id, dto, shopId);
  }

  @Put('orders/:id')
  updateOrder(
    @Param('id') id: string,
    @Body() dto: CreateOrderDto,
    @CurrentUser() user: AuthUser,
    @Query('shopId') shopIdParam?: string,
  ) {
    const shopId = resolveShopId(user, shopIdParam);
    return this.atelierService.updateOrder(id, dto, shopId);
  }

  @Delete('orders/:id')
  deleteOrder(@Param('id') id: string, @CurrentUser() user: AuthUser, @Query('shopId') shopIdParam?: string) {
    const shopId = resolveShopId(user, shopIdParam);
    return this.atelierService.deleteOrder(id, shopId);
  }
}

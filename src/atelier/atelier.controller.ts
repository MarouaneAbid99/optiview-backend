import { Controller, Get, Post, Body, Param, Put, Delete, Query } from '@nestjs/common';
import { AtelierService } from './atelier.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { UpdateOrderDto } from './dto/update-order.dto';

@Controller('api/atelier')
export class AtelierController {
  constructor(private readonly atelierService: AtelierService) {}

  @Post('orders')
  createOrder(@Body() dto: CreateOrderDto) {
    return this.atelierService.createOrder(dto);
  }

  @Get('orders/kanban')
  getOrdersByStatus() {
    return this.atelierService.getOrdersByStatus();
  }

  @Get('orders/stats')
  getStats() {
    return this.atelierService.getOrderStats();
  }

  @Get('orders')
  findAllOrders(@Query('status') status?: string) {
    return this.atelierService.findAllOrders(status);
  }

  @Get('orders/:id')
  findOrderById(@Param('id') id: string) {
    return this.atelierService.findOrderById(id);
  }

  @Put('orders/:id/status')
  updateOrderStatus(@Param('id') id: string, @Body() dto: UpdateOrderStatusDto) {
    return this.atelierService.updateOrderStatus(id, dto);
  }

  @Put('orders/:id')
  updateOrder(@Param('id') id: string, @Body() dto: UpdateOrderDto) {
    return this.atelierService.updateOrder(id, dto);
  }

  @Delete('orders/:id')
  deleteOrder(@Param('id') id: string) {
    return this.atelierService.deleteOrder(id);
  }
}

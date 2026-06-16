import { Controller, Get, Post, Body, Param, Put, Delete, Query } from '@nestjs/common';
import { EyewearService } from './eyewear.service';
import { CreateFrameDto } from './dto/create-frame.dto';
import { UpdateFrameDto } from './dto/update-frame.dto';
import { UpdateStockDto } from './dto/update-stock.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../common/tenant.util';
import { resolveShopId, resolveShopIdForWrite } from '../common/tenant.util';

@Controller('api/eyewear')
export class EyewearController {
  constructor(private readonly eyewearService: EyewearService) {}

  @Post('frames')
  createFrame(
    @Body() dto: CreateFrameDto,
    @CurrentUser() user: AuthUser,
    @Query('shopId') shopIdParam?: string,
  ) {
    const shopId = resolveShopIdForWrite(user, shopIdParam);
    return this.eyewearService.createFrame(dto, shopId);
  }

  @Get('frames/stats')
  getInventoryStats(@CurrentUser() user: AuthUser, @Query('shopId') shopIdParam?: string) {
    const shopId = resolveShopId(user, shopIdParam);
    return this.eyewearService.getInventoryStats(shopId);
  }

  @Get('frames/low-stock')
  getLowStockFrames(
    @CurrentUser() user: AuthUser,
    @Query('threshold') threshold = '5',
    @Query('shopId') shopIdParam?: string,
  ) {
    const shopId = resolveShopId(user, shopIdParam);
    return this.eyewearService.getLowStockFrames(parseInt(threshold), shopId);
  }

  @Get('frames')
  findAllFrames(
    @CurrentUser() user: AuthUser,
    @Query('brand') brand?: string,
    @Query('category') category?: string,
    @Query('shopId') shopIdParam?: string,
  ) {
    const shopId = resolveShopId(user, shopIdParam);
    return this.eyewearService.findAllFrames({ brand, category }, shopId);
  }

  @Get('frames/:id')
  findFrameById(@Param('id') id: string, @CurrentUser() user: AuthUser, @Query('shopId') shopIdParam?: string) {
    const shopId = resolveShopId(user, shopIdParam);
    return this.eyewearService.findFrameById(id, shopId);
  }

  @Put('frames/:id/stock')
  updateFrameStock(
    @Param('id') id: string,
    @Body() dto: UpdateStockDto,
    @CurrentUser() user: AuthUser,
    @Query('shopId') shopIdParam?: string,
  ) {
    const shopId = resolveShopId(user, shopIdParam);
    return this.eyewearService.updateFrameStock(id, dto, shopId);
  }

  @Put('frames/:id')
  updateFrame(
    @Param('id') id: string,
    @Body() dto: UpdateFrameDto,
    @CurrentUser() user: AuthUser,
    @Query('shopId') shopIdParam?: string,
  ) {
    const shopId = resolveShopId(user, shopIdParam);
    return this.eyewearService.updateFrame(id, dto, shopId);
  }

  @Delete('frames/:id')
  deleteFrame(@Param('id') id: string, @CurrentUser() user: AuthUser, @Query('shopId') shopIdParam?: string) {
    const shopId = resolveShopId(user, shopIdParam);
    return this.eyewearService.deleteFrame(id, shopId);
  }

  @Get('brands')
  getBrands(@CurrentUser() user: AuthUser, @Query('shopId') shopIdParam?: string) {
    const shopId = resolveShopId(user, shopIdParam);
    return this.eyewearService.getBrands(shopId);
  }

  @Get('categories')
  getCategories(@CurrentUser() user: AuthUser, @Query('shopId') shopIdParam?: string) {
    const shopId = resolveShopId(user, shopIdParam);
    return this.eyewearService.getCategories(shopId);
  }
}

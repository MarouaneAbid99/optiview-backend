import { Controller, Get, Post, Body, Param, Put, Delete, Query } from '@nestjs/common';
import { LensesService } from './lenses.service';
import { CreateLensDto } from './dto/create-lens.dto';
import { UpdateLensDto } from './dto/update-lens.dto';
import { UpdateStockDto } from './dto/update-stock.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../common/tenant.util';
import { resolveShopId, resolveShopIdForWrite } from '../common/tenant.util';

@Controller('api/lenses')
export class LensesController {
  constructor(private readonly lensesService: LensesService) {}

  @Post()
  createLens(
    @Body() dto: CreateLensDto,
    @CurrentUser() user: AuthUser,
    @Query('shopId') shopIdParam?: string,
  ) {
    const shopId = resolveShopIdForWrite(user, shopIdParam);
    return this.lensesService.createLens(dto, shopId);
  }

  @Get('stats')
  getInventoryStats(@CurrentUser() user: AuthUser, @Query('shopId') shopIdParam?: string) {
    const shopId = resolveShopId(user, shopIdParam);
    return this.lensesService.getInventoryStats(shopId);
  }

  @Get('low-stock')
  getLowStockLenses(
    @CurrentUser() user: AuthUser,
    @Query('threshold') threshold = '10',
    @Query('shopId') shopIdParam?: string,
  ) {
    const shopId = resolveShopId(user, shopIdParam);
    return this.lensesService.getLowStockLenses(parseInt(threshold), shopId);
  }

  @Get('types')
  getTypes(@CurrentUser() user: AuthUser, @Query('shopId') shopIdParam?: string) {
    const shopId = resolveShopId(user, shopIdParam);
    return this.lensesService.getTypes(shopId);
  }

  @Get('materials')
  getMaterials(@CurrentUser() user: AuthUser, @Query('shopId') shopIdParam?: string) {
    const shopId = resolveShopId(user, shopIdParam);
    return this.lensesService.getMaterials(shopId);
  }

  @Get()
  findAllLenses(
    @CurrentUser() user: AuthUser,
    @Query('type') type?: string,
    @Query('material') material?: string,
    @Query('shopId') shopIdParam?: string,
  ) {
    const shopId = resolveShopId(user, shopIdParam);
    return this.lensesService.findAllLenses({ type, material }, shopId);
  }

  @Get(':id')
  findLensById(@Param('id') id: string, @CurrentUser() user: AuthUser, @Query('shopId') shopIdParam?: string) {
    const shopId = resolveShopId(user, shopIdParam);
    return this.lensesService.findLensById(id, shopId);
  }

  @Put(':id')
  updateLens(
    @Param('id') id: string,
    @Body() dto: UpdateLensDto,
    @CurrentUser() user: AuthUser,
    @Query('shopId') shopIdParam?: string,
  ) {
    const shopId = resolveShopId(user, shopIdParam);
    return this.lensesService.updateLens(id, dto, shopId);
  }

  @Put(':id/stock')
  updateLensStock(
    @Param('id') id: string,
    @Body() dto: UpdateStockDto,
    @CurrentUser() user: AuthUser,
    @Query('shopId') shopIdParam?: string,
  ) {
    const shopId = resolveShopId(user, shopIdParam);
    return this.lensesService.updateLensStock(id, dto, shopId);
  }

  @Delete(':id')
  deleteLens(@Param('id') id: string, @CurrentUser() user: AuthUser, @Query('shopId') shopIdParam?: string) {
    const shopId = resolveShopId(user, shopIdParam);
    return this.lensesService.deleteLens(id, shopId);
  }
}

import { Controller, Get, Post, Body, Param, Put, Delete } from '@nestjs/common';
import { PanoramaService } from './panorama.service';
import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';
import { CreateHotspotDto } from './dto/create-hotspot.dto';
import { UpdateHotspotDto } from './dto/update-hotspot.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../common/tenant.util';
import { resolveShopId, resolveShopIdForWrite } from '../common/tenant.util';

@Controller('api/panorama')
export class PanoramaController {
  constructor(private readonly panoramaService: PanoramaService) {}

  @Post('stores')
  createStore(@Body() dto: CreateStoreDto, @CurrentUser() user: AuthUser) {
    const shopId = resolveShopIdForWrite(user);
    return this.panoramaService.createStore(dto, shopId);
  }

  @Get('stores')
  findAllStores(@CurrentUser() user: AuthUser) {
    const shopId = resolveShopId(user);
    return this.panoramaService.findAllStores(shopId);
  }

  @Get('stores/:id')
  findStoreById(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    const shopId = resolveShopId(user);
    return this.panoramaService.findStoreById(id, shopId);
  }

  @Put('stores/:id')
  updateStore(@Param('id') id: string, @Body() dto: UpdateStoreDto, @CurrentUser() user: AuthUser) {
    const shopId = resolveShopId(user);
    return this.panoramaService.updateStore(id, dto, shopId);
  }

  @Delete('stores/:id')
  deleteStore(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    const shopId = resolveShopId(user);
    return this.panoramaService.deleteStore(id, shopId);
  }

  @Post('hotspots')
  createHotspot(@Body() dto: CreateHotspotDto, @CurrentUser() user: AuthUser) {
    const shopId = resolveShopId(user);
    return this.panoramaService.createHotspot(dto, shopId);
  }

  @Get('hotspots/store/:storeId')
  findHotspotsByStore(@Param('storeId') storeId: string, @CurrentUser() user: AuthUser) {
    const shopId = resolveShopId(user);
    return this.panoramaService.findHotspotsByStore(storeId, shopId);
  }

  @Put('hotspots/:id')
  updateHotspot(@Param('id') id: string, @Body() dto: UpdateHotspotDto, @CurrentUser() user: AuthUser) {
    const shopId = resolveShopId(user);
    return this.panoramaService.updateHotspot(id, dto, shopId);
  }

  @Delete('hotspots/:id')
  deleteHotspot(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    const shopId = resolveShopId(user);
    return this.panoramaService.deleteHotspot(id, shopId);
  }
}

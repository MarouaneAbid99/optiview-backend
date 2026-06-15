import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
} from '@nestjs/common';
import { PanoramaService } from './panorama.service';
import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';
import { CreateHotspotDto } from './dto/create-hotspot.dto';
import { UpdateHotspotDto } from './dto/update-hotspot.dto';

@Controller('api/panorama')
export class PanoramaController {
  constructor(private readonly panoramaService: PanoramaService) {}

  // STORES
  @Post('stores')
  createStore(@Body() dto: CreateStoreDto) {
    return this.panoramaService.createStore(dto);
  }

  @Get('stores')
  findAllStores() {
    return this.panoramaService.findAllStores();
  }

  @Get('stores/:id')
  findStoreById(@Param('id') id: string) {
    return this.panoramaService.findStoreById(id);
  }

  @Put('stores/:id')
  updateStore(@Param('id') id: string, @Body() dto: UpdateStoreDto) {
    return this.panoramaService.updateStore(id, dto);
  }

  @Delete('stores/:id')
  deleteStore(@Param('id') id: string) {
    return this.panoramaService.deleteStore(id);
  }

  // HOTSPOTS
  @Post('hotspots')
  createHotspot(@Body() dto: CreateHotspotDto) {
    return this.panoramaService.createHotspot(dto);
  }

  @Get('hotspots/store/:storeId')
  findHotspotsByStore(@Param('storeId') storeId: string) {
    return this.panoramaService.findHotspotsByStore(storeId);
  }

  @Put('hotspots/:id')
  updateHotspot(@Param('id') id: string, @Body() dto: UpdateHotspotDto) {
    return this.panoramaService.updateHotspot(id, dto);
  }

  @Delete('hotspots/:id')
  deleteHotspot(@Param('id') id: string) {
    return this.panoramaService.deleteHotspot(id);
  }
}
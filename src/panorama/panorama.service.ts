import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';
import { CreateHotspotDto } from './dto/create-hotspot.dto';
import { UpdateHotspotDto } from './dto/update-hotspot.dto';

@Injectable()
export class PanoramaService {
  constructor(private prisma: PrismaService) {}

  async createStore(dto: CreateStoreDto, shopId: string) {
    return this.prisma.store.create({ data: { ...dto, shopId } });
  }

  async findAllStores(shopId?: string) {
    return this.prisma.store.findMany({ where: shopId ? { shopId } : {} });
  }

  async findStoreById(id: string, shopId?: string) {
    const store = await this.prisma.store.findUnique({
      where: { id },
      include: { hotspots: true },
    });
    if (!store || (shopId && store.shopId !== shopId)) {
      throw new NotFoundException('Store not found');
    }
    return store;
  }

  async updateStore(id: string, dto: UpdateStoreDto, shopId?: string) {
    await this.findStoreById(id, shopId);
    return this.prisma.store.update({ where: { id }, data: dto });
  }

  async deleteStore(id: string, shopId?: string) {
    await this.findStoreById(id, shopId);
    return this.prisma.store.delete({ where: { id } });
  }

  async createHotspot(dto: CreateHotspotDto, shopId?: string) {
    await this.findStoreById(dto.storeId, shopId);
    return this.prisma.hotspot.create({ data: dto });
  }

  async findHotspotsByStore(storeId: string, shopId?: string) {
    await this.findStoreById(storeId, shopId);
    return this.prisma.hotspot.findMany({ where: { storeId } });
  }

  async updateHotspot(id: string, dto: UpdateHotspotDto, shopId?: string) {
    const hotspot = await this.prisma.hotspot.findUnique({
      where: { id },
      include: { store: true },
    });
    if (!hotspot || (shopId && hotspot.store.shopId !== shopId)) {
      throw new NotFoundException('Hotspot not found');
    }
    return this.prisma.hotspot.update({ where: { id }, data: dto });
  }

  async deleteHotspot(id: string, shopId?: string) {
    const hotspot = await this.prisma.hotspot.findUnique({
      where: { id },
      include: { store: true },
    });
    if (!hotspot || (shopId && hotspot.store.shopId !== shopId)) {
      throw new NotFoundException('Hotspot not found');
    }
    return this.prisma.hotspot.delete({ where: { id } });
  }
}

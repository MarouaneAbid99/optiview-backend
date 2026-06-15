import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';
import { CreateHotspotDto } from './dto/create-hotspot.dto';
import { UpdateHotspotDto } from './dto/update-hotspot.dto';

@Injectable()
export class PanoramaService {
  constructor(private prisma: PrismaService) {}

  // STORES
  async createStore(dto: CreateStoreDto) {
    return this.prisma.store.create({ data: dto });
  }

  async findAllStores() {
    return this.prisma.store.findMany();
  }

  async findStoreById(id: string) {
    return this.prisma.store.findUnique({
      where: { id },
      include: { hotspots: true },
    });
  }

  async updateStore(id: string, dto: UpdateStoreDto) {
    return this.prisma.store.update({ where: { id }, data: dto });
  }

  async deleteStore(id: string) {
    return this.prisma.store.delete({ where: { id } });
  }

  // HOTSPOTS
  async createHotspot(dto: CreateHotspotDto) {
    return this.prisma.hotspot.create({ data: dto });
  }

  async findHotspotsByStore(storeId: string) {
    return this.prisma.hotspot.findMany({ where: { storeId } });
  }

  async updateHotspot(id: string, dto: UpdateHotspotDto) {
    return this.prisma.hotspot.update({ where: { id }, data: dto });
  }

  async deleteHotspot(id: string) {
    return this.prisma.hotspot.delete({ where: { id } });
  }
}
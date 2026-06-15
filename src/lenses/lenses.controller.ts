import { Controller, Get, Post, Body, Param, Put, Delete, Query } from '@nestjs/common';
import { LensesService } from './lenses.service';
import { CreateLensDto } from './dto/create-lens.dto';
import { UpdateLensDto } from './dto/update-lens.dto';
import { UpdateStockDto } from './dto/update-stock.dto';

@Controller('api/lenses')
export class LensesController {
  constructor(private readonly lensesService: LensesService) {}

  @Post()
  createLens(@Body() dto: CreateLensDto) {
    return this.lensesService.createLens(dto);
  }

  @Get()
  findAllLenses(@Query('type') type?: string, @Query('material') material?: string) {
    return this.lensesService.findAllLenses({ type, material });
  }

  @Get('stats')
  getInventoryStats() {
    return this.lensesService.getInventoryStats();
  }

  @Get('low-stock')
  getLowStockLenses(@Query('threshold') threshold = '10') {
    return this.lensesService.getLowStockLenses(parseInt(threshold));
  }

  @Get('types')
  getTypes() {
    return this.lensesService.getTypes();
  }

  @Get('materials')
  getMaterials() {
    return this.lensesService.getMaterials();
  }

  @Get(':id')
  findLensById(@Param('id') id: string) {
    return this.lensesService.findLensById(id);
  }

  @Put(':id')
  updateLens(@Param('id') id: string, @Body() dto: UpdateLensDto) {
    return this.lensesService.updateLens(id, dto);
  }

  @Put(':id/stock')
  updateLensStock(@Param('id') id: string, @Body() dto: UpdateStockDto) {
    return this.lensesService.updateLensStock(id, dto);
  }

  @Delete(':id')
  deleteLens(@Param('id') id: string) {
    return this.lensesService.deleteLens(id);
  }
}

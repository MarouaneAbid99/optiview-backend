import { Controller, Get, Post, Body, Param, Put, Delete, Query } from '@nestjs/common';
import { EyewearService } from './eyewear.service';
import { CreateFrameDto } from './dto/create-frame.dto';
import { UpdateFrameDto } from './dto/update-frame.dto';
import { UpdateStockDto } from './dto/update-stock.dto';

@Controller('api/eyewear')
export class EyewearController {
  constructor(private readonly eyewearService: EyewearService) {}

  @Post('frames')
  createFrame(@Body() dto: CreateFrameDto) {
    return this.eyewearService.createFrame(dto);
  }

  @Get('frames/stats')
  getInventoryStats() {
    return this.eyewearService.getInventoryStats();
  }

  @Get('frames/low-stock')
  getLowStockFrames(@Query('threshold') threshold = '5') {
    return this.eyewearService.getLowStockFrames(parseInt(threshold));
  }

  @Get('frames')
  findAllFrames(@Query('brand') brand?: string, @Query('category') category?: string) {
    return this.eyewearService.findAllFrames({ brand, category });
  }

  @Get('frames/:id')
  findFrameById(@Param('id') id: string) {
    return this.eyewearService.findFrameById(id);
  }

  @Put('frames/:id/stock')
  updateFrameStock(@Param('id') id: string, @Body() dto: UpdateStockDto) {
    return this.eyewearService.updateFrameStock(id, dto);
  }

  @Put('frames/:id')
  updateFrame(@Param('id') id: string, @Body() dto: UpdateFrameDto) {
    return this.eyewearService.updateFrame(id, dto);
  }

  @Delete('frames/:id')
  deleteFrame(@Param('id') id: string) {
    return this.eyewearService.deleteFrame(id);
  }

  @Get('brands')
  getBrands() {
    return this.eyewearService.getBrands();
  }

  @Get('categories')
  getCategories() {
    return this.eyewearService.getCategories();
  }
}

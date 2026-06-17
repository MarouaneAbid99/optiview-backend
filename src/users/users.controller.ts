import {
  Controller, Get, Post, Patch, Delete, Body, Param,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { CreateOpticianDto } from './dto/create-optician.dto';
import { UpdateShopDto } from './dto/update-shop.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../common/tenant.util';

@Controller('api/users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // ===== OPTICIAN: employees =====

  @Roles('OPTICIAN')
  @Post('employees')
  createEmployee(@Body() dto: CreateEmployeeDto, @CurrentUser() user: AuthUser) {
    return this.usersService.createEmployee(dto, user.shopId!);
  }

  @Roles('OPTICIAN')
  @Get('employees')
  listEmployees(@CurrentUser() user: AuthUser) {
    return this.usersService.listEmployees(user.shopId!);
  }

  @Roles('OPTICIAN')
  @Patch('employees/:id/active')
  setEmployeeActive(
    @Param('id') id: string,
    @Body('active') active: boolean,
    @CurrentUser() user: AuthUser,
  ) {
    return this.usersService.setEmployeeActive(id, active, user.shopId!);
  }

  @Roles('OPTICIAN')
  @Delete('employees/:id')
  deleteEmployee(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.usersService.deleteEmployee(id, user.shopId!);
  }

  // ===== OPTICIAN: shop settings =====

  @Roles('OPTICIAN')
  @Get('my-shop')
  getMyShop(@CurrentUser() user: AuthUser) {
    return this.usersService.getMyShop(user.shopId!);
  }

  @Roles('OPTICIAN')
  @Patch('my-shop')
  updateMyShop(@Body() dto: UpdateShopDto, @CurrentUser() user: AuthUser) {
    return this.usersService.updateMyShop(user.shopId!, dto);
  }

  // ===== DEVELOPER: opticians + shops =====

  @Roles('DEVELOPER')
  @Post('opticians')
  createOptician(@Body() dto: CreateOpticianDto) {
    return this.usersService.createOptician(dto);
  }

  @Roles('DEVELOPER')
  @Get('opticians')
  listOpticians() {
    return this.usersService.listOpticians();
  }

  @Roles('DEVELOPER')
  @Get('shops')
  listShops() {
    return this.usersService.listShops();
  }

  @Roles('DEVELOPER')
  @Patch('shops/:id/active')
  setShopActive(@Param('id') id: string, @Body('active') active: boolean) {
    return this.usersService.setShopActive(id, active);
  }
}

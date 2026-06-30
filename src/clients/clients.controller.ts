import { Controller, Get, Post, Body, Param, Put, Delete, Query } from '@nestjs/common';
import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { CreatePrescriptionDto } from './dto/create-prescription.dto';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../common/tenant.util';
import { resolveShopId, resolveShopIdForWrite } from '../common/tenant.util';

@Controller('api/clients')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Post()
  createClient(
    @Body() dto: CreateClientDto,
    @CurrentUser() user: AuthUser,
    @Query('shopId') shopIdParam?: string,
  ) {
    const shopId = resolveShopIdForWrite(user, shopIdParam);
    return this.clientsService.createClient(dto, shopId);
  }

  @Get('stats')
  getStats(@CurrentUser() user: AuthUser, @Query('shopId') shopIdParam?: string) {
    const shopId = resolveShopId(user, shopIdParam);
    return this.clientsService.getClientStats(shopId);
  }

  @Get('appointments/upcoming')
  upcomingAppointments(@CurrentUser() user: AuthUser, @Query('shopId') shopIdParam?: string) {
    const shopId = resolveShopId(user, shopIdParam);
    return this.clientsService.upcomingAppointments(shopId);
  }

  @Get()
  findAllClients(
    @CurrentUser() user: AuthUser,
    @Query('search') search?: string,
    @Query('shopId') shopIdParam?: string,
  ) {
    const shopId = resolveShopId(user, shopIdParam);
    return this.clientsService.findAllClients(search, shopId);
  }

  @Get(':id')
  findClientById(@Param('id') id: string, @CurrentUser() user: AuthUser, @Query('shopId') shopIdParam?: string) {
    const shopId = resolveShopId(user, shopIdParam);
    return this.clientsService.findClientById(id, shopId);
  }

  @Put(':id')
  updateClient(@Param('id') id: string, @Body() dto: UpdateClientDto, @CurrentUser() user: AuthUser, @Query('shopId') shopIdParam?: string) {
    const shopId = resolveShopId(user, shopIdParam);
    return this.clientsService.updateClient(id, dto, shopId);
  }

  @Delete(':id')
  deleteClient(@Param('id') id: string, @CurrentUser() user: AuthUser, @Query('shopId') shopIdParam?: string) {
    const shopId = resolveShopId(user, shopIdParam);
    return this.clientsService.deleteClient(id, shopId);
  }

  @Post(':id/prescriptions')
  addPrescription(
    @Param('id') clientId: string,
    @Body() dto: CreatePrescriptionDto,
    @CurrentUser() user: AuthUser,
  ) {
    const shopId = resolveShopId(user);
    return this.clientsService.addPrescription({ ...dto, clientId }, shopId);
  }

  @Get(':id/prescriptions')
  getPrescriptions(@Param('id') clientId: string, @CurrentUser() user: AuthUser) {
    const shopId = resolveShopId(user);
    return this.clientsService.getPrescriptionsByClient(clientId, shopId);
  }

  @Delete('prescriptions/:id')
  deletePrescription(@Param('id') id: string) {
    return this.clientsService.deletePrescription(id);
  }

  @Post(':id/appointments')
  addAppointment(
    @Param('id') clientId: string,
    @Body() dto: CreateAppointmentDto,
    @CurrentUser() user: AuthUser,
  ) {
    const shopId = resolveShopId(user);
    return this.clientsService.addAppointment({ ...dto, clientId }, shopId);
  }

  @Get(':id/appointments')
  getAppointments(@Param('id') clientId: string, @CurrentUser() user: AuthUser) {
    const shopId = resolveShopId(user);
    return this.clientsService.getAppointmentsByClient(clientId, shopId);
  }

  @Put(':id/appointments/:appointmentId')
  updateAppointmentStatus(@Param('appointmentId') id: string, @Body('status') status: string) {
    return this.clientsService.updateAppointmentStatus(id, status);
  }

  @Delete(':id/appointments/:appointmentId')
  deleteAppointment(@Param('appointmentId') id: string) {
    return this.clientsService.deleteAppointment(id);
  }
}

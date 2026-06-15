import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  Query,
} from '@nestjs/common';
import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { CreatePrescriptionDto } from './dto/create-prescription.dto';
import { CreateAppointmentDto } from './dto/create-appointment.dto';

@Controller('api/clients')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  // CLIENTS
  @Post()
  createClient(@Body() dto: CreateClientDto) {
    return this.clientsService.createClient(dto);
  }

  @Get('stats')
  getStats() {
    return this.clientsService.getClientStats();
  }

  @Get()
  findAllClients(@Query('search') search?: string) {
    return this.clientsService.findAllClients(search);
  }

  @Get(':id')
  findClientById(@Param('id') id: string) {
    return this.clientsService.findClientById(id);
  }

  @Put(':id')
  updateClient(@Param('id') id: string, @Body() dto: UpdateClientDto) {
    return this.clientsService.updateClient(id, dto);
  }

  @Delete(':id')
  deleteClient(@Param('id') id: string) {
    return this.clientsService.deleteClient(id);
  }

  // PRESCRIPTIONS
  @Post(':id/prescriptions')
  addPrescription(
    @Param('id') clientId: string,
    @Body() dto: CreatePrescriptionDto,
  ) {
    return this.clientsService.addPrescription({ ...dto, clientId });
  }

  @Get(':id/prescriptions')
  getPrescriptions(@Param('id') clientId: string) {
    return this.clientsService.getPrescriptionsByClient(clientId);
  }

  @Delete('prescriptions/:id')
  deletePrescription(@Param('id') id: string) {
    return this.clientsService.deletePrescription(id);
  }

  // APPOINTMENTS
  @Post(':id/appointments')
  addAppointment(
    @Param('id') clientId: string,
    @Body() dto: CreateAppointmentDto,
  ) {
    return this.clientsService.addAppointment({ ...dto, clientId });
  }

  @Get(':id/appointments')
  getAppointments(@Param('id') clientId: string) {
    return this.clientsService.getAppointmentsByClient(clientId);
  }

  @Put(':id/appointments/:appointmentId')
  updateAppointmentStatus(
    @Param('appointmentId') id: string,
    @Body('status') status: string,
  ) {
    return this.clientsService.updateAppointmentStatus(id, status);
  }

  @Delete(':id/appointments/:appointmentId')
  deleteAppointment(@Param('appointmentId') id: string) {
    return this.clientsService.deleteAppointment(id);
  }
}

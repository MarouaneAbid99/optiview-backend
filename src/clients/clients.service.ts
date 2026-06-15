import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { CreatePrescriptionDto } from './dto/create-prescription.dto';
import { CreateAppointmentDto } from './dto/create-appointment.dto';

@Injectable()
export class ClientsService {
  constructor(private prisma: PrismaService) {}

  // CLIENTS CRUD
  async createClient(dto: CreateClientDto) {
    const data: any = { ...dto };
    if (data.birthDate) data.birthDate = new Date(data.birthDate);
    return this.prisma.client.create({
      data,
      include: {
        prescriptions: true,
        appointments: true,
        purchases: true,
      },
    });
  }

  async findAllClients(search?: string) {
    const where = search
      ? {
          OR: [
            { firstName: { contains: search } },
            { lastName: { contains: search } },
            { email: { contains: search } },
            { phone: { contains: search } },
          ],
        }
      : {};

    return this.prisma.client.findMany({
      where,
      include: {
        prescriptions: { orderBy: { dateIssued: 'desc' }, take: 1 },
        appointments: { orderBy: { dateTime: 'desc' }, take: 1 },
        purchases: { orderBy: { purchaseDate: 'desc' }, take: 1 },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findClientById(id: string) {
    const client = await this.prisma.client.findUnique({
      where: { id },
      include: {
        prescriptions: { orderBy: { dateIssued: 'desc' } },
        appointments: { orderBy: { dateTime: 'desc' } },
        purchases: {
          include: { frame: true },
          orderBy: { purchaseDate: 'desc' },
        },
      },
    });

    if (!client) throw new NotFoundException(`Client ${id} not found`);
    return client;
  }

  async updateClient(id: string, dto: UpdateClientDto) {
    const data: any = { ...dto };
    if (data.birthDate) data.birthDate = new Date(data.birthDate);
    return this.prisma.client.update({
      where: { id },
      data,
      include: {
        prescriptions: true,
        appointments: true,
        purchases: true,
      },
    });
  }

  async deleteClient(id: string) {
    return this.prisma.client.delete({ where: { id } });
  }

  // PRESCRIPTIONS
  async addPrescription(dto: CreatePrescriptionDto) {
    const client = await this.prisma.client.findUnique({ where: { id: dto.clientId } });
    if (!client) throw new NotFoundException(`Client not found`);
    return this.prisma.prescription.create({
      data: { ...dto, dateIssued: new Date(dto.dateIssued) },
    });
  }

  async getPrescriptionsByClient(clientId: string) {
    return this.prisma.prescription.findMany({
      where: { clientId },
      orderBy: { dateIssued: 'desc' },
    });
  }

  async deletePrescription(id: string) {
    return this.prisma.prescription.delete({ where: { id } });
  }

  // APPOINTMENTS
  async addAppointment(dto: CreateAppointmentDto) {
    const client = await this.prisma.client.findUnique({ where: { id: dto.clientId } });
    if (!client) throw new NotFoundException(`Client not found`);
    return this.prisma.appointment.create({
      data: { ...dto, dateTime: new Date(dto.dateTime), status: dto.status ?? 'pending' },
    });
  }

  async getAppointmentsByClient(clientId: string) {
    return this.prisma.appointment.findMany({
      where: { clientId },
      orderBy: { dateTime: 'desc' },
    });
  }

  async updateAppointmentStatus(id: string, status: string) {
    return this.prisma.appointment.update({ where: { id }, data: { status } });
  }

  async deleteAppointment(id: string) {
    return this.prisma.appointment.delete({ where: { id } });
  }

  // STATISTICS
  async getClientStats() {
    const [total, withPrescriptions, withAppointments] = await Promise.all([
      this.prisma.client.count(),
      this.prisma.prescription.findMany({ distinct: ['clientId'], select: { clientId: true } }),
      this.prisma.appointment.findMany({ distinct: ['clientId'], select: { clientId: true } }),
    ]);

    return {
      totalClients: total,
      clientsWithPrescriptions: withPrescriptions.length,
      clientsWithAppointments: withAppointments.length,
    };
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { CreatePrescriptionDto } from './dto/create-prescription.dto';
import { CreateAppointmentDto } from './dto/create-appointment.dto';

@Injectable()
export class ClientsService {
  constructor(private prisma: PrismaService) {}

  async createClient(dto: CreateClientDto, shopId: string) {
    const data: any = { ...dto, shopId };
    if (data.birthDate) data.birthDate = new Date(data.birthDate);
    return this.prisma.client.create({
      data,
      include: { prescriptions: true, appointments: true, purchases: true },
    });
  }

  async findAllClients(search?: string, shopId?: string) {
    const where: any = {};
    if (shopId) where.shopId = shopId;
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }
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

  async findClientById(id: string, shopId?: string) {
    const client = await this.prisma.client.findUnique({
      where: { id },
      include: {
        prescriptions: { orderBy: { dateIssued: 'desc' } },
        appointments: { orderBy: { dateTime: 'desc' } },
        purchases: { include: { frame: true }, orderBy: { purchaseDate: 'desc' } },
      },
    });
    if (!client) throw new NotFoundException(`Client ${id} not found`);
    if (shopId && client.shopId !== shopId) throw new NotFoundException(`Client ${id} not found`);
    return client;
  }

  async updateClient(id: string, dto: UpdateClientDto, shopId?: string) {
    await this.findClientById(id, shopId);
    const data: any = { ...dto };
    if (data.birthDate) data.birthDate = new Date(data.birthDate);
    return this.prisma.client.update({
      where: { id },
      data,
      include: { prescriptions: true, appointments: true, purchases: true },
    });
  }

  async deleteClient(id: string, shopId?: string) {
    await this.findClientById(id, shopId);
    return this.prisma.client.delete({ where: { id } });
  }

  async addPrescription(dto: CreatePrescriptionDto, shopId?: string) {
    await this.findClientById(dto.clientId, shopId);
    return this.prisma.prescription.create({
      data: { ...dto, dateIssued: new Date(dto.dateIssued) },
    });
  }

  async getPrescriptionsByClient(clientId: string, shopId?: string) {
    await this.findClientById(clientId, shopId);
    return this.prisma.prescription.findMany({
      where: { clientId },
      orderBy: { dateIssued: 'desc' },
    });
  }

  async deletePrescription(id: string) {
    return this.prisma.prescription.delete({ where: { id } });
  }

  async addAppointment(dto: CreateAppointmentDto, shopId?: string) {
    await this.findClientById(dto.clientId, shopId);
    return this.prisma.appointment.create({
      data: { ...dto, dateTime: new Date(dto.dateTime), status: dto.status ?? 'pending' },
    });
  }

  async getAppointmentsByClient(clientId: string, shopId?: string) {
    await this.findClientById(clientId, shopId);
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

  async getClientStats(shopId?: string) {
    const where = shopId ? { shopId } : {};
    const [total, withPrescriptions, withAppointments] = await Promise.all([
      this.prisma.client.count({ where }),
      this.prisma.prescription.findMany({
        where: shopId ? { client: { shopId } } : {},
        distinct: ['clientId'],
        select: { clientId: true },
      }),
      this.prisma.appointment.findMany({
        where: shopId ? { client: { shopId } } : {},
        distinct: ['clientId'],
        select: { clientId: true },
      }),
    ]);
    return {
      totalClients: total,
      clientsWithPrescriptions: withPrescriptions.length,
      clientsWithAppointments: withAppointments.length,
    };
  }
}

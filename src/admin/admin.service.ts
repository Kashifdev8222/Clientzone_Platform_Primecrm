import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { AdminLoginDto } from './dto/admin-login.dto';
import type { JwtPayload } from '../common/types/jwt-payload';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  private defaultTenantSlug() {
    return this.config.get<string>('DEFAULT_TENANT_SLUG') || 'apex-ai';
  }

  async login(dto: AdminLoginDto) {
    const slug = this.defaultTenantSlug();
    const tenant = await this.prisma.tenant.findUnique({ where: { slug } });
    if (!tenant) {
      throw new UnauthorizedException({
        status: 'error',
        message: 'Wrong email or password',
      });
    }

    const email = dto.email.trim().toLowerCase();
    const staff = await this.prisma.staffUser.findUnique({
      where: { tenantId_email: { tenantId: tenant.id, email } },
    });
    if (!staff || !staff.isActive) {
      throw new UnauthorizedException({
        status: 'error',
        message: 'Wrong email or password',
      });
    }

    const ok = await bcrypt.compare(dto.password, staff.passwordHash);
    if (!ok) {
      throw new UnauthorizedException({
        status: 'error',
        message: 'Wrong email or password',
      });
    }

    const accessToken = await this.jwt.signAsync({
      sub: staff.id,
      email: staff.email,
      tenantId: tenant.id,
      type: 'staff',
      role: staff.role,
    });

    return {
      status: 'success',
      data: {
        accessToken,
        staffId: staff.id,
        email: staff.email,
        firstName: staff.firstName,
        lastName: staff.lastName,
        role: staff.role,
        tenantId: tenant.id,
        tenantSlug: tenant.slug,
      },
    };
  }

  async me(user: JwtPayload) {
    const staff = await this.prisma.staffUser.findFirst({
      where: { id: user.sub, tenantId: user.tenantId, isActive: true },
    });
    if (!staff) {
      throw new UnauthorizedException({
        status: 'error',
        message: 'Not authenticated',
      });
    }
    return {
      status: 'success',
      data: {
        id: staff.id,
        email: staff.email,
        firstName: staff.firstName,
        lastName: staff.lastName,
        role: staff.role,
        tenantId: staff.tenantId,
      },
    };
  }

  async listClients(user: JwtPayload, q?: string) {
    const where = {
      tenantId: user.tenantId,
      ...(q
        ? {
            OR: [
              { email: { contains: q, mode: 'insensitive' as const } },
              { firstName: { contains: q, mode: 'insensitive' as const } },
              { lastName: { contains: q, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const rows = await this.prisma.client.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        accounts: {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            balance: true,
            currency: true,
          },
        },
      },
    });

    return {
      status: 'success',
      data: rows.map((c) => ({
        id: c.id,
        email: c.email,
        firstName: c.firstName,
        lastName: c.lastName,
        phone: c.phone,
        status: c.status,
        country: c.country,
        createdAt: c.createdAt,
        accounts: c.accounts.map((a) => ({
          id: a.id,
          name: a.name,
          balance: Number(a.balance),
          currency: a.currency,
        })),
      })),
    };
  }

  async getClient(user: JwtPayload, id: string) {
    const client = await this.prisma.client.findFirst({
      where: { id, tenantId: user.tenantId },
      include: {
        accounts: true,
        transactions: { orderBy: { createdAt: 'desc' }, take: 50 },
      },
    });
    if (!client) {
      return { status: 'error', message: 'Client not found' };
    }
    return {
      status: 'success',
      data: {
        id: client.id,
        email: client.email,
        firstName: client.firstName,
        lastName: client.lastName,
        phone: client.phone,
        status: client.status,
        country: client.country,
        createdAt: client.createdAt,
        accounts: client.accounts.map((a) => ({
          id: a.id,
          name: a.name,
          groupName: a.groupName,
          leverage: a.leverage,
          balance: Number(a.balance),
          equity: Number(a.equity),
          currency: a.currency,
          isDemoAccount: a.isDemoAccount,
          isActive: a.isActive,
        })),
        transactions: client.transactions.map((t) => ({
          id: t.id,
          type: t.type,
          status: t.status,
          amount: Number(t.amount),
          currency: t.currency,
          paymentMethod: t.paymentMethod,
          createdAt: t.createdAt,
        })),
      },
    };
  }

  async listAccounts(user: JwtPayload) {
    const rows = await this.prisma.tradingAccount.findMany({
      where: { tenantId: user.tenantId },
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: {
        client: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
    });
    return {
      status: 'success',
      data: rows.map((a) => ({
        id: a.id,
        name: a.name,
        balance: Number(a.balance),
        equity: Number(a.equity),
        currency: a.currency,
        groupName: a.groupName,
        leverage: a.leverage,
        isActive: a.isActive,
        client: a.client,
        createdAt: a.createdAt,
      })),
    };
  }

  async listTransactions(user: JwtPayload) {
    const rows = await this.prisma.transaction.findMany({
      where: { tenantId: user.tenantId },
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: {
        client: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
    });
    return {
      status: 'success',
      data: rows.map((t) => ({
        id: t.id,
        type: t.type,
        status: t.status,
        amount: Number(t.amount),
        currency: t.currency,
        paymentMethod: t.paymentMethod,
        client: t.client,
        accountId: t.accountId,
        createdAt: t.createdAt,
      })),
    };
  }
}

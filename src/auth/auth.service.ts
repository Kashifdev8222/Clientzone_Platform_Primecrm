import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterLeadDto } from './dto/register-lead.dto';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterLeadDto) {
    const slug =
      dto.tenantSlug ||
      this.config.get<string>('DEFAULT_TENANT_SLUG') ||
      'apex-ai';

    const tenant = await this.prisma.tenant.findUnique({ where: { slug } });
    if (!tenant || !tenant.isActive) {
      throw new BadRequestException({
        status: 'error',
        message: 'Tenant not found or inactive',
      });
    }

    let firstName = (dto.firstName || '').trim();
    let lastName = (dto.lastName || '').trim();
    if (dto.fullName?.trim()) {
      const parts = dto.fullName.trim().split(/\s+/);
      firstName = parts[0] || firstName;
      lastName = parts.slice(1).join(' ') || lastName;
    }
    if (!firstName || !lastName) {
      throw new BadRequestException({
        status: 'error',
        message: 'Missing required: firstName / lastName (or fullName)',
      });
    }

    const email = dto.email.trim().toLowerCase();
    const existing = await this.prisma.client.findUnique({
      where: { tenantId_email: { tenantId: tenant.id, email } },
    });
    if (existing) {
      throw new ConflictException({
        status: 'error',
        message: 'Email already registered for this brand',
      });
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const result = await this.prisma.$transaction(async (tx) => {
      const client = await tx.client.create({
        data: {
          tenantId: tenant.id,
          email,
          passwordHash,
          firstName,
          lastName,
          phone: dto.phone,
          country: dto.country || 'PK',
          username: email,
          birthDate: dto.birthDate ? new Date(dto.birthDate) : null,
          isDemo: false,
        },
      });

      const account = await tx.tradingAccount.create({
        data: {
          tenantId: tenant.id,
          clientId: client.id,
          name: 'Main Account',
          groupName: tenant.defaultMtGroup,
          leverage: tenant.defaultLeverage,
          currency: 'USD',
          balance: new Decimal(0),
          equity: new Decimal(0),
          freeMargin: new Decimal(0),
          isDemoAccount: false,
        },
      });

      return { client, account };
    });

    return {
      status: 'success',
      data: {
        id: result.client.id,
        userId: result.client.id,
        email: result.client.email,
        firstName: result.client.firstName,
        lastName: result.client.lastName,
        phone: result.client.phone,
        accountId: result.account.id,
        brandId: tenant.brandId,
        businessUnitId: tenant.businessUnitId,
      },
    };
  }

  async login(dto: LoginDto) {
    const slug = this.config.get<string>('DEFAULT_TENANT_SLUG') || 'apex-ai';
    const tenant = await this.prisma.tenant.findUnique({ where: { slug } });
    if (!tenant) {
      throw new UnauthorizedException({
        status: 'error',
        message: 'Wrong Username or Password',
      });
    }

    const email = dto.email.trim().toLowerCase();
    const client = await this.prisma.client.findUnique({
      where: { tenantId_email: { tenantId: tenant.id, email } },
    });
    if (!client || client.status !== 'active') {
      throw new UnauthorizedException({
        status: 'error',
        message: 'Wrong Username or Password',
      });
    }

    const ok = await bcrypt.compare(dto.password, client.passwordHash);
    if (!ok) {
      throw new UnauthorizedException({
        status: 'error',
        message: 'Wrong Username or Password',
      });
    }

    const accessToken = await this.jwt.signAsync({
      sub: client.id,
      email: client.email,
      tenantId: tenant.id,
      type: 'client',
    });

    return {
      status: 'success',
      data: {
        accessToken,
        userId: client.id,
        subId: client.id,
        email: client.email,
        firstName: client.firstName,
        lastName: client.lastName,
      },
    };
  }
}

import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterLeadDto } from './dto/register-lead.dto';
import {
  ChangePasswordDto,
  ForgotPasswordDto,
  ResetPasswordDto,
} from './dto/password.dto';
import { Decimal } from '@prisma/client/runtime/library';
import type { JwtPayload } from '../common/types/jwt-payload';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  private defaultTenantSlug() {
    return this.config.get<string>('DEFAULT_TENANT_SLUG') || 'apex-ai';
  }

  async register(dto: RegisterLeadDto) {
    const slug = dto.tenantSlug || this.defaultTenantSlug();

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
    const slug = this.defaultTenantSlug();
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

  async forgotPassword(dto: ForgotPasswordDto) {
    const slug = this.defaultTenantSlug();
    const tenant = await this.prisma.tenant.findUnique({ where: { slug } });
    const email = dto.email.trim().toLowerCase();

    const generic = {
      status: 'success',
      message:
        'If that email exists, a reset token was created. Check email (or use resetToken in staging).',
    };

    if (!tenant) return generic;

    const client = await this.prisma.client.findUnique({
      where: { tenantId_email: { tenantId: tenant.id, email } },
    });
    if (!client) return generic;

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await this.prisma.passwordResetToken.create({
      data: {
        tenantId: tenant.id,
        userType: 'client',
        userId: client.id,
        tokenHash,
        expiresAt,
      },
    });

    const expose =
      this.config.get<string>('NODE_ENV') !== 'production' ||
      this.config.get<string>('EXPOSE_RESET_TOKEN') === 'true';

    return {
      ...generic,
      ...(expose ? { data: { resetToken: rawToken, expiresAt } } : {}),
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const tokenHash = crypto
      .createHash('sha256')
      .update(dto.token.trim())
      .digest('hex');

    const row = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
    });
    if (
      !row ||
      row.usedAt ||
      row.userType !== 'client' ||
      row.expiresAt.getTime() < Date.now()
    ) {
      throw new BadRequestException({
        status: 'error',
        message: 'Invalid or expired reset token',
      });
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    await this.prisma.$transaction([
      this.prisma.client.update({
        where: { id: row.userId },
        data: { passwordHash },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: row.id },
        data: { usedAt: new Date() },
      }),
    ]);

    return { status: 'success', message: 'Password updated' };
  }

  async changePassword(user: JwtPayload, dto: ChangePasswordDto) {
    if (user.type !== 'client') {
      throw new UnauthorizedException({
        status: 'error',
        message: 'Client token required',
      });
    }

    const client = await this.prisma.client.findFirst({
      where: { id: user.sub, tenantId: user.tenantId },
    });
    if (!client) {
      throw new UnauthorizedException({
        status: 'error',
        message: 'Not authenticated',
      });
    }

    const ok = await bcrypt.compare(dto.currentPassword, client.passwordHash);
    if (!ok) {
      throw new BadRequestException({
        status: 'error',
        message: 'Current password is incorrect',
      });
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 12);
    await this.prisma.client.update({
      where: { id: client.id },
      data: { passwordHash },
    });

    return { status: 'success', message: 'Password changed' };
  }
}

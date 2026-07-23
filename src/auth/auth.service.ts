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
import { MailService } from '../mail/mail.service';
import { generateTpNumber } from '../common/utils/tp-number';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly mail: MailService,
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

    // Optional: if brandId/businessUnitId sent, must match tenant (PrimeCRM parity)
    if (dto.brandId && tenant.brandId && dto.brandId !== tenant.brandId) {
      throw new BadRequestException({
        status: 'error',
        message: 'brandId does not match this tenant',
      });
    }
    if (
      dto.businessUnitId &&
      tenant.businessUnitId &&
      dto.businessUnitId !== tenant.businessUnitId
    ) {
      throw new BadRequestException({
        status: 'error',
        message: 'businessUnitId does not match this tenant',
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

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const birthDate = this.parseBirthDate(dto.birthDate);
    const isDemo =
      dto.isDemoAccount === true ||
      dto.accounts?.some((a) => a.isDemoAccount === true) === true;

    const customFields =
      typeof dto.customFields === 'string'
        ? dto.customFields
        : dto.customFields
          ? JSON.stringify(dto.customFields)
          : '';

    const tags = (dto.tags || []).map((t) => ({ id: t.id || null }));
    const notes = (dto.notes || []).map((n) => ({ text: n.text || '' }));

    const accountSpecs =
      dto.accounts && dto.accounts.length > 0
        ? dto.accounts
        : [
            {
              groupName: tenant.defaultMtGroup,
              leverage: tenant.defaultLeverage,
              isDemoAccount: isDemo,
            },
          ];

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
          language: dto.language || 'bm',
          customFields,
          username: (dto.username || email).trim(),
          birthDate,
          isDemo: !!isDemo,
          tags,
          notes,
          brandId: dto.brandId || tenant.brandId,
          businessUnitId: dto.businessUnitId || tenant.businessUnitId,
        },
      });

      const accounts: {
        id: string;
        name: string;
        groupName: string;
        leverage: number;
        isDemoAccount: boolean;
        balance: unknown;
        currency: string;
        externalLogin: string | null;
      }[] = [];
      for (let i = 0; i < accountSpecs.length; i++) {
        const spec = accountSpecs[i];
        let externalLogin = generateTpNumber();
        for (let attempt = 0; attempt < 8; attempt++) {
          const clash = await tx.tradingAccount.findFirst({
            where: { tenantId: tenant.id, externalLogin },
            select: { id: true },
          });
          if (!clash) break;
          externalLogin = generateTpNumber();
        }
        const account = await tx.tradingAccount.create({
          data: {
            tenantId: tenant.id,
            clientId: client.id,
            name: accountSpecs.length === 1 ? 'Main Account' : `Account ${i + 1}`,
            groupName: spec.groupName || tenant.defaultMtGroup,
            leverage: spec.leverage ?? tenant.defaultLeverage,
            currency: 'USD',
            balance: new Decimal(0),
            equity: new Decimal(0),
            freeMargin: new Decimal(0),
            isDemoAccount: spec.isDemoAccount ?? !!isDemo,
            externalLogin,
          },
        });
        accounts.push(account);
      }

      return { client, accounts };
    });

    // Shape closer to PrimeCRM + portal wrapper { status, data }
    return {
      status: 'success',
      data: {
        id: result.client.id,
        userId: result.client.id,
        email: result.client.email,
        firstName: result.client.firstName,
        lastName: result.client.lastName,
        phone: result.client.phone,
        country: result.client.country,
        language: result.client.language,
        username: result.client.username,
        birthDate: result.client.birthDate,
        isDemoAccount: result.client.isDemo,
        brandId: result.client.brandId,
        businessUnitId: result.client.businessUnitId,
        tags: result.client.tags,
        notes: result.client.notes,
        accounts: result.accounts.map((a) => ({
          id: a.id,
          name: a.name,
          groupName: a.groupName,
          leverage: a.leverage,
          isDemoAccount: a.isDemoAccount,
          balance: Number(a.balance),
          currency: a.currency,
          tpNumber: a.externalLogin || a.id,
          externalLogin: a.externalLogin,
        })),
        accountId: result.accounts[0]?.id ?? null,
      },
    };
  }

  /** Accept ISO or PrimeCRM odd formats like 2023-12-12:12:12Z */
  private parseBirthDate(raw?: string): Date | null {
    if (!raw || !String(raw).trim()) return null;
    let s = String(raw).trim();
    // "2023-12-12:12:12Z" → "2023-12-12T12:12:00Z"
    if (/^\d{4}-\d{2}-\d{2}:\d{2}:\d{2}/.test(s)) {
      s = s.replace(/^(\d{4}-\d{2}-\d{2}):/, '$1T') + (s.endsWith('Z') ? '' : '');
      if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}Z$/.test(s)) {
        s = s.replace(/Z$/, ':00Z');
      }
    }
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) {
      // date-only
      const d2 = new Date(s.slice(0, 10));
      return Number.isNaN(d2.getTime()) ? null : d2;
    }
    return d;
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

    const mailResult = await this.mail.sendPasswordResetEmail({
      to: client.email,
      firstName: client.firstName,
      resetToken: rawToken,
    });

    const expose =
      this.config.get<string>('NODE_ENV') !== 'production' ||
      this.config.get<string>('EXPOSE_RESET_TOKEN') === 'true';

    return {
      status: 'success',
      message: mailResult.sent
        ? 'If that email exists, a reset email was sent.'
        : 'If that email exists, a reset token was created. Email provider not configured or send failed — use resetToken in staging.',
      data: {
        emailSent: mailResult.sent,
        ...(expose ? { resetToken: rawToken, expiresAt } : {}),
        ...(mailResult.sent || !expose
          ? {}
          : { mailError: mailResult.error }),
      },
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const newPass = (dto.newPassword || dto.password || '').trim();
    if (newPass.length < 6) {
      throw new BadRequestException({
        status: 'error',
        message: 'Password must be at least 6 characters',
      });
    }

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

    const passwordHash = await bcrypt.hash(newPass, 12);
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

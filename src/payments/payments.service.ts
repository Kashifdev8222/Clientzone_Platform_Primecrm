import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../prisma/prisma.service';
import type { JwtPayload } from '../common/types/jwt-payload';
import {
  AdminDepositStatusDto,
  CreateCryptoPayDto,
  CreateLemuxionPayDto,
} from './dto/payments.dto';
import { resolveCryptoCatalog } from './crypto-catalog';
import { normalizeAdminStatus } from '../common/tx-portal-map';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async getPaymentMethodsConfig(user: JwtPayload) {
    const rows = await this.prisma.paymentMethod.findMany({
      where: { tenantId: user.tenantId, isEnabled: true },
      orderBy: { sortOrder: 'asc' },
    });

    const data = rows.map((r) => ({
      type: r.type,
      name: r.name,
      isEnabled: r.isEnabled,
      ...(typeof r.config === 'object' && r.config !== null
        ? (r.config as Record<string, unknown>)
        : {}),
    }));

    return { status: 'success', data };
  }

  async getSupportedCoins(user: JwtPayload) {
    const method = await this.prisma.paymentMethod.findUnique({
      where: {
        tenantId_type: { tenantId: user.tenantId, type: 'CryptoPay' },
      },
    });
    const cfg = (method?.config || {}) as {
      supportedCoins?: string[] | Array<Record<string, unknown>>;
    };
    const data = resolveCryptoCatalog(cfg.supportedCoins);
    return { status: 'success', data };
  }

  private async assertClientAccount(user: JwtPayload, accountId: string) {
    const account = await this.prisma.tradingAccount.findFirst({
      where: {
        id: accountId,
        tenantId: user.tenantId,
        clientId: user.sub,
        isActive: true,
      },
    });
    if (!account) {
      throw new NotFoundException({
        status: 'error',
        message: 'Account not found',
      });
    }
    return account;
  }

  async createCryptoPay(user: JwtPayload, dto: CreateCryptoPayDto) {
    const account = await this.assertClientAccount(user, dto.accountId);
    const method = await this.prisma.paymentMethod.findFirst({
      where: {
        tenantId: user.tenantId,
        type: 'CryptoPay',
        isEnabled: true,
      },
    });
    if (!method) {
      throw new BadRequestException({
        status: 'error',
        message: 'CryptoPay is not enabled',
      });
    }

    const priceCurrency = (dto.priceCurrency || account.currency || 'USD').toUpperCase();
    const payCurrency = dto.payCurrency.toUpperCase();
    const externalRef = `CRYPTO-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const invoiceAddress = `mock_${payCurrency.toLowerCase()}_addr_${externalRef.slice(-8)}`;
    const redirectUrl = `${this.config.get('RENDER_PUBLIC_URL') || 'https://clientzone-platform-primecrm.onrender.com'}/mock-pay/${externalRef}`;

    const tx = await this.prisma.transaction.create({
      data: {
        tenantId: user.tenantId,
        clientId: user.sub,
        accountId: account.id,
        type: 'DEPOSIT',
        status: 'PENDING',
        amount: new Decimal(dto.amount),
        currency: priceCurrency,
        paymentMethod: 'CryptoPay',
        externalRef,
        payCurrency,
        priceCurrency,
        network: dto.network || null,
        invoiceAddress,
        redirectUrl,
        comment: `CryptoPay ${payCurrency}${dto.network ? ` (${dto.network})` : ''}`,
        note: null,
        meta: {
          mode: 'mock',
          payCurrency,
          network: dto.network || null,
        },
      },
    });

    // Portal expects nested data similar to PrimeCRM
    return {
      status: 'success',
      data: {
        id: tx.id,
        transactionId: tx.id,
        externalRef,
        status: tx.status,
        amount: Number(tx.amount),
        currency: tx.currency,
        payCurrency,
        network: dto.network || null,
        address: invoiceAddress,
        invoiceAddress,
        paymentUrl: redirectUrl,
        redirectUrl,
        hosted_page_url: redirectUrl,
        url: redirectUrl,
        message:
          'Mock CryptoPay invoice created. Ask admin to mark COMPLETED to credit balance.',
      },
    };
  }

  async createLemuxionPay(user: JwtPayload, dto: CreateLemuxionPayDto) {
    const account = await this.assertClientAccount(user, dto.accountId);
    const method = await this.prisma.paymentMethod.findFirst({
      where: {
        tenantId: user.tenantId,
        type: 'LemuxionPay',
        isEnabled: true,
      },
    });
    if (!method) {
      throw new BadRequestException({
        status: 'error',
        message: 'LemuxionPay is not enabled',
      });
    }

    const currency = dto.currency.toUpperCase();
    const externalRef = `LMX-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const redirectUrl = `${this.config.get('RENDER_PUBLIC_URL') || 'https://clientzone-platform-primecrm.onrender.com'}/mock-lemuxion/${externalRef}`;

    const tx = await this.prisma.transaction.create({
      data: {
        tenantId: user.tenantId,
        clientId: user.sub,
        accountId: account.id,
        type: 'DEPOSIT',
        status: 'PENDING',
        amount: new Decimal(dto.amount),
        currency,
        paymentMethod: 'LemuxionPay',
        externalRef,
        priceCurrency: currency,
        redirectUrl,
        comment: dto.description || 'LemuxionPay deposit',
        note: null,
        meta: {
          mode: 'mock',
          street: dto.street,
          city: dto.city,
          zip: dto.zip,
          state: dto.state,
          country: dto.country,
          description: dto.description,
        },
      },
    });

    return {
      status: 'success',
      data: {
        id: tx.id,
        transactionId: tx.id,
        externalRef,
        status: tx.status,
        amount: Number(tx.amount),
        currency: tx.currency,
        redirectUrl,
        paymentUrl: redirectUrl,
        hosted_page_url: redirectUrl,
        url: redirectUrl,
        message:
          'Mock Lemuxion payment created. Ask admin to mark COMPLETED to credit balance.',
      },
    };
  }

  async adminListDeposits(user: JwtPayload, status?: string) {
    const rows = await this.prisma.transaction.findMany({
      where: {
        tenantId: user.tenantId,
        type: 'DEPOSIT',
        ...(status ? { status: status as never } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: {
        client: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        account: { select: { id: true, name: true, currency: true } },
      },
    });

    return {
      status: 'success',
      data: rows.map((t) => ({
        id: t.id,
        status: t.status,
        amount: Number(t.amount),
        currency: t.currency,
        paymentMethod: t.paymentMethod,
        externalRef: t.externalRef,
        payCurrency: t.payCurrency,
        redirectUrl: t.redirectUrl,
        invoiceAddress: t.invoiceAddress,
        comment: t.comment,
        note: t.note,
        rejectReason:
          ['FAILED', 'CANCELED'].includes(String(t.status).toUpperCase())
            ? t.note && t.note !== t.comment
              ? t.note
              : null
            : null,
        client: t.client,
        account: t.account,
        createdAt: t.createdAt,
      })),
    };
  }

  async adminUpdateDepositStatus(
    user: JwtPayload,
    id: string,
    dto: AdminDepositStatusDto,
  ) {
    const tx = await this.prisma.transaction.findFirst({
      where: { id, tenantId: user.tenantId, type: 'DEPOSIT' },
    });
    if (!tx) {
      throw new NotFoundException({
        status: 'error',
        message: 'Deposit not found',
      });
    }

    const status = normalizeAdminStatus(dto.status);
    if (!status) {
      throw new BadRequestException({
        status: 'error',
        message: 'Invalid status',
      });
    }

    if (tx.status === 'COMPLETED' && status === 'COMPLETED') {
      return { status: 'success', message: 'Already completed', data: { id: tx.id } };
    }

    const updated = await this.prisma.$transaction(async (db) => {
      const row = await db.transaction.update({
        where: { id: tx.id },
        data: {
          status,
          // comment stays; note = reason for Rejected OR Canceled
          ...(status === 'FAILED'
            ? { note: dto.note?.trim() || 'Rejected by admin' }
            : status === 'CANCELED'
              ? { note: dto.note?.trim() || 'Canceled by admin' }
              : status === 'COMPLETED' || status === 'PENDING' || status === 'PROCESSING'
                ? { note: null }
                : dto.note?.trim()
                  ? { note: dto.note.trim() }
                  : {}),
        },
      });

      // Credit balance only when moving to COMPLETED first time
      if (status === 'COMPLETED' && tx.status !== 'COMPLETED') {
        await db.tradingAccount.update({
          where: { id: tx.accountId },
          data: {
            balance: { increment: tx.amount },
            equity: { increment: tx.amount },
            freeMargin: { increment: tx.amount },
          },
        });
      }

      return row;
    });

    return {
      status: 'success',
      data: {
        id: updated.id,
        status: updated.status,
        amount: Number(updated.amount),
      },
    };
  }

  /** Public webhook stub for future real PSP callbacks */
  async handleWebhook(
    provider: string,
    body: Record<string, unknown>,
  ) {
    const externalRef = String(
      body.externalRef || body.orderId || body.id || '',
    );
    if (!externalRef) {
      return { status: 'error', message: 'Missing externalRef' };
    }

    const tx = await this.prisma.transaction.findFirst({
      where: { externalRef, paymentMethod: { contains: provider } },
    });
    // Soft accept for mock/testing
    return {
      status: 'success',
      message: 'Webhook received (stub)',
      data: {
        provider,
        externalRef,
        matched: Boolean(tx),
        transactionId: tx?.id || null,
      },
    };
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { JwtPayload } from '../common/types/jwt-payload';
import { generateTpNumber, isNumericTp } from '../common/utils/tp-number';

@Injectable()
export class AccountsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Allocate a unique numeric TP for this tenant. */
  async allocateTpNumber(tenantId: string): Promise<string> {
    for (let i = 0; i < 12; i++) {
      const tp = generateTpNumber();
      const clash = await this.prisma.tradingAccount.findFirst({
        where: { tenantId, externalLogin: tp },
        select: { id: true },
      });
      if (!clash) return tp;
    }
    return generateTpNumber() + String(Date.now() % 1000);
  }

  private mapAccount(a: {
    id: string;
    name: string;
    groupName: string;
    leverage: number;
    currency: string;
    balance: { toString(): string } | number;
    equity: { toString(): string } | number;
    credit: { toString(): string } | number;
    margin: { toString(): string } | number;
    freeMargin: { toString(): string } | number;
    isDemoAccount: boolean;
    externalLogin: string | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    const tp = a.externalLogin || a.id;
    const lastSync = a.updatedAt || a.createdAt;
    return {
      id: a.id,
      name: a.name,
      groupName: a.groupName,
      leverage: a.leverage,
      currency: a.currency,
      balance: Number(a.balance),
      equity: Number(a.equity),
      credit: Number(a.credit),
      margin: Number(a.margin),
      freeMargin: Number(a.freeMargin),
      isDemoAccount: a.isDemoAccount,
      externalLogin: a.externalLogin,
      tpNumber: tp,
      accountNumber: tp,
      lastLoginNew: lastSync,
      lastLogin: lastSync,
      lastSyncTime: lastSync,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
      isDisabled: false,
      isArchived: false,
      status: 'Active',
    };
  }

  async listForClient(user: JwtPayload) {
    const accounts = await this.prisma.tradingAccount.findMany({
      where: {
        tenantId: user.tenantId,
        clientId: user.sub,
        isActive: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    // Lazy backfill: old rows used UUID as TP — assign numeric like PrimeCRM
    const fixed = [];
    for (const a of accounts) {
      if (!isNumericTp(a.externalLogin)) {
        const tp = await this.allocateTpNumber(user.tenantId);
        const updated = await this.prisma.tradingAccount.update({
          where: { id: a.id },
          data: { externalLogin: tp },
        });
        fixed.push(updated);
      } else {
        fixed.push(a);
      }
    }

    return {
      status: 'success',
      data: fixed.map((a) => this.mapAccount(a)),
    };
  }

  async rename(user: JwtPayload, accountId: string, name: string) {
    const account = await this.prisma.tradingAccount.findFirst({
      where: {
        id: accountId,
        tenantId: user.tenantId,
        clientId: user.sub,
      },
    });
    if (!account) {
      throw new NotFoundException({
        status: 'error',
        message: 'Account not found',
      });
    }

    const updated = await this.prisma.tradingAccount.update({
      where: { id: accountId },
      data: { name: name.trim() || account.name },
    });

    return {
      status: 'success',
      data: {
        id: updated.id,
        name: updated.name,
        tpNumber: updated.externalLogin || updated.id,
      },
    };
  }
}

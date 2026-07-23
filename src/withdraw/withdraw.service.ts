import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { JwtPayload } from '../common/types/jwt-payload';
import {
  AdminWithdrawStatusDto,
  CancelWithdrawDto,
  CreateSourceDto,
  CreateWithdrawDto,
  EditSourceDto,
} from './dto/withdraw.dto';
import { normalizeAdminStatus } from '../common/tx-portal-map';

@Injectable()
export class WithdrawService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------- Sources (ClientZone) ----------

  async listSources(user: JwtPayload) {
    const rows = await this.prisma.transactionSource.findMany({
      where: {
        tenantId: user.tenantId,
        clientId: user.sub,
        isActive: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const data = rows.map((r) => ({
      id: r.id,
      type: r.type,
      source: r.source,
      value: r.value,
      extraData: r.extraData,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));

    return { status: 'success', data };
  }

  async createSource(user: JwtPayload, dto: CreateSourceDto) {
    const row = await this.prisma.transactionSource.create({
      data: {
        tenantId: user.tenantId,
        clientId: user.sub,
        type: dto.type || 'Withdrawal',
        source: dto.source || 'Crypto',
        value: dto.value,
        extraData: (dto.extraData || {}) as Prisma.InputJsonValue,
      },
    });

    return {
      status: 'success',
      data: {
        id: row.id,
        type: row.type,
        source: row.source,
        value: row.value,
        extraData: row.extraData,
      },
    };
  }

  async editSource(user: JwtPayload, id: string, dto: EditSourceDto) {
    const existing = await this.prisma.transactionSource.findFirst({
      where: {
        id,
        tenantId: user.tenantId,
        clientId: user.sub,
        isActive: true,
      },
    });
    if (!existing) {
      throw new NotFoundException({
        status: 'error',
        message: 'Withdrawal account not found',
      });
    }

    const row = await this.prisma.transactionSource.update({
      where: { id },
      data: {
        type: dto.type || existing.type,
        source: dto.source || existing.source,
        value: dto.value,
        extraData: (dto.extraData || {}) as Prisma.InputJsonValue,
      },
    });

    return {
      status: 'success',
      data: {
        id: row.id,
        type: row.type,
        source: row.source,
        value: row.value,
        extraData: row.extraData,
      },
    };
  }

  async deleteSource(user: JwtPayload, id: string) {
    const existing = await this.prisma.transactionSource.findFirst({
      where: {
        id,
        tenantId: user.tenantId,
        clientId: user.sub,
        isActive: true,
      },
    });
    if (!existing) {
      throw new NotFoundException({
        status: 'error',
        message: 'Withdrawal account not found',
      });
    }

    await this.prisma.transactionSource.update({
      where: { id },
      data: { isActive: false },
    });

    return { status: 'success', data: { id, deleted: true } };
  }

  // ---------- Withdraw (ClientZone) ----------

  async createWithdraw(user: JwtPayload, dto: CreateWithdrawDto) {
    const account = await this.prisma.tradingAccount.findFirst({
      where: {
        id: dto.accountId,
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

    const amount = new Decimal(dto.amount);
    if (amount.greaterThan(account.balance)) {
      throw new BadRequestException({
        status: 'error',
        message: 'Insufficient balance',
      });
    }

    if (dto.transactionSourceId) {
      const src = await this.prisma.transactionSource.findFirst({
        where: {
          id: dto.transactionSourceId,
          tenantId: user.tenantId,
          clientId: user.sub,
          isActive: true,
        },
      });
      if (!src) {
        throw new BadRequestException({
          status: 'error',
          message: 'Invalid transactionSourceId',
        });
      }
    }

    const currency = (dto.currency || account.currency || 'USD').toUpperCase();

    const tx = await this.prisma.$transaction(async (db) => {
      // Hold funds immediately
      await db.tradingAccount.update({
        where: { id: account.id },
        data: {
          balance: { decrement: amount },
          equity: { decrement: amount },
          freeMargin: { decrement: amount },
        },
      });

      return db.transaction.create({
        data: {
          tenantId: user.tenantId,
          clientId: user.sub,
          accountId: account.id,
          type: 'WITHDRAW',
          status: 'PENDING',
          amount,
          currency,
          paymentMethod: 'Withdraw',
          comment: dto.comment || 'Withdraw Performed',
          note: dto.comment || 'Withdraw Performed',
          transactionSourceId: dto.transactionSourceId || null,
          tpNumber: dto.tpNumber || null,
          meta: { held: true },
        },
      });
    });

    return {
      status: 'success',
      data: {
        id: tx.id,
        accountId: tx.accountId,
        amount: Number(tx.amount),
        currency: tx.currency,
        type: 'Withdraw',
        status: tx.status,
        transactionSourceId: tx.transactionSourceId,
        comment: tx.comment,
        createdAt: tx.createdAt,
      },
    };
  }

  async cancelWithdraw(user: JwtPayload, id: string, _dto?: CancelWithdrawDto) {
    const tx = await this.prisma.transaction.findFirst({
      where: {
        id,
        tenantId: user.tenantId,
        clientId: user.sub,
        type: 'WITHDRAW',
      },
    });
    if (!tx) {
      throw new NotFoundException({
        status: 'error',
        message: 'Withdrawal not found',
      });
    }
    if (tx.status !== 'PENDING' && tx.status !== 'PROCESSING') {
      throw new BadRequestException({
        status: 'error',
        message: 'Only pending withdrawals can be canceled',
      });
    }

    const updated = await this.prisma.$transaction(async (db) => {
      const row = await db.transaction.update({
        where: { id: tx.id },
        data: { status: 'CANCELED' },
      });

      // Refund held funds
      await db.tradingAccount.update({
        where: { id: tx.accountId },
        data: {
          balance: { increment: tx.amount },
          equity: { increment: tx.amount },
          freeMargin: { increment: tx.amount },
        },
      });

      return row;
    });

    return {
      status: 'success',
      data: {
        id: updated.id,
        status: 'Canceled',
      },
    };
  }

  // ---------- Admin ----------

  async adminListWithdraws(user: JwtPayload, status?: string) {
    const rows = await this.prisma.transaction.findMany({
      where: {
        tenantId: user.tenantId,
        type: 'WITHDRAW',
        ...(status ? { status: status as never } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: {
        client: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        account: { select: { id: true, name: true, currency: true } },
        transactionSource: true,
      },
    });

    return {
      status: 'success',
      data: rows.map((t) => ({
        id: t.id,
        status: t.status,
        amount: Number(t.amount),
        currency: t.currency,
        comment: t.comment,
        note: t.note,
        rejectReason:
          String(t.status).toUpperCase() === 'FAILED' ? t.note || t.comment : null,
        client: t.client,
        account: t.account,
        source: t.transactionSource
          ? {
              id: t.transactionSource.id,
              source: t.transactionSource.source,
              value: t.transactionSource.value,
              extraData: t.transactionSource.extraData,
            }
          : null,
        createdAt: t.createdAt,
      })),
    };
  }

  async adminUpdateWithdrawStatus(
    user: JwtPayload,
    id: string,
    dto: AdminWithdrawStatusDto,
  ) {
    const tx = await this.prisma.transaction.findFirst({
      where: { id, tenantId: user.tenantId, type: 'WITHDRAW' },
    });
    if (!tx) {
      throw new NotFoundException({
        status: 'error',
        message: 'Withdrawal not found',
      });
    }

    const status = normalizeAdminStatus(dto.status);
    if (!status) {
      throw new BadRequestException({
        status: 'error',
        message: 'Invalid status',
      });
    }

    if (tx.status === 'COMPLETED' || tx.status === 'CANCELED') {
      if (tx.status === status) {
        return {
          status: 'success',
          message: `Already ${tx.status}`,
          data: { id: tx.id, status: tx.status },
        };
      }
      throw new BadRequestException({
        status: 'error',
        message: `Cannot change status from ${tx.status}`,
      });
    }

    const noteText = dto.note?.trim() || tx.note;
    const commentText =
      status === 'FAILED'
        ? dto.note?.trim() || tx.comment || 'Rejected by admin'
        : tx.comment;

    const updated = await this.prisma.$transaction(async (db) => {
      const row = await db.transaction.update({
        where: { id: tx.id },
        data: {
          status,
          note: noteText,
          comment: commentText,
        },
      });

      // Reject / cancel → refund held amount
      if (
        (status === 'FAILED' || status === 'CANCELED') &&
        (tx.status === 'PENDING' || tx.status === 'PROCESSING')
      ) {
        await db.tradingAccount.update({
          where: { id: tx.accountId },
          data: {
            balance: { increment: tx.amount },
            equity: { increment: tx.amount },
            freeMargin: { increment: tx.amount },
          },
        });
      }

      // COMPLETED = paid out (funds already deducted on create)
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
}

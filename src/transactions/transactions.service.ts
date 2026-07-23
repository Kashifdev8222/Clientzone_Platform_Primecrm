import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { JwtPayload } from '../common/types/jwt-payload';

@Injectable()
export class TransactionsService {
  constructor(private readonly prisma: PrismaService) {}

  async listForClient(user: JwtPayload, accountId?: string) {
    const rows = await this.prisma.transaction.findMany({
      where: {
        tenantId: user.tenantId,
        clientId: user.sub,
        ...(accountId ? { accountId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        account: { select: { id: true, externalLogin: true, name: true } },
      },
    });

    const data = rows.map((t) => {
      const tp = t.account?.externalLogin || t.tpNumber || t.accountId;
      return {
        id: t.id,
        accountId: t.accountId,
        tpNumber: tp,
        accountNumber: tp,
        type: t.type,
        // Portal often expects title-case / mixed status labels
        status: t.status,
        amount: Number(t.amount),
        currency: t.currency,
        paymentMethod: t.paymentMethod,
        externalRef: t.externalRef,
        note: t.note,
        comment: t.comment,
        rejectionReason: t.note,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
        account: t.account
          ? {
              id: t.account.id,
              tpNumber: t.account.externalLogin || t.account.id,
              name: t.account.name,
            }
          : null,
      };
    });

    return { status: 'success', data };
  }
}

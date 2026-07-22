import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../common/guards/jwt-auth.guard';

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
    });

    const data = rows.map((t) => ({
      id: t.id,
      accountId: t.accountId,
      type: t.type,
      status: t.status,
      amount: Number(t.amount),
      currency: t.currency,
      paymentMethod: t.paymentMethod,
      externalRef: t.externalRef,
      note: t.note,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    }));

    return { status: 'success', data };
  }
}

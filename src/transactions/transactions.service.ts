import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { JwtPayload } from '../common/types/jwt-payload';
import { mapPortalTransaction } from '../common/tx-portal-map';

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
      take: 200,
      include: {
        account: { select: { id: true, externalLogin: true, name: true } },
      },
    });

    return {
      status: 'success',
      data: rows.map((t) => mapPortalTransaction(t)),
    };
  }
}

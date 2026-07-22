import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../common/guards/jwt-auth.guard';

@Injectable()
export class AccountsService {
  constructor(private readonly prisma: PrismaService) {}

  async listForClient(user: JwtPayload) {
    const accounts = await this.prisma.tradingAccount.findMany({
      where: {
        tenantId: user.tenantId,
        clientId: user.sub,
        isActive: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    const data = accounts.map((a) => ({
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
      createdAt: a.createdAt,
    }));

    return { status: 'success', data };
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
      },
    };
  }
}

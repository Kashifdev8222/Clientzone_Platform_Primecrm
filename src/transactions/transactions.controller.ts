import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { ClientJwtGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../common/types/jwt-payload';

@Controller('api/v1/clientzone/lead/account')
@UseGuards(ClientJwtGuard)
export class TransactionsController {
  constructor(private readonly transactions: TransactionsService) {}

  @Get('transactions')
  list(
    @CurrentUser() user: JwtPayload,
    @Query('accountId') accountId?: string,
  ) {
    return this.transactions.listForClient(user, accountId);
  }
}

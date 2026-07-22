import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { ClientJwtGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../common/types/jwt-payload';
import { CreateCryptoPayDto, CreateLemuxionPayDto } from './dto/payments.dto';

@Controller('api/v1/clientzone')
@UseGuards(ClientJwtGuard)
export class ClientPaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Get('payment-methods/config')
  methods(@CurrentUser() user: JwtPayload) {
    return this.payments.getPaymentMethodsConfig(user);
  }

  @Get('lead/account/transaction/crypto-pay/supported-coins')
  coins(@CurrentUser() user: JwtPayload) {
    return this.payments.getSupportedCoins(user);
  }

  @Post('lead/account/transaction/crypto-pay')
  crypto(@CurrentUser() user: JwtPayload, @Body() dto: CreateCryptoPayDto) {
    return this.payments.createCryptoPay(user, dto);
  }

  @Post('lead/account/transaction/lemuxion-pay')
  lemuxion(@CurrentUser() user: JwtPayload, @Body() dto: CreateLemuxionPayDto) {
    return this.payments.createLemuxionPay(user, dto);
  }
}

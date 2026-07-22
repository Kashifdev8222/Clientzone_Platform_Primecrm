import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { StaffJwtGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../common/types/jwt-payload';
import { AdminDepositStatusDto } from './dto/payments.dto';

@Controller('api/v1/admin')
@UseGuards(StaffJwtGuard)
export class AdminPaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Get('deposits')
  list(@CurrentUser() user: JwtPayload, @Query('status') status?: string) {
    return this.payments.adminListDeposits(user, status);
  }

  @Patch('deposits/:id/status')
  updateStatus(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: AdminDepositStatusDto,
  ) {
    return this.payments.adminUpdateDepositStatus(user, id, dto);
  }
}

@Controller('api/v1/webhooks')
export class PaymentsWebhookController {
  constructor(private readonly payments: PaymentsService) {}

  @Post(':provider')
  webhook(
    @Param('provider') provider: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.payments.handleWebhook(provider, body);
  }
}

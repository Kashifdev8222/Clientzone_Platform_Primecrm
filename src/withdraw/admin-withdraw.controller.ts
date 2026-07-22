import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { WithdrawService } from './withdraw.service';
import { StaffJwtGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../common/types/jwt-payload';
import { AdminWithdrawStatusDto } from './dto/withdraw.dto';

@Controller('api/v1/admin')
@UseGuards(StaffJwtGuard)
export class AdminWithdrawController {
  constructor(private readonly withdraw: WithdrawService) {}

  @Get('withdrawals')
  list(@CurrentUser() user: JwtPayload, @Query('status') status?: string) {
    return this.withdraw.adminListWithdraws(user, status);
  }

  @Patch('withdrawals/:id/status')
  updateStatus(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: AdminWithdrawStatusDto,
  ) {
    return this.withdraw.adminUpdateWithdrawStatus(user, id, dto);
  }
}

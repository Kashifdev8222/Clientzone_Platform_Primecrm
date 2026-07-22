import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { WithdrawService } from './withdraw.service';
import { ClientWithdrawController } from './client-withdraw.controller';
import { AdminWithdrawController } from './admin-withdraw.controller';

@Module({
  imports: [AuthModule],
  controllers: [ClientWithdrawController, AdminWithdrawController],
  providers: [WithdrawService],
  exports: [WithdrawService],
})
export class WithdrawModule {}

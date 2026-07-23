import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { HealthController } from './health.controller';
import { AuthModule } from './auth/auth.module';
import { LeadsModule } from './leads/leads.module';
import { AccountsModule } from './accounts/accounts.module';
import { TransactionsModule } from './transactions/transactions.module';
import { AdminModule } from './admin/admin.module';
import { MailModule } from './mail/mail.module';
import { PaymentsModule } from './payments/payments.module';
import { WithdrawModule } from './withdraw/withdraw.module';
import { StorageModule } from './storage/storage.module';
import { KycModule } from './kyc/kyc.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    MailModule,
    StorageModule,
    AuthModule,
    LeadsModule,
    AccountsModule,
    TransactionsModule,
    AdminModule,
    PaymentsModule,
    WithdrawModule,
    KycModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}

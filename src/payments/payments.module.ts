import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PaymentsService } from './payments.service';
import { ClientPaymentsController } from './client-payments.controller';
import {
  AdminPaymentsController,
  PaymentsWebhookController,
} from './admin-payments.controller';

@Module({
  imports: [AuthModule],
  controllers: [
    ClientPaymentsController,
    AdminPaymentsController,
    PaymentsWebhookController,
  ],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}

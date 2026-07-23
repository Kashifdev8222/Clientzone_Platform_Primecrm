import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { KycService } from './kyc.service';
import { ClientKycController } from './client-kyc.controller';
import { AdminKycController } from './admin-kyc.controller';

@Module({
  imports: [AuthModule],
  controllers: [ClientKycController, AdminKycController],
  providers: [KycService],
  exports: [KycService],
})
export class KycModule {}

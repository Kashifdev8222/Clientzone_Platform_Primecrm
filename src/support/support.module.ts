import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SupportService } from './support.service';
import { ClientSupportController } from './client-support.controller';
import { AdminSupportController } from './admin-support.controller';

@Module({
  imports: [AuthModule],
  controllers: [ClientSupportController, AdminSupportController],
  providers: [SupportService],
  exports: [SupportService],
})
export class SupportModule {}

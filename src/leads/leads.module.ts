import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { LeadsController } from './leads.controller';

@Module({
  imports: [AuthModule],
  controllers: [LeadsController],
})
export class LeadsModule {}

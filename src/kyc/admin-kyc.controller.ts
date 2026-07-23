import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { KycService } from './kyc.service';
import { StaffJwtGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../common/types/jwt-payload';
import { AdminKycReviewDto } from './dto/kyc.dto';

@Controller('api/v1/admin')
@UseGuards(StaffJwtGuard)
export class AdminKycController {
  constructor(private readonly kyc: KycService) {}

  @Get('documents')
  list(@CurrentUser() user: JwtPayload, @Query('status') status?: string) {
    return this.kyc.adminList(user, status);
  }

  @Patch('documents/:id/review')
  review(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: AdminKycReviewDto,
  ) {
    return this.kyc.adminReview(user, id, dto);
  }
}

import {
  Controller,
  Get,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  Body,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { KycService } from './kyc.service';
import { ClientJwtGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../common/types/jwt-payload';

@Controller('api/v1/clientzone')
@UseGuards(ClientJwtGuard)
export class ClientKycController {
  constructor(private readonly kyc: KycService) {}

  @Post('documents')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  upload(
    @CurrentUser() user: JwtPayload,
    @UploadedFile() file: Express.Multer.File,
    @Body('document') document?: string,
  ) {
    return this.kyc.upload(user, file, document);
  }

  @Get('documents/all')
  list(@CurrentUser() user: JwtPayload) {
    return this.kyc.listForClient(user);
  }
}

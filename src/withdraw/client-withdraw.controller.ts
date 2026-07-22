import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { WithdrawService } from './withdraw.service';
import { ClientJwtGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../common/types/jwt-payload';
import {
  CancelWithdrawDto,
  CreateSourceDto,
  CreateWithdrawDto,
  EditSourceDto,
} from './dto/withdraw.dto';

@Controller('api/v1/clientzone')
@UseGuards(ClientJwtGuard)
export class ClientWithdrawController {
  constructor(private readonly withdraw: WithdrawService) {}

  /** Create withdraw — same path PrimeCRM uses for POST transactions */
  @Post('lead/account/transactions')
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateWithdrawDto) {
    return this.withdraw.createWithdraw(user, dto);
  }

  /** Cancel pending withdraw */
  @Patch('lead/account/transactions/:id')
  cancel(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: CancelWithdrawDto,
  ) {
    return this.withdraw.cancelWithdraw(user, id, dto);
  }

  @Get('transaction-source/get')
  listSources(@CurrentUser() user: JwtPayload) {
    return this.withdraw.listSources(user);
  }

  @Post('transaction-source/create')
  createSource(@CurrentUser() user: JwtPayload, @Body() dto: CreateSourceDto) {
    return this.withdraw.createSource(user, dto);
  }

  @Patch('transaction-source/edit/:id')
  editSource(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: EditSourceDto,
  ) {
    return this.withdraw.editSource(user, id, dto);
  }

  @Delete('transaction-source/delete/:id')
  deleteSource(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.withdraw.deleteSource(user, id);
  }
}

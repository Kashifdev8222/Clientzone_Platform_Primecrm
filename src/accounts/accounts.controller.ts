import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { IsOptional, IsString, MinLength } from 'class-validator';
import { AccountsService } from './accounts.service';
import { ClientJwtGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../common/types/jwt-payload';

class RenameAccountDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;
}

@Controller('api/v1/clientzone/lead')
@UseGuards(ClientJwtGuard)
export class AccountsController {
  constructor(private readonly accounts: AccountsService) {}

  @Get('accounts')
  list(@CurrentUser() user: JwtPayload) {
    return this.accounts.listForClient(user);
  }

  @Patch('accounts/:id/name')
  rename(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: RenameAccountDto,
    @Query('name') nameQuery?: string,
  ) {
    const name = (dto?.name || nameQuery || '').trim();
    return this.accounts.rename(user, id, name);
  }
}

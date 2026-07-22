import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminLoginDto } from './dto/admin-login.dto';
import { StaffJwtGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../common/types/jwt-payload';

@Controller('api/v1/admin')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Post('auth/login')
  login(@Body() dto: AdminLoginDto) {
    return this.admin.login(dto);
  }

  @Get('me')
  @UseGuards(StaffJwtGuard)
  me(@CurrentUser() user: JwtPayload) {
    return this.admin.me(user);
  }

  @Get('clients')
  @UseGuards(StaffJwtGuard)
  clients(@CurrentUser() user: JwtPayload, @Query('q') q?: string) {
    return this.admin.listClients(user, q);
  }

  @Get('clients/:id')
  @UseGuards(StaffJwtGuard)
  client(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.admin.getClient(user, id);
  }

  @Get('accounts')
  @UseGuards(StaffJwtGuard)
  accounts(@CurrentUser() user: JwtPayload) {
    return this.admin.listAccounts(user);
  }

  @Get('transactions')
  @UseGuards(StaffJwtGuard)
  transactions(@CurrentUser() user: JwtPayload) {
    return this.admin.listTransactions(user);
  }
}

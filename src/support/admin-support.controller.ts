import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { SupportService } from './support.service';
import { StaffJwtGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../common/types/jwt-payload';
import {
  AdminPatchMeetingDto,
  AdminPatchTicketDto,
  AdminTicketCommentDto,
  CreateDepartmentDto,
  PatchDepartmentDto,
} from './dto/support.dto';

@Controller('api/v1/admin')
@UseGuards(StaffJwtGuard)
export class AdminSupportController {
  constructor(private readonly support: SupportService) {}

  @Get('departments')
  listDepartments(@CurrentUser() user: JwtPayload) {
    return this.support.adminListDepartments(user);
  }

  @Post('departments')
  createDepartment(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateDepartmentDto,
  ) {
    return this.support.adminCreateDepartment(user, dto);
  }

  @Patch('departments/:id')
  patchDepartment(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: PatchDepartmentDto,
  ) {
    return this.support.adminPatchDepartment(user, id, dto);
  }

  @Get('tickets')
  listTickets(
    @CurrentUser() user: JwtPayload,
    @Query('status') status?: string,
  ) {
    return this.support.adminListTickets(user, status);
  }

  @Get('tickets/:id')
  getTicket(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.support.adminGetTicket(user, id);
  }

  @Patch('tickets/:id')
  patchTicket(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: AdminPatchTicketDto,
  ) {
    return this.support.adminPatchTicket(user, id, dto);
  }

  @Post('tickets/:id/comments')
  comment(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: AdminTicketCommentDto,
  ) {
    return this.support.adminAddComment(user, id, dto);
  }

  @Get('meetings')
  listMeetings(
    @CurrentUser() user: JwtPayload,
    @Query('status') status?: string,
  ) {
    return this.support.adminListMeetings(user, status);
  }

  @Patch('meetings/:id')
  patchMeeting(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: AdminPatchMeetingDto,
  ) {
    return this.support.adminPatchMeeting(user, id, dto);
  }
}

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
import { SupportService } from './support.service';
import { ClientJwtGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../common/types/jwt-payload';
import {
  CreateMeetingDto,
  CreateTicketCommentDto,
  CreateTicketDto,
  PatchMeetingDto,
  PatchTicketDto,
} from './dto/support.dto';

@Controller('api/v1/clientzone')
@UseGuards(ClientJwtGuard)
export class ClientSupportController {
  constructor(private readonly support: SupportService) {}

  // ── Tickets (static paths before :id) ─────────────────────

  @Get('lead/ticket/department')
  departments(@CurrentUser() user: JwtPayload) {
    return this.support.listDepartments(user);
  }

  @Get('lead/ticket/user')
  listTickets(@CurrentUser() user: JwtPayload) {
    return this.support.listTicketsForClient(user);
  }

  @Get('lead/ticket')
  listTicketsAlt(@CurrentUser() user: JwtPayload) {
    return this.support.listTicketsForClient(user);
  }

  @Post('lead/ticket')
  createTicket(@CurrentUser() user: JwtPayload, @Body() dto: CreateTicketDto) {
    return this.support.createTicket(user, dto);
  }

  @Get('lead/ticket/:id')
  getTicket(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.support.getTicketForClient(user, id);
  }

  @Patch('lead/ticket/:id')
  patchTicket(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: PatchTicketDto,
  ) {
    return this.support.patchTicketForClient(user, id, dto);
  }

  @Post('lead/ticket-comment')
  comment(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateTicketCommentDto,
  ) {
    return this.support.addComment(user, dto);
  }

  // ── Meetings (static paths before :id) ────────────────────

  @Get('call-meeting-appointment/user')
  listMeetings(@CurrentUser() user: JwtPayload) {
    return this.support.listMeetingsForClient(user);
  }

  @Get('call-meeting-appointment/agent/time-slots/:date/:duration')
  timeSlots(
    @CurrentUser() user: JwtPayload,
    @Param('date') date: string,
    @Param('duration') duration: string,
  ) {
    return this.support.timeSlots(user, date, duration);
  }

  @Post('call-meeting-appointment')
  createMeeting(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateMeetingDto,
  ) {
    return this.support.createMeeting(user, dto);
  }

  @Patch('call-meeting-appointment/:id')
  patchMeeting(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: PatchMeetingDto,
  ) {
    return this.support.patchMeetingForClient(user, id, dto);
  }

  @Delete('call-meeting-appointment/:id')
  deleteMeeting(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.support.deleteMeetingForClient(user, id);
  }
}

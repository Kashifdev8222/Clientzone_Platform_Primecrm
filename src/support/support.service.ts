import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { JwtPayload } from '../common/types/jwt-payload';
import {
  AdminPatchMeetingDto,
  AdminPatchTicketDto,
  AdminTicketCommentDto,
  CreateDepartmentDto,
  CreateMeetingDto,
  CreateTicketCommentDto,
  CreateTicketDto,
  PatchDepartmentDto,
  PatchMeetingDto,
  PatchTicketDto,
} from './dto/support.dto';

function normalizeTicketStatus(raw: string): string {
  const s = String(raw || '').trim();
  const lower = s.toLowerCase().replace(/\s+/g, '');
  if (lower === 'closed') return 'Closed';
  if (lower === 'open') return 'Open';
  if (lower === 'inprogress' || lower === 'in_progress') return 'InProgress';
  if (lower === 'new') return 'New';
  return s || 'New';
}

function normalizeMeetingStatus(raw: string): string {
  const s = String(raw || '').trim().toLowerCase();
  if (s === 'cancelled' || s === 'canceled') return 'canceled';
  if (s === 'confirmed' || s === 'approved') return 'confirmed';
  if (s === 'completed' || s === 'done') return 'completed';
  if (s === 'scheduled' || s === 'pending' || s === '') return 'scheduled';
  return s;
}

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

function minutesToLabel(m: number) {
  const h = Math.floor(m / 60) % 24;
  const mi = m % 60;
  return `${pad2(h)}:${pad2(mi)}`;
}

@Injectable()
export class SupportService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Departments ─────────────────────────────────────────

  async listDepartments(user: JwtPayload) {
    const rows = await this.prisma.ticketDepartment.findMany({
      where: { tenantId: user.tenantId, isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    return {
      status: 'success',
      data: rows.map((d) => ({
        id: d.id,
        name: d.name,
        sortOrder: d.sortOrder,
      })),
    };
  }

  async adminListDepartments(user: JwtPayload) {
    const rows = await this.prisma.ticketDepartment.findMany({
      where: { tenantId: user.tenantId },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    return { status: 'success', data: rows };
  }

  async adminCreateDepartment(user: JwtPayload, dto: CreateDepartmentDto) {
    const row = await this.prisma.ticketDepartment.create({
      data: {
        tenantId: user.tenantId,
        name: dto.name.trim(),
        sortOrder: dto.sortOrder ?? 0,
      },
    });
    return { status: 'success', data: row };
  }

  async adminPatchDepartment(
    user: JwtPayload,
    id: string,
    dto: PatchDepartmentDto,
  ) {
    const existing = await this.prisma.ticketDepartment.findFirst({
      where: { id, tenantId: user.tenantId },
    });
    if (!existing) {
      throw new NotFoundException({
        status: 'error',
        message: 'Department not found',
      });
    }
    const row = await this.prisma.ticketDepartment.update({
      where: { id },
      data: {
        ...(dto.name != null ? { name: dto.name.trim() } : {}),
        ...(dto.isActive != null ? { isActive: dto.isActive } : {}),
        ...(dto.sortOrder != null ? { sortOrder: dto.sortOrder } : {}),
      },
    });
    return { status: 'success', data: row };
  }

  // ─── Tickets (Client) ────────────────────────────────────

  async createTicket(user: JwtPayload, dto: CreateTicketDto) {
    const title = String(dto.title || '').trim();
    if (!title) {
      throw new BadRequestException({
        status: 'error',
        message: 'title is required',
      });
    }

    const initial =
      dto.userTicketComments?.[0]?.text ||
      dto.initialMessage ||
      dto.text ||
      '';
    const text = String(initial).trim();
    if (!text) {
      throw new BadRequestException({
        status: 'error',
        message: 'initial message is required',
      });
    }

    let departmentId = dto.departmentId?.trim() || null;
    if (departmentId) {
      const dept = await this.prisma.ticketDepartment.findFirst({
        where: {
          id: departmentId,
          tenantId: user.tenantId,
          isActive: true,
        },
      });
      if (!dept) {
        throw new BadRequestException({
          status: 'error',
          message: 'Invalid departmentId',
        });
      }
    } else {
      const first = await this.prisma.ticketDepartment.findFirst({
        where: { tenantId: user.tenantId, isActive: true },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      });
      departmentId = first?.id || null;
    }

    const ticket = await this.prisma.ticket.create({
      data: {
        tenantId: user.tenantId,
        clientId: user.sub,
        departmentId,
        category: String(dto.category || 'Other').trim() || 'Other',
        title,
        status: 'New',
        comments: {
          create: {
            tenantId: user.tenantId,
            authorType: 'client',
            authorId: user.sub,
            text,
          },
        },
      },
      include: {
        comments: { orderBy: { createdAt: 'asc' } },
        department: true,
      },
    });

    return { status: 'success', data: this.mapTicket(ticket) };
  }

  async listTicketsForClient(user: JwtPayload) {
    const rows = await this.prisma.ticket.findMany({
      where: { tenantId: user.tenantId, clientId: user.sub },
      orderBy: { createdAt: 'desc' },
      include: {
        comments: { orderBy: { createdAt: 'asc' } },
        department: true,
      },
    });
    return { status: 'success', data: rows.map((t) => this.mapTicket(t)) };
  }

  async getTicketForClient(user: JwtPayload, id: string) {
    const ticket = await this.prisma.ticket.findFirst({
      where: { id, tenantId: user.tenantId, clientId: user.sub },
      include: {
        comments: { orderBy: { createdAt: 'asc' } },
        department: true,
      },
    });
    if (!ticket) {
      throw new NotFoundException({
        status: 'error',
        message: 'Ticket not found',
      });
    }
    return { status: 'success', data: this.mapTicket(ticket) };
  }

  async patchTicketForClient(
    user: JwtPayload,
    id: string,
    dto: PatchTicketDto,
  ) {
    const ticket = await this.prisma.ticket.findFirst({
      where: { id, tenantId: user.tenantId, clientId: user.sub },
    });
    if (!ticket) {
      throw new NotFoundException({
        status: 'error',
        message: 'Ticket not found',
      });
    }

    if (dto.status != null) {
      const next = normalizeTicketStatus(dto.status);
      if (next !== 'Closed') {
        throw new BadRequestException({
          status: 'error',
          message: 'Clients can only close tickets',
        });
      }
    }

    const updated = await this.prisma.ticket.update({
      where: { id },
      data: {
        ...(dto.status != null ? { status: 'Closed' } : {}),
        ...(dto.title != null ? { title: dto.title.trim() } : {}),
        ...(dto.category != null ? { category: dto.category.trim() } : {}),
        ...(dto.departmentId != null
          ? { departmentId: dto.departmentId || null }
          : {}),
      },
      include: {
        comments: { orderBy: { createdAt: 'asc' } },
        department: true,
      },
    });

    return { status: 'success', data: this.mapTicket(updated) };
  }

  async addComment(user: JwtPayload, dto: CreateTicketCommentDto) {
    const text = String(dto.text || '').trim();
    if (!text) {
      throw new BadRequestException({
        status: 'error',
        message: 'text is required',
      });
    }
    const ticketId = String(dto.userTicketId || '').trim();
    const ticket = await this.prisma.ticket.findFirst({
      where: { id: ticketId, tenantId: user.tenantId, clientId: user.sub },
    });
    if (!ticket) {
      throw new NotFoundException({
        status: 'error',
        message: 'Ticket not found',
      });
    }
    if (String(ticket.status).toLowerCase() === 'closed') {
      throw new BadRequestException({
        status: 'error',
        message: 'Cannot comment on a closed ticket',
      });
    }

    const comment = await this.prisma.ticketComment.create({
      data: {
        tenantId: user.tenantId,
        ticketId,
        authorType: 'client',
        authorId: user.sub,
        text,
      },
    });

    // Bump ticket activity; reopen if was somehow stuck
    await this.prisma.ticket.update({
      where: { id: ticketId },
      data: {
        updatedAt: new Date(),
        ...(ticket.status === 'New' ? { status: 'Open' } : {}),
      },
    });

    return {
      status: 'success',
      data: {
        id: comment.id,
        text: comment.text,
        userId: comment.authorId,
        userTicketId: ticketId,
        createdAt: comment.createdAt,
        authorType: comment.authorType,
      },
    };
  }

  // ─── Tickets (Admin) ─────────────────────────────────────

  async adminListTickets(user: JwtPayload, status?: string) {
    const rows = await this.prisma.ticket.findMany({
      where: {
        tenantId: user.tenantId,
        ...(status ? { status: normalizeTicketStatus(status) } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: {
        comments: { orderBy: { createdAt: 'asc' } },
        department: true,
        client: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
    });
    return {
      status: 'success',
      data: rows.map((t) => ({
        ...this.mapTicket(t),
        client: t.client,
      })),
    };
  }

  async adminGetTicket(user: JwtPayload, id: string) {
    const ticket = await this.prisma.ticket.findFirst({
      where: { id, tenantId: user.tenantId },
      include: {
        comments: { orderBy: { createdAt: 'asc' } },
        department: true,
        client: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
    });
    if (!ticket) {
      throw new NotFoundException({
        status: 'error',
        message: 'Ticket not found',
      });
    }
    return {
      status: 'success',
      data: { ...this.mapTicket(ticket), client: ticket.client },
    };
  }

  async adminPatchTicket(
    user: JwtPayload,
    id: string,
    dto: AdminPatchTicketDto,
  ) {
    const ticket = await this.prisma.ticket.findFirst({
      where: { id, tenantId: user.tenantId },
    });
    if (!ticket) {
      throw new NotFoundException({
        status: 'error',
        message: 'Ticket not found',
      });
    }

    const updated = await this.prisma.ticket.update({
      where: { id },
      data: {
        ...(dto.status != null
          ? { status: normalizeTicketStatus(dto.status) }
          : {}),
        ...(dto.departmentId != null
          ? { departmentId: dto.departmentId || null }
          : {}),
        ...(dto.assignedStaffId != null
          ? { assignedStaffId: dto.assignedStaffId }
          : {}),
      },
      include: {
        comments: { orderBy: { createdAt: 'asc' } },
        department: true,
        client: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
    });

    return {
      status: 'success',
      data: { ...this.mapTicket(updated), client: updated.client },
    };
  }

  async adminAddComment(
    user: JwtPayload,
    id: string,
    dto: AdminTicketCommentDto,
  ) {
    const text = String(dto.text || '').trim();
    if (!text) {
      throw new BadRequestException({
        status: 'error',
        message: 'text is required',
      });
    }
    const ticket = await this.prisma.ticket.findFirst({
      where: { id, tenantId: user.tenantId },
    });
    if (!ticket) {
      throw new NotFoundException({
        status: 'error',
        message: 'Ticket not found',
      });
    }

    await this.prisma.ticketComment.create({
      data: {
        tenantId: user.tenantId,
        ticketId: id,
        authorType: 'staff',
        authorId: user.sub,
        text,
      },
    });

    await this.prisma.ticket.update({
      where: { id },
      data: {
        updatedAt: new Date(),
        status:
          ticket.status === 'Closed'
            ? 'Closed'
            : ticket.status === 'New'
              ? 'Open'
              : ticket.status,
        assignedStaffId: ticket.assignedStaffId || user.sub,
      },
    });

    return this.adminGetTicket(user, id);
  }

  // ─── Meetings (Client) ───────────────────────────────────

  async createMeeting(user: JwtPayload, dto: CreateMeetingDto) {
    const title = String(dto.title || '').trim();
    const description = String(dto.description || '').trim();
    if (!title || !description || !dto.date) {
      throw new BadRequestException({
        status: 'error',
        message: 'title, description, and date are required',
      });
    }
    const date = new Date(dto.date);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException({
        status: 'error',
        message: 'Invalid date',
      });
    }

    const meetingPeriod =
      dto.meetingPeriod === 60 ? 60 : dto.meetingPeriod === 30 ? 30 : 30;
    const importance = dto.importance === 'urgent' ? 'urgent' : 'normal';

    const row = await this.prisma.meeting.create({
      data: {
        tenantId: user.tenantId,
        clientId: user.sub,
        title,
        description,
        date,
        meetingPeriod,
        importance,
        status: 'scheduled',
        isUserConfirmed: dto.isUserConfirmed !== false,
      },
    });

    return { status: 'success', data: this.mapMeeting(row) };
  }

  async listMeetingsForClient(user: JwtPayload) {
    const rows = await this.prisma.meeting.findMany({
      where: { tenantId: user.tenantId, clientId: user.sub },
      orderBy: { createdAt: 'desc' },
    });
    return { status: 'success', data: rows.map((m) => this.mapMeeting(m)) };
  }

  async patchMeetingForClient(
    user: JwtPayload,
    id: string,
    dto: PatchMeetingDto,
  ) {
    const meeting = await this.prisma.meeting.findFirst({
      where: { id, tenantId: user.tenantId, clientId: user.sub },
    });
    if (!meeting) {
      throw new NotFoundException({
        status: 'error',
        message: 'Meeting not found',
      });
    }

    let date: Date | undefined;
    if (dto.date != null) {
      date = new Date(dto.date);
      if (Number.isNaN(date.getTime())) {
        throw new BadRequestException({
          status: 'error',
          message: 'Invalid date',
        });
      }
    }

    const status =
      dto.status != null ? normalizeMeetingStatus(dto.status) : undefined;

    const updated = await this.prisma.meeting.update({
      where: { id },
      data: {
        ...(dto.title != null ? { title: dto.title.trim() } : {}),
        ...(dto.description != null
          ? { description: dto.description.trim() }
          : {}),
        ...(date ? { date } : {}),
        ...(dto.meetingPeriod != null
          ? { meetingPeriod: dto.meetingPeriod === 60 ? 60 : 30 }
          : {}),
        ...(dto.importance != null ? { importance: dto.importance } : {}),
        ...(status ? { status } : {}),
        ...(dto.isUserConfirmed != null
          ? { isUserConfirmed: dto.isUserConfirmed }
          : {}),
      },
    });

    return { status: 'success', data: this.mapMeeting(updated) };
  }

  async deleteMeetingForClient(user: JwtPayload, id: string) {
    return this.patchMeetingForClient(user, id, { status: 'canceled' });
  }

  async timeSlots(user: JwtPayload, dateRaw: string, durationRaw: string) {
    const duration = Number(durationRaw) === 60 ? 60 : 30;
    // Accept 2024-1-26 or 2024-01-26
    const parts = String(dateRaw || '')
      .trim()
      .split('-')
      .map((p) => parseInt(p, 10));
    if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) {
      throw new BadRequestException({
        status: 'error',
        message: 'Invalid date',
      });
    }
    const [y, m, d] = parts;
    const dayStart = new Date(Date.UTC(y, m - 1, d, 0, 0, 0));
    const dayEnd = new Date(Date.UTC(y, m - 1, d, 23, 59, 59));

    const busy = await this.prisma.meeting.findMany({
      where: {
        tenantId: user.tenantId,
        date: { gte: dayStart, lte: dayEnd },
        status: { notIn: ['canceled'] },
      },
      select: { date: true, meetingPeriod: true },
    });

    const busyRanges = busy.map((b) => {
      const start =
        b.date.getUTCHours() * 60 +
        b.date.getUTCMinutes();
      return { start, end: start + (b.meetingPeriod || 30) };
    });

    // Portal expects 30-min rows; UI pairs them for 60-min duration.
    const step = 30;
    const data: Array<{ key: string; value: string; isDisabled: boolean }> = [];
    for (let start = 0; start + step <= 24 * 60; start += step) {
      const end = start + step;
      const value =
        end >= 24 * 60
          ? `${minutesToLabel(start)} - 24:00`
          : `${minutesToLabel(start)} - ${minutesToLabel(end)}`;

      const slotEnd = duration === 60 ? start + 60 : end;
      const overlaps = busyRanges.some(
        (r) => start < r.end && slotEnd > r.start,
      );
      const disabled =
        overlaps || (duration === 60 && start > 21 * 60) || slotEnd > 24 * 60;

      data.push({ key: value, value, isDisabled: disabled });
    }

    return { status: 'success', data };
  }

  // ─── Meetings (Admin) ────────────────────────────────────

  async adminListMeetings(user: JwtPayload, status?: string) {
    const rows = await this.prisma.meeting.findMany({
      where: {
        tenantId: user.tenantId,
        ...(status ? { status: normalizeMeetingStatus(status) } : {}),
      },
      orderBy: { date: 'desc' },
      take: 200,
      include: {
        client: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
    });
    return {
      status: 'success',
      data: rows.map((m) => ({ ...this.mapMeeting(m), client: m.client })),
    };
  }

  async adminPatchMeeting(
    user: JwtPayload,
    id: string,
    dto: AdminPatchMeetingDto,
  ) {
    const meeting = await this.prisma.meeting.findFirst({
      where: { id, tenantId: user.tenantId },
    });
    if (!meeting) {
      throw new NotFoundException({
        status: 'error',
        message: 'Meeting not found',
      });
    }

    let date: Date | undefined;
    if (dto.date != null) {
      date = new Date(dto.date);
      if (Number.isNaN(date.getTime())) {
        throw new BadRequestException({
          status: 'error',
          message: 'Invalid date',
        });
      }
    }

    const updated = await this.prisma.meeting.update({
      where: { id },
      data: {
        ...(dto.status != null
          ? { status: normalizeMeetingStatus(dto.status) }
          : {}),
        ...(date ? { date } : {}),
        ...(dto.title != null ? { title: dto.title.trim() } : {}),
        ...(dto.description != null
          ? { description: dto.description.trim() }
          : {}),
        ...(dto.meetingPeriod != null
          ? { meetingPeriod: dto.meetingPeriod === 60 ? 60 : 30 }
          : {}),
        ...(dto.assignedStaffId != null
          ? { assignedStaffId: dto.assignedStaffId }
          : {}),
      },
      include: {
        client: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
    });

    return {
      status: 'success',
      data: { ...this.mapMeeting(updated), client: updated.client },
    };
  }

  // ─── Mappers ─────────────────────────────────────────────

  private mapTicket(t: {
    id: string;
    category: string;
    title: string;
    status: string;
    departmentId: string | null;
    createdAt: Date;
    updatedAt: Date;
    clientId: string;
    department?: { id: string; name: string } | null;
    comments?: Array<{
      id: string;
      text: string;
      authorId: string;
      authorType: string;
      createdAt: Date;
    }>;
  }) {
    const comments = (t.comments || []).map((c) => ({
      id: c.id,
      text: c.text,
      userId: c.authorId,
      userTicketId: t.id,
      authorType: c.authorType,
      createdAt: c.createdAt,
    }));

    return {
      id: t.id,
      userTicketId: t.id,
      ticketId: t.id,
      category: t.category,
      title: t.title,
      status: t.status,
      departmentId: t.departmentId,
      departmentName: t.department?.name || null,
      department: t.department
        ? { id: t.department.id, name: t.department.name }
        : null,
      userId: t.clientId,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
      userTicketComments: comments,
    };
  }

  private mapMeeting(m: {
    id: string;
    title: string;
    description: string;
    date: Date;
    meetingPeriod: number;
    importance: string;
    status: string;
    isUserConfirmed: boolean;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: m.id,
      title: m.title,
      description: m.description,
      date: m.date,
      meetingPeriod: m.meetingPeriod,
      importance: m.importance,
      status: m.status,
      isUserConfirmed: m.isUserConfirmed,
      createdAt: m.createdAt,
      updatedAt: m.updatedAt,
    };
  }
}

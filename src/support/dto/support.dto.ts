import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateTicketCommentItemDto {
  @IsString()
  @MaxLength(10000)
  text!: string;

  @IsOptional()
  @IsString()
  userId?: string;
}

export class CreateTicketDto {
  @IsString()
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  departmentId?: string;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateTicketCommentItemDto)
  userTicketComments?: CreateTicketCommentItemDto[];

  /** Portal convenience fields (PHP maps initialMessage → comment) */
  @IsOptional()
  @IsString()
  initialMessage?: string;

  @IsOptional()
  @IsString()
  text?: string;
}

export class PatchTicketDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  departmentId?: string;
}

export class CreateTicketCommentDto {
  @IsString()
  @MaxLength(10000)
  text!: string;

  @IsString()
  userTicketId!: string;

  @IsOptional()
  @IsString()
  userId?: string;
}

export class CreateMeetingDto {
  @IsString()
  @MaxLength(200)
  title!: string;

  @IsString()
  @MaxLength(5000)
  description!: string;

  @IsString()
  date!: string;

  @IsOptional()
  @IsInt()
  @Min(15)
  @Type(() => Number)
  meetingPeriod?: number;

  @IsOptional()
  @IsIn(['normal', 'urgent'])
  importance?: 'normal' | 'urgent';

  @IsOptional()
  @IsBoolean()
  isUserConfirmed?: boolean;
}

export class PatchMeetingDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  date?: string;

  @IsOptional()
  @IsInt()
  @Min(15)
  @Type(() => Number)
  meetingPeriod?: number;

  @IsOptional()
  @IsIn(['normal', 'urgent'])
  importance?: 'normal' | 'urgent';

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsBoolean()
  isUserConfirmed?: boolean;
}

export class AdminPatchTicketDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  departmentId?: string;

  @IsOptional()
  @IsUUID()
  assignedStaffId?: string;
}

export class AdminTicketCommentDto {
  @IsString()
  @MaxLength(10000)
  text!: string;
}

export class CreateDepartmentDto {
  @IsString()
  @MaxLength(100)
  name!: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  sortOrder?: number;
}

export class PatchDepartmentDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  sortOrder?: number;
}

export class AdminPatchMeetingDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  date?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  meetingPeriod?: number;

  @IsOptional()
  @IsUUID()
  assignedStaffId?: string;
}

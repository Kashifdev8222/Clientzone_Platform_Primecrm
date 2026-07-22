import { Type, Transform } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
  IsNumber,
  IsUUID,
} from 'class-validator';

/** PrimeCRM-compatible account row inside register body */
export class RegisterAccountDto {
  @IsOptional()
  @IsString()
  groupName?: string;

  @IsOptional()
  @IsNumber()
  leverage?: number;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  isDemoAccount?: boolean;
}

export class RegisterTagDto {
  @IsOptional()
  @IsString()
  id?: string;
}

export class RegisterNoteDto {
  @IsOptional()
  @IsString()
  text?: string;
}

/**
 * Accepts the same body shape as PrimeCRM:
 * POST /api/v1/clientzone/leads
 *
 * Also accepts portal shorthand: { fullName, email, phone, password }
 */
export class RegisterLeadDto {
  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsString()
  phone!: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  customFields?: string | Record<string, unknown>;

  @IsOptional()
  @IsString()
  username?: string;

  /** Accept PrimeCRM-ish dates, including odd formats */
  @IsOptional()
  @IsString()
  birthDate?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RegisterAccountDto)
  accounts?: RegisterAccountDto[];

  @IsOptional()
  @IsUUID()
  brandId?: string;

  @IsOptional()
  @IsUUID()
  businessUnitId?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  isDemoAccount?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RegisterTagDto)
  tags?: RegisterTagDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RegisterNoteDto)
  notes?: RegisterNoteDto[];

  @IsOptional()
  @IsString()
  tenantSlug?: string;
}

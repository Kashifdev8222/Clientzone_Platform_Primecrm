import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class CreateWithdrawDto {
  @IsUUID()
  accountId!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  comment?: string;

  @IsOptional()
  @IsUUID()
  transactionSourceId?: string;

  @IsOptional()
  @IsString()
  tpNumber?: string;
}

export class CancelWithdrawDto {
  @IsOptional()
  @IsUUID()
  transactionId?: string;

  @IsOptional()
  @IsUUID()
  id?: string;

  @IsOptional()
  @IsString()
  status?: string;
}

export class CreateSourceDto {
  @IsOptional()
  @IsString()
  type?: string;

  @IsString()
  @IsNotEmpty()
  value!: string;

  @IsOptional()
  @IsString()
  source?: string;

  @IsObject()
  extraData!: Record<string, unknown>;
}

export class EditSourceDto {
  @IsOptional()
  @IsString()
  type?: string;

  @IsString()
  @IsNotEmpty()
  value!: string;

  @IsOptional()
  @IsString()
  source?: string;

  @IsObject()
  extraData!: Record<string, unknown>;
}

export class AdminWithdrawStatusDto {
  /** COMPLETED | FAILED | CANCELED | PROCESSING | PENDING | REJECTED | APPROVED */
  @IsString()
  status!: string;

  @IsOptional()
  @IsString()
  note?: string;
}

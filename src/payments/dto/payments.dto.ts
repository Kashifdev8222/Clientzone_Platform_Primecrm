import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class CreateCryptoPayDto {
  @IsUUID()
  accountId!: string;

  @IsString()
  @IsNotEmpty()
  payCurrency!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsOptional()
  @IsString()
  priceCurrency?: string;

  @IsOptional()
  @IsString()
  network?: string;
}

export class CreateLemuxionPayDto {
  @IsUUID()
  accountId!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsString()
  @IsNotEmpty()
  currency!: string;

  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsString()
  @IsNotEmpty()
  street!: string;

  @IsString()
  @IsNotEmpty()
  city!: string;

  @IsString()
  @IsNotEmpty()
  zip!: string;

  @IsString()
  @IsNotEmpty()
  state!: string;

  @IsString()
  @IsNotEmpty()
  country!: string;
}

export class AdminDepositStatusDto {
  /** COMPLETED | FAILED | CANCELED | PROCESSING | PENDING | REJECTED | APPROVED */
  @IsString()
  status!: string;

  /** Rejection / admin note shown as Comment + Rejection Reason in portal */
  @IsOptional()
  @IsString()
  note?: string;
}

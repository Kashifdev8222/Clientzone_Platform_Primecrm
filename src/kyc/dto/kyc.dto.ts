import { IsIn, IsOptional, IsString } from 'class-validator';

export class AdminKycReviewDto {
  @IsString()
  @IsIn(['APPROVED', 'REJECTED', 'PENDING'])
  status!: 'APPROVED' | 'REJECTED' | 'PENDING';

  @IsOptional()
  @IsString()
  reviewNote?: string;
}

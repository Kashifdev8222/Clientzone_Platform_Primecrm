import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class ForgotPasswordDto {
  @IsEmail()
  email!: string;
}

export class ResetPasswordDto {
  @IsString()
  @MinLength(10)
  token!: string;

  /** Our field */
  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

  /** Portal / PrimeCRM field */
  @IsOptional()
  @IsString()
  @MinLength(6)
  newPassword?: string;
}

export class ChangePasswordDto {
  /** Nest / Postman field */
  @IsOptional()
  @IsString()
  @MinLength(1)
  currentPassword?: string;

  /** ClientZone portal sends current password as `password` */
  @IsOptional()
  @IsString()
  @MinLength(1)
  password?: string;

  @IsString()
  @MinLength(6)
  newPassword!: string;
}

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
  @IsString()
  @MinLength(1)
  currentPassword!: string;

  @IsString()
  @MinLength(6)
  newPassword!: string;
}

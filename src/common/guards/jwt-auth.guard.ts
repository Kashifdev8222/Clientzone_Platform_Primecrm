import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

export type JwtPayload = {
  sub: string;
  email: string;
  tenantId: string;
  type: 'client';
};

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedException({
        status: 'error',
        message: 'Not authenticated',
      });
    }
    const token = header.slice(7);
    try {
      const payload = this.jwt.verify<JwtPayload>(token, {
        secret: this.config.getOrThrow<string>('JWT_SECRET'),
      });
      (req as Request & { user: JwtPayload }).user = payload;
      return true;
    } catch {
      throw new UnauthorizedException({
        status: 'error',
        message: 'Invalid or expired token',
      });
    }
  }
}

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import type { JwtPayload, JwtUserType } from '../types/jwt-payload';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly expectedType: JwtUserType = 'client',
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
      if (payload.type !== this.expectedType) {
        throw new UnauthorizedException({
          status: 'error',
          message: 'Invalid token type for this API',
        });
      }
      (req as Request & { user: JwtPayload }).user = payload;
      return true;
    } catch (e) {
      if (e instanceof UnauthorizedException) throw e;
      throw new UnauthorizedException({
        status: 'error',
        message: 'Invalid or expired token',
      });
    }
  }
}

@Injectable()
export class ClientJwtGuard extends JwtAuthGuard {
  constructor(jwt: JwtService, config: ConfigService) {
    super(jwt, config, 'client');
  }
}

@Injectable()
export class StaffJwtGuard extends JwtAuthGuard {
  constructor(jwt: JwtService, config: ConfigService) {
    super(jwt, config, 'staff');
  }
}

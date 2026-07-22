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

function verifyBearer(
  req: Request,
  jwt: JwtService,
  config: ConfigService,
  expectedType: JwtUserType,
): JwtPayload {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    throw new UnauthorizedException({
      status: 'error',
      message: 'Not authenticated',
    });
  }
  const token = header.slice(7);
  try {
    const payload = jwt.verify<JwtPayload>(token, {
      secret: config.getOrThrow<string>('JWT_SECRET'),
    });
    if (payload.type !== expectedType) {
      throw new UnauthorizedException({
        status: 'error',
        message: 'Invalid token type for this API',
      });
    }
    return payload;
  } catch (e) {
    if (e instanceof UnauthorizedException) throw e;
    throw new UnauthorizedException({
      status: 'error',
      message: 'Invalid or expired token',
    });
  }
}

@Injectable()
export class ClientJwtGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const payload = verifyBearer(req, this.jwt, this.config, 'client');
    (req as Request & { user: JwtPayload }).user = payload;
    return true;
  }
}

@Injectable()
export class StaffJwtGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const payload = verifyBearer(req, this.jwt, this.config, 'staff');
    (req as Request & { user: JwtPayload }).user = payload;
    return true;
  }
}

export type JwtUserType = 'client' | 'staff';

export type JwtPayload = {
  sub: string;
  email: string;
  tenantId: string;
  type: JwtUserType;
  role?: string;
};

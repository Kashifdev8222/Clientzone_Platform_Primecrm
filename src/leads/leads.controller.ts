import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { RegisterLeadDto } from '../auth/dto/register-lead.dto';

@Controller('api/v1/clientzone')
export class LeadsController {
  constructor(private readonly auth: AuthService) {}

  @Post('leads')
  register(@Body() dto: RegisterLeadDto) {
    return this.auth.register(dto);
  }
}

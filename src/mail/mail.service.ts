import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly config: ConfigService) {}

  isConfigured(): boolean {
    return Boolean(this.config.get<string>('RESEND_API_KEY')?.trim());
  }

  async sendPasswordResetEmail(params: {
    to: string;
    firstName?: string;
    resetToken: string;
  }): Promise<{ sent: boolean; error?: string }> {
    const apiKey = this.config.get<string>('RESEND_API_KEY')?.trim();
    if (!apiKey) {
      this.logger.warn(
        'RESEND_API_KEY not set — password reset email was NOT sent',
      );
      return { sent: false, error: 'RESEND_API_KEY not configured' };
    }

    const from =
      this.config.get<string>('MAIL_FROM')?.trim() ||
      'TradeScope AI <onboarding@resend.dev>';

    const resetBase =
      this.config.get<string>('CLIENTZONE_RESET_URL')?.trim() ||
      'https://clientzone-platform-primecrm.onrender.com/reset';

    const resetUrl = `${resetBase}?token=${encodeURIComponent(params.resetToken)}`;
    const name = params.firstName || 'there';

    const subject = 'Reset your password';
    const html = `
      <p>Hi ${name},</p>
      <p>We received a request to reset your password.</p>
      <p><a href="${resetUrl}">Click here to reset your password</a></p>
      <p>Or use this token:</p>
      <p><code>${params.resetToken}</code></p>
      <p>This link expires in 1 hour. If you did not request this, ignore this email.</p>
    `;

    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from,
          to: [params.to],
          subject,
          html,
        }),
      });

      if (!res.ok) {
        const body = await res.text();
        this.logger.error(`Resend failed: ${res.status} ${body}`);
        // Surface Resend message (helps debug 403 domain/to restrictions)
        let detail = body;
        try {
          const parsed = JSON.parse(body) as { message?: string };
          if (parsed?.message) detail = parsed.message;
        } catch {
          /* keep raw */
        }
        return { sent: false, error: `Resend ${res.status}: ${detail}` };
      }

      this.logger.log(`Password reset email sent to ${params.to}`);
      return { sent: true };
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'send failed';
      this.logger.error(`Resend error: ${msg}`);
      return { sent: false, error: msg };
    }
  }
}

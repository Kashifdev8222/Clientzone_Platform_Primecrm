import { Controller, Get, Param, Res } from '@nestjs/common';
import type { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Demo/testing only — fake PSP checkout pages for mock deposits.
 * Real CryptoPay/Lemuxion will use their own hosted URLs later.
 */
@Controller()
export class MockPayController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('mock-pay/:ref')
  async cryptoPay(@Param('ref') ref: string, @Res() res: Response) {
    const html = await this.renderPage({
      ref,
      title: 'Mock CryptoPay',
      provider: 'CryptoPay',
    });
    res.type('html').send(html);
  }

  @Get('mock-lemuxion/:ref')
  async lemuxion(@Param('ref') ref: string, @Res() res: Response) {
    const html = await this.renderPage({
      ref,
      title: 'Mock Lemuxion Pay',
      provider: 'LemuxionPay',
    });
    res.type('html').send(html);
  }

  private async renderPage(opts: {
    ref: string;
    title: string;
    provider: string;
  }) {
    const tx = await this.prisma.transaction.findFirst({
      where: { externalRef: opts.ref },
    });

    if (!tx) {
      return `<!doctype html><html><body style="font-family:sans-serif;padding:2rem">
        <h1>${opts.title}</h1>
        <p>No deposit found for <code>${opts.ref}</code>.</p>
      </body></html>`;
    }

    const amount = Number(tx.amount);
    const address = tx.invoiceAddress || '—';
    const status = tx.status;

    return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${opts.title}</title>
  <style>
    body { font-family: system-ui, sans-serif; background:#0f172a; color:#e2e8f0; margin:0; padding:2rem; }
    .card { max-width:520px; margin:0 auto; background:#1e293b; border-radius:12px; padding:1.5rem; }
    h1 { margin-top:0; font-size:1.25rem; }
    .row { margin:0.75rem 0; }
    code { background:#0f172a; padding:0.2rem 0.4rem; border-radius:4px; word-break:break-all; }
    .ok { color:#4ade80; }
    .warn { color:#fbbf24; }
    .hint { opacity:0.85; font-size:0.9rem; line-height:1.45; }
  </style>
</head>
<body>
  <div class="card">
    <h1>${opts.title} (DEMO)</h1>
    <p class="hint">This is a <strong>mock</strong> checkout for testing. Real ${opts.provider} is not connected yet.</p>
    <div class="row"><strong>Reference:</strong> <code>${opts.ref}</code></div>
    <div class="row"><strong>Amount:</strong> ${amount} ${tx.currency}</div>
    <div class="row"><strong>Method:</strong> ${tx.paymentMethod || opts.provider}</div>
    ${
      tx.payCurrency
        ? `<div class="row"><strong>Pay currency:</strong> ${tx.payCurrency}</div>`
        : ''
    }
    ${
      address !== '—'
        ? `<div class="row"><strong>Address:</strong> <code>${address}</code></div>`
        : ''
    }
    <div class="row"><strong>Status:</strong> <span class="${status === 'COMPLETED' ? 'ok' : 'warn'}">${status}</span></div>
    <hr style="border-color:#334155;margin:1.25rem 0" />
    <p class="hint">
      To complete this deposit in testing:<br/>
      1) Open <strong>CRM — Admin</strong> Postman collection<br/>
      2) Staff login → List pending deposits<br/>
      3) Mark this deposit <strong>COMPLETED</strong><br/>
      4) Client accounts balance will increase
    </p>
    <p class="hint">Transaction id: <code>${tx.id}</code></p>
  </div>
</body>
</html>`;
  }
}

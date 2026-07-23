/** Map DB transaction fields to ClientZone / PrimeCRM-style portal labels. */

export type DbTxStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELED';

export function portalStatus(status: string): string {
  const s = String(status || '').toUpperCase();
  if (s === 'COMPLETED') return 'Completed';
  if (s === 'PENDING' || s === 'PROCESSING') return 'Pending';
  if (s === 'FAILED') return 'Rejected';
  if (s === 'CANCELED' || s === 'CANCELLED') return 'Canceled';
  return status || 'Pending';
}

export function portalType(type: string): string {
  const t = String(type || '').toUpperCase();
  if (t === 'DEPOSIT') return 'Deposit';
  if (t === 'WITHDRAW') return 'Withdraw';
  if (t === 'ADJUSTMENT') return 'Creditin';
  return type || '—';
}

export function portalComment(row: {
  comment?: string | null;
  note?: string | null;
  paymentMethod?: string | null;
  payCurrency?: string | null;
  status?: string;
}): string {
  const c = String(row.comment || '').trim();
  if (c) return c;
  // Do not fall back to note when rejected — note is rejection reason
  const st = String(row.status || '').toUpperCase();
  if (st === 'FAILED' || st === 'REJECTED') {
    if (row.paymentMethod && row.payCurrency) {
      return `${row.paymentMethod} ${row.payCurrency}`;
    }
    return row.paymentMethod ? String(row.paymentMethod) : '';
  }
  // Prefer payment method over note for deposits (note may be legacy copy)
  if (row.paymentMethod && row.payCurrency) {
    return `${row.paymentMethod} ${row.payCurrency}`;
  }
  if (row.paymentMethod) return String(row.paymentMethod);
  const n = String(row.note || '').trim();
  if (n) return n;
  return '';
}

/** Rejection reason only when rejected — uses `note` (never the deposit/withdraw comment). */
export function portalRejectReason(row: {
  status: string;
  note?: string | null;
  comment?: string | null;
}): string {
  const s = String(row.status || '').toUpperCase();
  if (s !== 'FAILED' && s !== 'REJECTED') return '';
  const note = String(row.note || '').trim();
  const comment = String(row.comment || '').trim();
  // Ignore legacy rows where note was a copy of the comment
  if (!note || (comment && note === comment)) return '';
  return note;
}

export function mapPortalTransaction(t: {
  id: string;
  accountId: string;
  type: string;
  status: string;
  amount: { toString(): string } | number;
  currency: string;
  paymentMethod?: string | null;
  externalRef?: string | null;
  note?: string | null;
  comment?: string | null;
  payCurrency?: string | null;
  tpNumber?: string | null;
  createdAt: Date;
  updatedAt: Date;
  account?: { id: string; externalLogin: string | null; name: string } | null;
}) {
  const tp = t.account?.externalLogin || t.tpNumber || t.accountId;
  const status = portalStatus(t.status);
  const comment = portalComment(t);
  const rejectReason = portalRejectReason(t);

  return {
    id: t.id,
    accountId: t.accountId,
    tpNumber: tp,
    accountNumber: tp,
    type: portalType(t.type),
    status,
    amount: Number(t.amount),
    currency: t.currency,
    paymentMethod: t.paymentMethod,
    externalRef: t.externalRef,
    note: t.note,
    comment: comment || '—',
    rejectReason: rejectReason || null,
    rejectionReason: rejectReason || null,
    rejectType: rejectReason ? 'Admin' : null,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
    account: t.account
      ? {
          id: t.account.id,
          tpNumber: t.account.externalLogin || t.account.id,
          name: t.account.name,
        }
      : null,
  };
}

/** Normalize admin UI status aliases into Prisma enum. */
export function normalizeAdminStatus(raw: string): DbTxStatus | null {
  const s = String(raw || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '_');
  if (s === 'COMPLETED' || s === 'APPROVED' || s === 'VERIFIED') return 'COMPLETED';
  if (s === 'PENDING') return 'PENDING';
  if (s === 'PROCESSING') return 'PROCESSING';
  if (s === 'FAILED' || s === 'REJECTED') return 'FAILED';
  if (s === 'CANCELED' || s === 'CANCELLED') return 'CANCELED';
  return null;
}

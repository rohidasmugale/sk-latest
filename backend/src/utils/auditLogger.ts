import AuditLog from '../models/AuditLog';

export interface LogAuditParams {
  action: string;
  entity: string;
  entityId?: string;
  month?: string;
  employeeId?: string;
  employeeName?: string;
  performedBy: string;
  description: string;
  before?: any;
  after?: any;
  metadata?: any;
}

// Fields we never want to store in the audit trail
const REDACTED_FIELDS = new Set([
  'password', 'passwordHash', 'token', 'refreshToken',
  'accountNumber', 'ifscCode', 'aadharNumber', 'panNumber',
]);

const sanitize = (obj: any): any => {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sanitize);
  const out: any = {};
  for (const [k, v] of Object.entries(obj)) {
    if (REDACTED_FIELDS.has(k)) out[k] = '[REDACTED]';
    else if (v && typeof v === 'object') out[k] = sanitize(v);
    else out[k] = v;
  }
  return out;
};

export const logAudit = async (params: LogAuditParams): Promise<void> => {
  try {
    await AuditLog.create({
      action: params.action,
      entity: params.entity,
      entityId: params.entityId,
      month: params.month,
      employeeId: params.employeeId,
      employeeName: params.employeeName,
      performedBy: params.performedBy || 'system',
      performedAt: new Date(),
      description: params.description,
      before: params.before ? sanitize(params.before) : undefined,
      after: params.after ? sanitize(params.after) : undefined,
      metadata: params.metadata ? sanitize(params.metadata) : undefined,
    });
  } catch (err) {
    // Never crash the caller because audit logging failed
    console.error('[AuditLog] failed to write entry:', err);
  }
};

// Convenience: pick user from request
export const getUserFromReq = (req: any): string =>
  req?.user?.email || req?.user?.id || 'system';
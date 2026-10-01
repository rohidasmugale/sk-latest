import { Request, Response } from 'express';
import AuditLog from '../models/AuditLog';

// ─── LIST AUDIT LOGS (with filters + pagination) ────────────────────
export const getAuditLogs = async (req: Request, res: Response) => {
  try {
    const {
      entity,
      action,
      performedBy,
      month,
      employeeId,
      search,
      startDate,
      endDate,
      page = '1',
      limit = '50',
    } = req.query as Record<string, string>;

    const filter: any = {};

    if (entity && entity !== 'all') filter.entity = entity;
    if (action && action !== 'all') filter.action = action;
    if (performedBy && performedBy !== 'all') filter.performedBy = performedBy;
    if (month) filter.month = month;
    if (employeeId) filter.employeeId = employeeId;

    if (startDate || endDate) {
      filter.performedAt = {};
      if (startDate) filter.performedAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.performedAt.$lte = end;
      }
    }

    if (search && search.trim()) {
      const re = new RegExp(search.trim(), 'i');
      filter.$or = [
        { description: re },
        { employeeName: re },
        { employeeId: re },
        { entityId: re },
      ];
    }

    const pageNum = Math.max(1, parseInt(page) || 1);
    const pageSize = Math.min(200, Math.max(1, parseInt(limit) || 50));
    const skip = (pageNum - 1) * pageSize;

    const [logs, total] = await Promise.all([
      AuditLog.find(filter).sort({ performedAt: -1 }).skip(skip).limit(pageSize),
      AuditLog.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: logs,
      pagination: {
        page: pageNum,
        limit: pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error: any) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── GET ONE ────────────────────────────────────────────────────────
export const getAuditLogById = async (req: Request, res: Response) => {
  try {
    const log = await AuditLog.findById(req.params.id);
    if (!log) return res.status(404).json({ success: false, message: 'Not found' });
    res.status(200).json({ success: true, data: log });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── STATS (counts for filter dropdowns) ────────────────────────────
export const getAuditStats = async (_req: Request, res: Response) => {
  try {
    const [entities, actions, users] = await Promise.all([
      AuditLog.distinct('entity'),
      AuditLog.distinct('action'),
      AuditLog.distinct('performedBy'),
    ]);
    res.status(200).json({
      success: true,
      data: { entities, actions, users },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
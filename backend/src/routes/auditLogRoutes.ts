import express from 'express';
import * as ctrl from '../controllers/auditLogController';

const router = express.Router();

router.get('/', ctrl.getAuditLogs);
router.get('/stats', ctrl.getAuditStats);
router.get('/:id', ctrl.getAuditLogById);

export default router;
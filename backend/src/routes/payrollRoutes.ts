// src/routes/payrollRoutes.ts
import express from 'express';
import * as payrollController from '../controllers/payrollController';

const router = express.Router();

// ✅ SPECIFIC routes MUST come before /:id (wildcard)
router.get('/', payrollController.getAllPayroll);
router.get('/summary', payrollController.getPayrollSummary);       // was being caught by /:id
router.get('/export', payrollController.exportPayroll);            // was being caught by /:id
router.get('/employee/:employeeId/month/:month', payrollController.getPayrollByEmployeeAndMonth);

router.post('/process', payrollController.processPayroll);
router.post('/bulk-process', payrollController.bulkProcessPayroll);
// ✅ Specific routes must come before /:id
router.get('/preview-deductions', payrollController.previewDeductions);   // 👈 ADD THIS
// ✅ Wildcard /:id routes LAST
router.get('/:id', payrollController.getPayrollById);
router.put('/:id/payment-status', payrollController.updatePaymentStatus);
router.delete('/:id', payrollController.deletePayroll);
router.patch('/:id/notes', payrollController.updatePayrollNotes);
router.post('/:id/adjust', payrollController.adjustPayroll);
router.delete('/:id/adjust/:adjustmentIndex', payrollController.removeAdjustment);
router.post('/bulk-delete', payrollController.bulkDeletePayroll);
router.post('/bulk-payment-status', payrollController.bulkUpdatePaymentStatus);
router.post('/bulk-generate-slips', payrollController.bulkGenerateSlips);
export default router;
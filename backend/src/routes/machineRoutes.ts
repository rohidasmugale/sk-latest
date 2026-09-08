import { Router } from 'express';
import { machineController } from '../controllers/machineController';
import { auth } from '../middleware/auth';

const router = Router();

// GET routes – order matters! /supervisor must come before /:id
router.get('/', machineController.getMachines.bind(machineController));
router.get('/stats', machineController.getMachineStats.bind(machineController));
router.get('/search', machineController.searchMachines.bind(machineController));
router.get('/pending-maintenance', machineController.getPendingMaintenanceRecords.bind(machineController));
// ✅ GET /supervisor – uses siteId from auth middleware
router.get('/supervisor', auth, machineController.getMachinesForSupervisor.bind(machineController)); 
router.get('/:id', machineController.getMachineById.bind(machineController));

// POST routes
router.post('/', machineController.createMachine.bind(machineController));
router.post('/:id/maintenance', machineController.addMaintenanceRecord.bind(machineController));
router.post('/:id/maintenance/:maintenanceIndex/approve', machineController.approveMaintenanceRecord.bind(machineController));
router.post('/:id/maintenance/:maintenanceIndex/reject', machineController.rejectMaintenanceRecord.bind(machineController));

// PUT routes
router.put('/:id', machineController.updateMachine.bind(machineController));

// DELETE routes
router.delete('/:id', machineController.deleteMachine.bind(machineController));

export default router;
import express from 'express';
import * as salaryStructureController from '../controllers/salaryStructureController';

const router = express.Router();

router.get('/', salaryStructureController.getAllSalaryStructures);
router.get('/summary', salaryStructureController.getSalaryStructureSummary);
router.get('/employees/without', salaryStructureController.getEmployeesWithoutStructure);
// ✅ Add this BEFORE any routes with /:id
router.post('/import', salaryStructureController.importSalaryStructures);
router.get('/:id', salaryStructureController.getSalaryStructureById);
router.get('/employee/:employeeId', salaryStructureController.getSalaryStructureByEmployeeId);
router.post('/', salaryStructureController.createSalaryStructure);
router.put('/:id', salaryStructureController.updateSalaryStructure);
router.delete('/:id', salaryStructureController.deleteSalaryStructure);
router.patch('/:id/deactivate', salaryStructureController.deactivateSalaryStructure);

export default router;
// routes/workQuery.routes.ts
import express from 'express';
import { workQueryController } from '../controllers/workQuery.controller';
import { workQueryUpload, handleFileUploadErrors } from '../middleware/workQueryMulter.middleware';

const router = express.Router();

// ==================== STATIC DATA ROUTES ====================
router.get('/categories', (req: express.Request, res: express.Response) => 
  workQueryController.getCategories(req, res)
);

router.get('/priorities', (req: express.Request, res: express.Response) => 
  workQueryController.getPriorities(req, res)
);

router.get('/statuses', (req: express.Request, res: express.Response) => 
  workQueryController.getStatuses(req, res)
);

router.get('/service-types', (req: express.Request, res: express.Response) => 
  workQueryController.getServiceTypes(req, res)
);

// ==================== STATISTICS ROUTES ====================
// Supervisor statistics
router.get('/statistics', (req: express.Request, res: express.Response) => 
  workQueryController.getStatistics(req, res)
);

// Superadmin statistics
router.get('/superadmin/statistics', (req: express.Request, res: express.Response) => 
  workQueryController.getSuperadminStatistics(req, res)
);

// ==================== RECENT QUERIES ====================
router.get('/recent', (req: express.Request, res: express.Response) => 
  workQueryController.getRecentWorkQueries(req, res)
);

// ==================== GET BY ID ROUTES ====================
// Get work query by queryId (e.g., /query/QUERY123456789)
router.get('/query/:queryId', (req: express.Request, res: express.Response) => 
  workQueryController.getWorkQueryByQueryId(req, res)
);

// Get work query by MongoDB ID
router.get('/:id', (req: express.Request, res: express.Response) => 
  workQueryController.getWorkQueryById(req, res)
);

// ==================== MAIN CRUD ROUTES ====================
// Get all work queries (for supervisor - requires supervisorId query param)
router.get('/', (req: express.Request, res: express.Response) => 
  workQueryController.getAllWorkQueries(req, res)
);

// Get all work queries for superadmin (all supervisors - no supervisorId required)
router.get('/superadmin/all', (req: express.Request, res: express.Response) => 
  workQueryController.getAllWorkQueriesForSuperadmin(req, res)
);

// Create work query with file upload to Cloudinary
router.post(
  '/', 
  workQueryUpload.array('images', 5),
  handleFileUploadErrors,
  (req: express.Request, res: express.Response) => 
    workQueryController.createWorkQuery(req, res)
);

// Update status (for supervisor)
router.patch('/:id/status', (req: express.Request, res: express.Response) => 
  workQueryController.updateWorkQueryStatus(req, res)
);

// Update work query response (for superadmin)
router.patch('/:id/superadmin-response', (req: express.Request, res: express.Response) => 
  workQueryController.updateWorkQueryResponse(req, res)
);

// Add comment to work query
router.post('/:id/comments', (req: express.Request, res: express.Response) => 
  workQueryController.addComment(req, res)
);

// Assign work query to staff
router.patch('/:id/assign', (req: express.Request, res: express.Response) => 
  workQueryController.assignQuery(req, res)
);

// Delete work query (also deletes images from Cloudinary)
router.delete('/:id', (req: express.Request, res: express.Response) => 
  workQueryController.deleteWorkQuery(req, res)
);

export default router;
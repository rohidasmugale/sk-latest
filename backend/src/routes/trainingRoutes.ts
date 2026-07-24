// routes/trainingRoutes.ts
import express from 'express';
import { authenticate } from '../middleware/auth';
import {
  getAllTrainings,
  getTrainingById,
  createTraining,
  updateTraining,
  updateTrainingStatus,
  addAttendee,
  addFeedback,
  deleteTraining,
  getTrainingStats
} from "../controllers/trainingController";

const router = express.Router();

router.use(authenticate);

// ✅ Remove duplicates - keep only one of each
router.get('/', getAllTrainings);
router.get('/stats', getTrainingStats);
router.get('/:id', getTrainingById);
router.post('/', createTraining);
router.put('/:id', updateTraining);
router.put('/:id/status', updateTrainingStatus);
router.post('/:id/attendees', addAttendee);
router.post('/:id/feedback', addFeedback);
router.delete('/:id', deleteTraining);

export default router;
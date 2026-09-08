import { Router, Request, Response } from 'express';
import { getTodayGrooming, batchSaveGrooming } from '../controllers/groomingController';
import { auth } from '../middleware/auth';
import mongoose from 'mongoose';
import Grooming from '../models/Grooming';

const router = Router();

router.use(auth);

router.get('/', auth, async (req: Request, res: Response) => {
  try {
    const { date, siteId } = req.query;

    if (!date || !siteId) {
      return res.status(400).json({
        success: false,
        message: 'Date and siteId are required'
      });
    }

    if (!mongoose.Types.ObjectId.isValid(siteId as string)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid siteId format'
      });
    }

    const records = await Grooming.find({
      siteId: siteId as string,
      date: date as string,
    });

    res.json({ success: true, data: records });
  } catch (error: any) {
    console.error('Error fetching grooming by site:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error'
    });
  }
});

router.get('/today', getTodayGrooming);
router.post('/batch', batchSaveGrooming);

export default router;
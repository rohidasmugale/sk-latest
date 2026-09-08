import { Router, Request, Response } from 'express';
import { auth } from '../middleware/auth';
import {
  getShifts,
  getShift,
  createShift,
  updateShift,
  deleteShift,
  assignEmployeeToShift,
  removeEmployeeFromShift,
  getShiftStats
} from '../controllers/shiftController';
import SiteShiftDeployment from '../models/SiteShiftDeployment';
import Site from '../models/Site'; // ✅ ADD THIS

const router = Router();

// ==================== Shift Deployment (site‑wide) ====================
// MUST be BEFORE any /:id routes

router.get('/site-deployment', auth, async (req: Request, res: Response) => {
  try {
    // ❌ CHANGE: Use siteId instead of site
    // const { site, date } = req.query;
    const { siteId, date } = req.query; // ✅ CHANGED
    
    if (!siteId || typeof siteId !== 'string') {
      return res.status(400).json({ success: false, message: 'Site ID required' });
    }
    if (!date || typeof date !== 'string') {
      return res.status(400).json({ success: false, message: 'Date required' });
    }
    
    // ✅ Find deployment by siteId
    const deployment = await SiteShiftDeployment.findOne({ siteId, date });
    
    // ✅ If no deployment, return empty text
    res.json({
      success: true,
      data: { text: deployment?.text || 'No shift deployment information available.' }
    });
  } catch (error) {
    console.error('Error fetching site deployment:', error);
    res.status(500).json({ success: false, message: String(error) });
  }
});

router.post('/site-deployment', auth, async (req: Request, res: Response) => {
  try {
    // ❌ CHANGE: Use siteId instead of site
    // const { site, date, text } = req.body;
    const { siteId, date, text } = req.body; // ✅ CHANGED
    
    if (!siteId) {
      return res.status(400).json({ success: false, message: 'Site ID required' });
    }
    
    // ✅ Validate site exists
    const site = await Site.findById(siteId);
    if (!site) {
      return res.status(400).json({ success: false, message: 'Invalid site' });
    }
    
    if (!date) {
      return res.status(400).json({ success: false, message: 'Date required' });
    }
    
    await SiteShiftDeployment.findOneAndUpdate(
      { siteId, date }, // ✅ Use siteId
      { 
        site: site.name, // ✅ Store site name for display
        siteId: site._id, // ✅ Store siteId
        text, 
        updatedAt: new Date() 
      },
      { upsert: true, new: true }
    );
    res.json({ success: true, message: 'Site shift deployment saved' });
  } catch (error) {
    console.error('Error saving site deployment:', error);
    res.status(500).json({ success: false, message: String(error) });
  }
});

// ==================== Shift Management (CRUD) ====================
// These come AFTER the specific routes

router.get('/', getShifts);
router.get('/stats', getShiftStats);
router.get('/:id', getShift);
router.post('/', createShift);
router.put('/:id', updateShift);
router.delete('/:id', deleteShift);
router.post('/:id/assign', assignEmployeeToShift);
router.post('/:id/remove', removeEmployeeFromShift);

export default router;
import express from 'express';
import { auth } from '../middleware/auth';
import {
  getAllSites,
  getSiteById,
  createSite,
  updateSite,
  deleteSite,
  toggleSiteStatus,
  getSiteStats,
  searchSites
} from '../controllers/siteController';

const router = express.Router();

// Site routes — auth required on every one
router.get('/', auth, getAllSites);
router.get('/search', auth, searchSites);
router.get('/stats', auth, getSiteStats);
router.get('/:id', auth, getSiteById);
router.post('/', auth, createSite);
router.put('/:id', auth, updateSite);
router.delete('/:id', auth, deleteSite);
router.patch('/:id/toggle-status', auth, toggleSiteStatus);

export default router;
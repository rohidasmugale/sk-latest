import express, { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { v2 as cloudinary } from 'cloudinary';
import CleaningPhoto from '../models/CleaningPhoto';
import { auth } from '../middleware/auth';
import mongoose from 'mongoose';
import Site from '../models/Site'; // ✅ ADD THIS

const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    if (ext && mime) cb(null, true);
    else cb(new Error('Only images are allowed'));
  }
});

// POST /api/cleaning-photos – upload a cleaning photo
router.post('/', auth, upload.single('photo'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const user = req.user;
    // ❌ CHANGE: Accept siteId instead of site
    // const { site, remark } = req.body;
    const { siteId, remark } = req.body; // ✅ CHANGED

    // ✅ Validate siteId exists
    if (!siteId) {
      return res.status(400).json({ success: false, message: 'Site ID is required' });
    }
    const site = await Site.findById(siteId);
    if (!site) {
      return res.status(400).json({ success: false, message: 'Invalid site' });
    }

    const result = await new Promise<any>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: 'cleaning-photos' },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      uploadStream.end(req.file!.buffer);
    });

    const photo = new CleaningPhoto({
      photoUrl: result.secure_url,
      cloudinaryPublicId: result.public_id,
      site: site.name, // ✅ Keep site name for display
      siteId: site._id, // ✅ ADD THIS
      remark,
      uploadedBy: user._id,
    });
    await photo.save();

    res.status(201).json({ success: true, data: photo });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Upload failed' });
  }
});

// GET /api/cleaning-photos?siteId=xxx – fetch photos by siteId
router.get('/', auth, async (req: Request, res: Response) => {
  try {
    // ❌ CHANGE: Use siteId instead of site
    // const { site } = req.query;
    const { siteId } = req.query; // ✅ CHANGED
    const filter: any = {};
    if (siteId && typeof siteId === 'string') {
      filter.siteId = siteId; // ✅ CHANGED
    }
    const photos = await CleaningPhoto.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, data: photos });
  } catch (error: any) {
    console.error('Error fetching cleaning photos:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/cleaning-photos/multiple – upload multiple cleaning photos
router.post('/multiple', auth, upload.array('photos', 10), async (req: Request, res: Response) => {
  try {
    const user = req.user;
    // ❌ CHANGE: Accept siteId instead of site
    // const { site, remark } = req.body;
    const { siteId, remark } = req.body; // ✅ CHANGED

    // ✅ Validate siteId exists
    if (!siteId) {
      return res.status(400).json({ success: false, message: 'Site ID is required' });
    }
    const site = await Site.findById(siteId);
    if (!site) {
      return res.status(400).json({ success: false, message: 'Invalid site' });
    }

    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ success: false, message: 'No files uploaded' });
    }

    const uploadedPhotos = [];
    for (const file of files) {
      const result = await new Promise<any>((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          { folder: 'cleaning-photos' },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        uploadStream.end(file.buffer);
      });

      const photo = new CleaningPhoto({
        photoUrl: result.secure_url,
        cloudinaryPublicId: result.public_id,
        site: site.name, // ✅ Keep site name for display
        siteId: site._id, // ✅ ADD THIS
        remark: remark || '',
        uploadedBy: user._id,
      });
      await photo.save();
      uploadedPhotos.push(photo);
    }

    res.status(201).json({ success: true, data: uploadedPhotos, count: uploadedPhotos.length });
  } catch (error) {
    console.error('Multiple upload error:', error);
    res.status(500).json({ success: false, message: 'Upload failed' });
  }
});

// GET /api/cleaning-photos/supervisor – fetch photos for logged-in supervisor
router.get('/supervisor', auth, async (req: Request, res: Response) => {
  try {
    let userId = req.user._id;
    if (typeof userId === 'string' && mongoose.Types.ObjectId.isValid(userId)) {
      userId = new mongoose.Types.ObjectId(userId);
    }
    const photos = await CleaningPhoto.find({ uploadedBy: userId }).sort({ createdAt: -1 });
    res.json({ success: true, data: photos });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to load photos' });
  }
});

export default router;
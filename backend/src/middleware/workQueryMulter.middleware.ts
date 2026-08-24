// middleware/workQueryUpload.ts
import multer from 'multer';
import { Request } from 'express';
import { validateWorkQueryFile, MAX_FILE_SIZE } from '../utils/WorkQueryCloudinaryUtils';

// Use memory storage for Cloudinary upload
const storage = multer.memoryStorage();

// Custom file filter
const workQueryFileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  if (validateWorkQueryFile(file.mimetype, file.originalname)) {
    cb(null, true);
  } else {
    cb(new Error(
      `File type ${file.mimetype} is not allowed. Allowed: Images (jpg, png, gif, webp, bmp)`
    ));
  }
};

// Configure multer
export const workQueryUpload = multer({
  storage: storage,
  fileFilter: workQueryFileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE, // 5MB per file
    files: 5 // Max 5 files
  }
});

/**
 * Handle file upload errors
 */
export const handleFileUploadErrors = (
  err: any,
  req: Request,
  res: any,
  next: any
) => {
  if (err instanceof multer.MulterError) {
    console.error('❌ Multer error:', err.code, err.message);
    
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: `File too large. Maximum file size is ${MAX_FILE_SIZE / (1024 * 1024)}MB.`
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files. Maximum 5 images allowed per query.'
      });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: 'Unexpected field. Please use "images" as the field name.'
      });
    }
  } else if (err) {
    console.error('❌ File upload error:', err.message);
    return res.status(400).json({
      success: false,
      message: err.message || 'File upload failed'
    });
  }
  next();
};